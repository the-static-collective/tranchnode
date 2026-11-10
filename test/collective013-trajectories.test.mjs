import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {pairFollowups,fitTrajectory,discoverTrajectories,makeTrajectoryReceipt,auditTrajectoryReceipts} from '../apps/collective/trajectories.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const a='sha256:'+'a'.repeat(64),b='sha256:'+'b'.repeat(64),scope='local:node:'+'e'.repeat(64),DAY=86400000;
function history(kind='predictive'){
 const r=[],start=Date.UTC(2022,0,1);
 for(let i=0;i<60;i++){
  const t=i%2===0;let target=t?(i%10!==0):(i%10===1);
  if(kind==='drift'&&i>=45)target=!target;
  if(kind==='null')target=i%4<2;
  const iso=n=>new Date(start+n*DAY).toISOString();
  r.push({id:'a'+i,nodeId:a,action:'check',at:iso(i*4),outcome:t?'changed':'unchanged',sourceReference:'A'+i});
  r.push({id:'b'+i,nodeId:b,action:'check',at:iso(i*4+1),outcome:target?'changed':'unchanged',sourceReference:'B'+i});
 }
 return r;
}
const now=Date.UTC(2023,0,1),nodes=new Map([[a,{id:a,kind:'claim'}],[b,{id:b,kind:'claim'}]]);
test('report-order association outperforms checked-only baseline in designed positive regime',()=>{
 const p=fitTrajectory({records:history(),triggerNodeId:a,targetNodeId:b,windowDays:2,now});
 assert.equal(p.status,'PROVISIONAL_PREDICTIVE_ASSOCIATION');
 assert(p.heldoutBrier<p.heldoutBaselineBrier);assert.equal(p.causalityEstablished,false);
});
test('concept drift worsens held-out predictions',()=>{
 const p=fitTrajectory({records:history('drift'),triggerNodeId:a,targetNodeId:b,windowDays:2,now});
 assert.equal(p.status,'FAILED_HELDOUT');assert(p.heldoutBrier>p.heldoutBaselineBrier);
});
test('unchecked future state never becomes negative',()=>{
 const p=pairFollowups({records:[{id:'a',nodeId:a,action:'check',at:new Date(0).toISOString(),outcome:'changed',sourceReference:'A'}],triggerNodeId:a,targetNodeId:b,now});
 assert.equal(p.censored,1);assert.equal(p.pairs.length,0);
});
test('target reports cannot be recycled',()=>{
 const t=n=>new Date(n*DAY).toISOString(),r=[1,2].map(i=>({id:'a'+i,nodeId:a,action:'check',at:t(i),outcome:'changed',sourceReference:'A'+i}));
 r.push({id:'b',nodeId:b,action:'check',at:t(3),outcome:'changed',sourceReference:'B'});
 const p=pairFollowups({records:r,triggerNodeId:a,targetNodeId:b,now});
 assert.equal(p.pairs.length,1);assert.equal(p.censored,1);
});
test('no causal promotion, hash tampering detected',async()=>{
 const source=discoverTrajectories({records:history(),nodes,windowDays:2,now});
 assert.equal(source.causalGraphInferred,false);
 const r=await makeTrajectoryReceipt(scope,{projection:source,sourceHead:null,temporalHead:'hash'});
 await auditTrajectoryReceipts([r],scope);
 const t=structuredClone(r);t.projection.results[0].status='CERTIFIED';
 await assert.rejects(auditTrajectoryReceipts([t],scope),/hash mismatch/);
});