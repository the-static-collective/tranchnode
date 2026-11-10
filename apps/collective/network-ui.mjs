import {auditImportedSources} from './kernel.mjs';
import {rankPeers,nextSuggestedPeer} from './routing.mjs';
import {CollectiveMesh} from './network.mjs';
import {randomSecret,validRelayURL,validRoom} from './net-protocol.mjs';

export function bindNetwork({state,refresh,setStatus,el,recordFeedback}){
 const $=id=>document.getElementById(id);let mesh=null;
 const short=s=>(s||'').replace('node:','').slice(0,14);
 const info=(text,bad=false)=>setStatus(text,bad);
 const attempted=new Map();let ranked=[];
 const threadTag=()=>{const t=state.threads?.get(state.networkQuestionThreadId);return t&&t.question.from===$('question-from').value.trim()&&t.question.to===$('question-to').value.trim()?t.id:null;};
 const qkey=()=>JSON.stringify([$('question-from').value.trim(),$('question-to').value.trim(),threadTag()]);
 const asked=()=>attempted.get(qkey())||new Set();
 function explainChosen(){
  const p=ranked.find(x=>x.session===$('routing-peer').value);
  $('routing-explain').textContent=p?('Score '+p.score+'; '+p.reason+'. '+(asked().has(p.session)?'Already asked about this path.':'Not yet asked about this path.')+
   ' This is evidence of prior disclosure, not a guarantee of an undisclosed answer.'):'No peer selected.';
 }
 function renderRank(){
  const select=$('routing-peer');select.replaceChildren();
  for(const p of ranked){
   const option=el('option',null,p.issuer.replace('node:','').slice(0,14)+' · '+(p.score>0?'previous evidence':'unknown relevance')+(asked().has(p.session)?' · asked':''));
   option.value=p.session;select.append(option);
  }
  select.disabled=!ranked.length;$('ask-suggested').disabled=!ranked.length;$('try-next').disabled=!ranked.length;
  if(!ranked.length){select.append(el('option',null,'No approved peers'));$('routing-explain').textContent='No approved peers to rank.';return;}
  const next=nextSuggestedPeer(ranked,asked());if(next)select.value=next.session;
  explainChosen();
 }
 async function suggest(){
  if(!mesh)throw Error('Join a room first');
  await auditImportedSources(state.nodes);
  ranked=rankPeers({nodes:state.nodes,peers:mesh.snapshots(),from:$('question-from').value,to:$('question-to').value,feedback:state.feedback});
  renderRank();
 }
 function remember(sessions){
  const key=qkey(),set=attempted.get(key)||new Set();
  for(const session of sessions)set.add(session);attempted.set(key,set);
 }

 const relayInput=$('relay-url'),roomInput=$('room-code');
 if(['localhost','127.0.0.1'].includes(location.hostname))relayInput.value='ws://127.0.0.1:8765/signal';
 // Fragment contains invite capability, not transmitted to the page host in HTTP requests.
 try{const encoded=new URLSearchParams(location.hash.slice(1)).get('invite');if(encoded){const invite=JSON.parse(atob(encoded.replaceAll('-','+').replaceAll('_','/')));if(validRoom(invite.room)&&validRelayURL(invite.relay)){roomInput.value=invite.room;relayInput.value=invite.relay;info('Invitation loaded. Join deliberately when ready.');}}}catch{}
 function setConnected(v){$('join-room').disabled=v;$('new-room').disabled=v;$('leave-room').disabled=!v;$('copy-invite').disabled=!v;}
 function renderPeers(peers){ranked=[];$('routing-peer').disabled=true;$('ask-suggested').disabled=true;$('try-next').disabled=true;const list=$('peer-list');list.replaceChildren();
  if(!peers.length){list.append(el('p','muted','No other nodes in this invite-only room.'));return;}
  for(const p of peers){
   const row=el('div','peer-entry');
   const meta=el('div','peer-meta');meta.append(el('strong',null,p.issuer?short(p.issuer):'Unverified visitor'),el('small','muted',p.identified?'Signing-key fingerprint: '+p.issuer:'Ephemeral room participant; identity not verified'));
   row.append(meta);
   if(!p.connected){const connect=el('button','secondary','CONNECT');connect.onclick=()=>mesh.connect(p.session).catch(e=>info(e.message,true));row.append(connect);}
   else if(!p.identified){row.append(el('span','muted','Authenticating…'));}
   else if(!p.approved){const approve=el('button','secondary','APPROVE SESSION');approve.title='Compare fingerprint through a separate trusted channel before approval';approve.onclick=()=>{try{mesh.approve(p.session);info('Session approved. No testimony has been shared.');}catch(e){info(e.message,true);}};row.append(approve);}
   else row.append(el('span','ok','APPROVED'));
   list.append(row);
  }
 }
 function incomingQuestion(evt){
  $('inquiries').querySelector('p.muted')?.remove();
  $('inquiries').querySelector('p.muted')?.remove();
  const row=el('div','inquiry-entry');const heading=el('strong',null,'Node '+short(evt.issuer)+' asks: '+evt.from+' → '+evt.to);
  row.append(heading,el('p','muted','Nothing is automatically disclosed. Select only your own assertions below; the requestor will still have to admit the response.'));
  const selects=el('div','inquiry-selects');
  const own=[...state.nodes.values()].filter(n=>n.kind==='claim'&&n.authorId===state.ident.id);
  for(const n of own){const label=el('label','claim-row');const box=el('input');box.type='checkbox';box.value=n.id;
   label.append(box,el('span',null,n.content.from+' → '+n.content.to+' ['+n.content.polarity+']'));selects.append(label);}
  row.append(selects);if(!own.length)row.append(el('p','muted','You have no local assertions to offer.'));
  const actions=el('div','button-row'),decline=el('button','secondary','DECLINE'),send=el('button',null,'SHARE SELECTED');
  decline.onclick=()=>{try{mesh.decline(evt.session,evt.requestId);row.remove();info('Inquiry declined; no evidence disclosed.');}catch(e){info(e.message,true);}};
  send.onclick=async()=>{try{const ids=[...selects.querySelectorAll('input:checked')].map(b=>b.value);if(!ids.length)throw Error('Select assertions to share, or decline.');
    await mesh.reply(evt.session,evt.requestId,ids,state.nodes);row.remove();info('Sent '+ids.length+' signed assertion(s) over the encrypted channel.');}catch(e){info(e.message,true);}};
  actions.append(decline,send);row.append(actions);$('inquiries').prepend(row);
 }
 function incomingEvidence(evt){$('evidence-inbox').querySelector('p.muted')?.remove();const row=el('div','inquiry-entry');row.append(el('strong',null,evt.claims.length+' signed assertion(s) from '+short(evt.issuer)),
  el('p','muted','Transport authenticated and signature verified. Review and admit explicitly; nothing automatically enters your evidence ledger.'));
  const button=el('button','secondary','INSPECT AND ADMIT');button.onclick=()=>{state.stagedNetwork=evt;$('inbox').value=JSON.stringify(evt.bundle);$('preview').click();row.remove();document.getElementById('in-preview').scrollIntoView({block:'center',behavior:'smooth'});};
  row.append(button);$('evidence-inbox').prepend(row);info('New signed evidence received. Review it to admit.');}
 async function join(){try{
  const room=roomInput.value.trim(),url=relayInput.value.trim();if(!validRoom(room)||!validRelayURL(url))throw Error('Use a generated room token and a secure wss:// relay (ws://localhost permitted).');
  const ice=$('ice-url').value.trim();
  if(ice&&!/^stun:[a-z0-9.-]+(?::[0-9]{1,5})?$/i.test(ice))throw Error('Only an optional stun:host:port server is accepted in this trial');
  if(mesh)mesh.stop();attempted.clear();ranked=[];
  mesh=new CollectiveMesh({ident:state.ident,room,url,iceServers:ice?[{urls:ice}]:[],onEvent:event=>{
   if(event.type==='peers')renderPeers(event.peers);
   if(event.type==='joined'){setConnected(true);info('Joined an invite-only discovery room. No evidence disclosed.');}
   if(event.type==='inquiry')incomingQuestion(event);
   if(event.type==='evidence'){recordFeedback({type:'received',requestId:event.requestId,peerIssuer:event.issuer,question:event.question,threadId:event.threadId});incomingEvidence(event);}
   if(event.type==='inquiry-sent')for(const r of event.requests)recordFeedback({type:'sent',requestId:r.requestId,peerIssuer:r.peerIssuer,question:r.question,threadId:r.threadId});
   if(event.type==='declined'){recordFeedback({type:'declined',requestId:event.requestId,peerIssuer:event.issuer,question:event.question,threadId:event.threadId});info('A peer declined. No lack of expertise is inferred.');}
   if(event.type==='relay-closed'){setConnected(false);renderPeers([]);info('Relay connection closed; local memory remains available.',true);}
   if(event.type==='error')info(event.message,true);
  }});
  await mesh.start();
 }catch(e){info(e.message,true);}}
 $('new-room').onclick=()=>{roomInput.value=randomSecret();join();};
 $('join-room').onclick=join;
 $('leave-room').onclick=()=>{mesh?.stop();mesh=null;setConnected(false);renderPeers([]);info('Disconnected. Local memory remains intact.');};
 $('copy-invite').onclick=async()=>{try{const raw=btoa(JSON.stringify({room:roomInput.value.trim(),relay:relayInput.value.trim()})).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  const address=new URL(location.href);address.hash='invite='+raw;await navigator.clipboard.writeText(address.toString());info('Private invitation link copied. Anyone holding it may join the room, so share deliberately.');
 }catch(e){info('Unable to copy invite link: '+e.message,true);}};
 $('suggest-peer').onclick=async()=>{try{await suggest();info('Ranked '+ranked.length+' approved peer(s) from verified, previously admitted evidence. Nothing sent.');}catch(e){info(e.message,true);}};
 $('routing-peer').onchange=explainChosen;
 $('ask-suggested').onclick=()=>{try{
  if(!mesh)throw Error('Join a room first');
  const session=$('routing-peer').value;
  if(!ranked.find(p=>p.session===session))throw Error('Recalculate suggestions for active peers');
  const count=mesh.ask($('question-from').value,$('question-to').value,{sessions:[session],threadId:threadTag()});
  remember([session]);explainChosen();
  info('Sent question endpoints to '+count+' selected peer. No other peer received this inquiry.');
 }catch(e){info(e.message,true);}};
 $('try-next').onclick=()=>{try{
  if(!ranked.length)throw Error('Request suggestions first');
  const next=nextSuggestedPeer(ranked,asked());
  if(!next)throw Error('Every candidate has been asked; you may manually ask again.');
  $('routing-peer').value=next.session;explainChosen();info('Next candidate previewed. Nothing sent.');
 }catch(e){info(e.message,true);}};
 $('ask-room').onclick=()=>{try{
  if(!mesh)throw Error('Join a room first');
  const targets=mesh.snapshots().filter(p=>p.approved&&p.connected).map(p=>p.session);
  const count=mesh.ask($('question-from').value,$('question-to').value,{threadId:threadTag()});
  remember(targets);
  info('MANUAL BROADCAST: question endpoints disclosed to '+count+' approved peer(s).');
 }catch(e){info(e.message,true);}};
 setConnected(false);renderPeers([]);
}
