/** Optional room-scoped WebSocket signaling, direct encrypted WebRTC data channels.
 * Only explicit human actions transmit graph questions or source evidence.
 */
import {createHello,NET_SCHEMA,randomSecret,validRelayURL,validRoom,validateQuestion,verifyHello} from './net-protocol.mjs';
import {makeBundle,verifyBundle} from './kernel.mjs';

export class CollectiveMesh {
 constructor({ident,room,url,onEvent=()=>{},iceServers=[]}){
  if(!validRoom(room)||!validRelayURL(url))throw Error('Invalid room or relay address');
  this.ident=ident;this.room=room;this.url=url;this.onEvent=onEvent;this.iceServers=iceServers;
  this.socket=null;this.me=null;this.peers=new Map();this.inquiries=new Map();
 }
 emit(type,detail={}){this.onEvent({type,...detail});}
 snapshots(){return [...this.peers].map(([session,p])=>({session,connected:p.channel?.readyState==='open',issuer:p.issuer||null,approved:!!p.approved,identified:!!p.issuer}));}
 notify(){this.emit('peers',{peers:this.snapshots()});}
 async start(){
  if(this.socket)throw Error('Already connected');
  const ws=new WebSocket(this.url);this.socket=ws;
  ws.onopen=()=>ws.send(JSON.stringify({type:'join',room:this.room}));
  ws.onmessage=async e=>{try{await this.signal(JSON.parse(e.data));}catch(error){this.emit('error',{message:error.message});}};
  ws.onerror=()=>this.emit('error',{message:'Signaling relay connection failed'});
  ws.onclose=()=>{this.emit('relay-closed');this.closePeers();this.socket=null;};
  return this;
 }
 signalOut(message){if(this.socket?.readyState!==WebSocket.OPEN)throw Error('Signaling relay disconnected');this.socket.send(JSON.stringify(message));}
 addPeer(session){if(typeof session==='string'&&session!==this.me&&!this.peers.has(session))this.peers.set(session,{pc:null,channel:null,issuer:null,approved:false,ice:[]});}
 async signal(m){
  if(m.type==='welcome'){
   this.me=m.self;for(const session of m.peers)this.addPeer(session);
   this.emit('joined',{self:this.me,room:this.room});this.notify();return;
  }
  if(m.type==='arrived'){this.addPeer(m.peer);this.notify();return;}
  if(m.type==='departed'){this.drop(m.peer);return;}
  const remote=m.from;if(typeof remote!=='string'||remote===this.me)return;
  let p=this.peers.get(remote);if(!p){this.addPeer(remote);p=this.peers.get(remote);}
  if(m.type==='offer'){
   if(p.pc)p.pc.close();p.pc=null;p.channel=null;p.approved=false;p.issuer=null;
   this.makePeer(remote,false);await p.pc.setRemoteDescription(m.data);
   for(const ice of p.ice.splice(0))await p.pc.addIceCandidate(ice);
   const answer=await p.pc.createAnswer();await p.pc.setLocalDescription(answer);
   this.signalOut({type:'answer',to:remote,data:p.pc.localDescription.toJSON()});
  }else if(m.type==='answer'){
   if(!p.pc)return;await p.pc.setRemoteDescription(m.data);
   for(const ice of p.ice.splice(0))await p.pc.addIceCandidate(ice);
  }else if(m.type==='ice'){
   if(p.pc?.remoteDescription)await p.pc.addIceCandidate(m.data);else p.ice.push(m.data);
  }
 }
 makePeer(session,caller){
  const p=this.peers.get(session);if(!p)throw Error('Unknown peer');
  const pendingIce=p.ice;const pc=new RTCPeerConnection({iceServers:this.iceServers});p.pc=pc;p.ice=pendingIce;
  pc.onicecandidate=e=>{if(e.candidate)try{this.signalOut({type:'ice',to:session,data:e.candidate.toJSON()});}catch{}};
  pc.onconnectionstatechange=()=>{if(['failed','closed'].includes(pc.connectionState)){p.approved=false;this.notify();}};
  pc.ondatachannel=e=>this.attach(session,e.channel);
  if(caller)this.attach(session,pc.createDataChannel('tranch-witness',{ordered:true}));
  this.notify();return pc;
 }
 async connect(session){const p=this.peers.get(session);if(!p||!this.me)throw Error('Peer not available');if(p.pc)return;
  const pc=this.makePeer(session,true);const offer=await pc.createOffer();await pc.setLocalDescription(offer);
  this.signalOut({type:'offer',to:session,data:pc.localDescription.toJSON()});}
 attach(session,channel){
  const p=this.peers.get(session);p.channel=channel;p.issuer=null;p.approved=false;
  channel.onopen=async()=>{try{channel.send(JSON.stringify(await createHello(this.ident,this.room,this.me,session)));}catch(error){this.emit('error',{message:error.message});channel.close();}this.notify();};
  channel.onmessage=async e=>{try{await this.onWire(session,e.data);}catch(error){this.emit('error',{message:'Peer message rejected: '+error.message});}};
  channel.onerror=()=>this.emit('error',{message:'Peer channel error'});
  channel.onclose=()=>{p.approved=false;p.issuer=null;this.notify();};
 }
 async onWire(session,raw){
  if(typeof raw!=='string'||raw.length>70000)throw Error('Oversized peer packet');
  const p=this.peers.get(session);if(!p)return;
  const m=JSON.parse(raw);if(!m||m.schema!==NET_SCHEMA)throw Error('Unknown message schema');
  if(m.kind==='hello'){
   const result=await verifyHello(m,this.room,session,this.me);
   if(result.issuer===this.ident.id)throw Error('Cannot pair with same signing key');
   if(p.issuer&&p.issuer!==result.issuer)throw Error('Peer key changed during session');
   p.issuer=result.issuer;this.emit('identified',{session,issuer:p.issuer});this.notify();return;
  }
  if(!p.issuer||!p.approved)throw Error('Unapproved or unidentified peer');
  if(m.kind==='ask'){
   if(typeof m.id!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(m.id))throw Error('Invalid inquiry ID');
   const q=validateQuestion(m.from,m.to);
   this.emit('inquiry',{session,issuer:p.issuer,requestId:m.id,...q});
  }else if(m.kind==='bundle'){
   const expected=this.inquiries.get(m.id);
   if(!expected||expected.session!==session||Date.now()>expected.expires)throw Error('Unsolicited or expired evidence');
   this.inquiries.delete(m.id);
   const proof=await verifyBundle(m.bundle);
   if(proof.issuer!==p.issuer)throw Error('Claim issuer does not match peer key');
   this.emit('evidence',{session,issuer:p.issuer,requestId:m.id,bundle:m.bundle,claims:proof.claims});
  }else if(m.kind==='declined'){
   const expected=this.inquiries.get(m.id);
   if(!expected||expected.session!==session)throw Error('Unsolicited refusal');
   this.inquiries.delete(m.id);this.emit('declined',{session,issuer:p.issuer,requestId:m.id});
  }else throw Error('Unknown message type');
 }
 approve(session){const p=this.peers.get(session);
  if(!p?.issuer||p.channel?.readyState!=='open')throw Error('Peer signature not verified');
  p.approved=true;this.notify();}
 transmit(session,message){const p=this.peers.get(session);
  if(!p?.approved||!p.issuer||p.channel?.readyState!=='open')throw Error('Peer approval required');
  const raw=JSON.stringify({schema:NET_SCHEMA,...message});
  if(raw.length>65000)throw Error('Packet exceeds limit');p.channel.send(raw);
 }
 ask(from,to){const q=validateQuestion(from,to);let sent=0;
  for(const [id,request] of this.inquiries)if(Date.now()>request.expires)this.inquiries.delete(id);
  if(this.inquiries.size>=32)throw Error('Too many pending inquiries');
  for(const [id,request] of this.inquiries)if(Date.now()>request.expires)this.inquiries.delete(id);
  if(this.inquiries.size>=32)throw Error('Too many pending inquiries');
  for(const [session,p] of this.peers){if(!p.approved||p.channel?.readyState!=='open')continue;
   const id=randomSecret();this.inquiries.set(id,{session,expires:Date.now()+5*60*1000});
   this.transmit(session,{kind:'ask',id,...q});sent++;}
  if(!sent)throw Error('Approve a connected authenticated peer first');
  this.emit('inquiry-sent',{count:sent});return sent;
 }
 async reply(session,requestId,selectedIds,nodes){const p=this.peers.get(session);if(!p?.approved)throw Error('Peer not approved');
  const bundle=await makeBundle(this.ident,nodes,selectedIds);
  this.transmit(session,{kind:'bundle',id:requestId,bundle});
  this.emit('evidence-sent',{session,count:selectedIds.length});
 }
 decline(session,requestId){this.transmit(session,{kind:'declined',id:requestId});}
 drop(session){const p=this.peers.get(session);if(p?.pc)p.pc.close();this.peers.delete(session);
  for(const [id,x] of this.inquiries)if(x.session===session)this.inquiries.delete(id);
  this.notify();}
 closePeers(){for(const session of [...this.peers.keys()])this.drop(session);this.me=null;}
 stop(){this.socket?.close();this.socket=null;this.closePeers();}
}
