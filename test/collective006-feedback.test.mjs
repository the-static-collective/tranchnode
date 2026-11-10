import test from 'node:test';
import assert from 'node:assert/strict';
import {identity} from '../apps/collective/kernel.mjs';
import {rankPeers} from '../apps/collective/routing.mjs';
import {randomSecret} from '../apps/collective/net-protocol.mjs';
import {CollectiveMesh} from '../apps/collective/network.mjs';
import {feedbackReceipt,validateFeedbackLog,relevanceOfAdmission,peerFeedback} from '../apps/collective/feedback.mjs';

async function trial(events,issuer,from,to,{result='relevant',threadId=null}={}){
 const requestId=randomSecret(),question={from,to};
 events.push(await feedbackReceipt({type:'sent',requestId,peerIssuer:issuer,question,threadId}));
 if(result==='declined')events.push(await feedbackReceipt({type:'declined',requestId,peerIssuer:issuer,question,threadId}));
 else if(result==='received')events.push(await feedbackReceipt({type:'received',requestId,peerIssuer:issuer,question,threadId}));
 else {
  events.push(await feedbackReceipt({type:'received',requestId,peerIssuer:issuer,question,threadId}));
  events.push(await feedbackReceipt({type:'admitted',requestId,peerIssuer:issuer,question,threadId,relevant:result==='relevant',acceptedCount:1}));
 }
 return requestId;
}
function source(issuer){return {kind:'source',content:{originIssuer:issuer,originalNodeId:'p1',statement:{from:'A',to:'B',polarity:'supports'}}};}
const snapshot=(id,session)=>({issuer:id,session,approved:true,connected:true});

test('learning can correct misleading prior source affinity after repeated admitted outcomes',async()=>{
 const wrong=await identity(),right=await identity(),feedback=[];
 const nodes=new Map([['one',source(wrong.id)]]);
 const peers=[snapshot(wrong.id,'wrong'),snapshot(right.id,'right')];
 const baseline=rankPeers({nodes,peers,from:'A',to:'Z'});
 assert.equal(baseline[0].session,'wrong');
 for(let i=0;i<8;i++){
  await trial(feedback,wrong.id,'A','Z',{result:'irrelevant'});
  await trial(feedback,right.id,'A','Z',{result:'relevant'});
 }
 await validateFeedbackLog(feedback);
 const learned=rankPeers({nodes,peers,from:'A',to:'Z',feedback});
 assert.equal(learned[0].session,'right');
 assert.equal(learned[0].baseScore,0);
 assert(learned[0].feedbackAdjustment>0);
 assert(learned[1].feedbackAdjustment<0);
 assert.equal(rankPeers({nodes,peers,from:'A',to:'OTHER',feedback})[0].session,'wrong');
});

test('a refusal, non-admitted packet, or pending question must NEVER score competence or truth',async()=>{
 const peer=await identity(),events=[];
 for(let i=0;i<8;i++)await trial(events,peer.id,'A','Z',{result:'declined'});
 await trial(events,peer.id,'A','Z',{result:'received'});
 await validateFeedbackLog(events);
 const summary=peerFeedback({events,peerIssuer:peer.id,from:'A',to:'Z'});
 assert.equal(summary.observedAdmitted,0);
 assert.equal(summary.adjustment,0);
});

test('relevance uses only changes to recorded observations, not what-if imaginary paths',()=>{
 const unknown={status:'UNKNOWN_INSUFFICIENT_EVIDENCE'},supported={status:'PATH_SUPPORTED_BY_ASSERTIONS'},hold={status:'HOLD_CONTRADICTION'};
 assert.equal(relevanceOfAdmission({before:unknown,after:supported,beforeFrontier:new Set(['A']),afterFrontier:new Set(['A','B'])}),true);
 assert.equal(relevanceOfAdmission({before:unknown,after:unknown,beforeFrontier:new Set(['A']),afterFrontier:new Set(['A'])}),false);
 assert.equal(relevanceOfAdmission({before:unknown,after:hold,beforeFrontier:new Set(['A']),afterFrontier:new Set(['A','B'])}),false);
});

test('history validation rejects forged receipts, missing original inquiry, and double reward',async()=>{
 const p=await identity(),events=[];
 await trial(events,p.id,'A','D',{result:'relevant'});
 assert.equal((await validateFeedbackLog(events)).length,3);
 const cloned=structuredClone(events);cloned[2].relevant=false;
 await assert.rejects(validateFeedbackLog(cloned),/Altered/);
 await assert.rejects(validateFeedbackLog(events.slice(1)),/Missing or duplicated/);
 const doubled=[...events,await feedbackReceipt({type:'admitted',requestId:events[0].requestId,peerIssuer:p.id,question:{from:'A',to:'D'},relevant:true,acceptedCount:1})];
 await assert.rejects(validateFeedbackLog(doubled),/Duplicate outcome/);
});

test('thread-specific request references survive network consent boundary and bind peer response',async()=>{
 const me=await identity(),other=await identity();
 const events=[],mesh=new CollectiveMesh({ident:me,room:randomSecret(),url:'wss://example.test/signal',onEvent:e=>events.push(e)});
 mesh.me='session-self';mesh.addPeer('peer');
 const p=mesh.peers.get('peer');p.issuer=other.id;p.approved=true;
 const wires=[];p.channel={readyState:'open',send:value=>wires.push(JSON.parse(value))};
 const threadId='thread:'+'a'.repeat(64);
 assert.equal(mesh.ask('North','Village',{sessions:['peer'],threadId}),1);
 assert.equal(wires.length,1);
 const request=events.find(e=>e.type==='inquiry-sent').requests[0];
 assert.equal(request.threadId,threadId);
 assert.equal(mesh.inquiries.get(request.requestId).threadId,threadId);
 await mesh.onWire('peer',JSON.stringify({schema:'tranch.collective004.v1',kind:'declined',id:request.requestId}));
 const refusal=events.find(e=>e.type==='declined');
 assert.equal(refusal.threadId,threadId);
 assert.deepEqual(refusal.question,{from:'North',to:'Village'});
 assert.equal(mesh.inquiries.size,0);
});
