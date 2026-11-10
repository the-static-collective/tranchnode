import test from 'node:test';
import assert from 'node:assert/strict';
import {makeAdaptiveReceipt,replayAdaptiveReceipts,adaptiveFreshness} from '../apps/collective/adaptive-receipts.mjs';
import {adaptivePolicy} from '../apps/collective/adaptive-strategy.mjs';
import {planExperiments} from '../apps/collective/experiment-planner.mjs';
const h=i=>'sha256:'+i.toString(16).padStart(64,'0'),tid=i=>'thread:'+i.toString(16).padStart(64,'0'),scope='local:node:'+'c'.repeat(64);
function fixture(){const nodes=[{id:h(1),kind:'claim',content:{from:'A',to:'B',polarity:'supports'}}];
 const jobs=[{threadId:tid(1),threadRevision:h(2),receiptId:h(3),status:'open',ledgerHead:h(4),question:{from:'A',to:'D'},assumptions:[],candidateQuestions:[{from:'B',to:'D'}]}];
 const experimentPlan=planExperiments({jobs,nodes,ledgerHead:h(4),probeCredits:12});
 return {jobs,nodes,experimentPlan,ledgerHead:h(4)};}

test('local strategy receipt remains simulation and checks digest',async()=>{
 const policy=adaptivePolicy(fixture());const receipt=await makeAdaptiveReceipt(scope,policy,h(9));
 assert.equal(receipt.epistemicState,'simulation-only');assert.equal(receipt.authorizedExternalActions,0);
 await replayAdaptiveReceipts([receipt],scope);
 const fake=structuredClone(receipt);fake.policy.alternatives[0].expectedTwoStepGain=1234567;
 await assert.rejects(replayAdaptiveReceipts([fake],scope),/digest mismatch/);
});
test('tampered claims to factual authority or automatic peer calls are rejected',async()=>{
 const policy=adaptivePolicy(fixture());
 for(const field of ['automaticPeerContacts','automaticEvidenceAdmissions','worldTruthCertified','probabilityCalibrated']){
  const forged=structuredClone(policy);forged[field]=field.includes('automatic')?1:true;
  await assert.rejects(makeAdaptiveReceipt(scope,forged,h(9)),/Invalid adaptive-policy/);
 }
});
test('freshness notices changing ledger, thread revision and absent prior plan',async()=>{
 const policy=adaptivePolicy(fixture()),receipt=await makeAdaptiveReceipt(scope,policy,h(9));
 const threads=new Map([[tid(1),{revision:h(2),status:'open'}]]);
 const context={ledgerHead:h(4),threads,sourcePlans:[{id:h(9)}]};
 assert.equal(adaptiveFreshness(receipt,context),'CURRENT_SNAPSHOT');
 assert.equal(adaptiveFreshness(receipt,{...context,ledgerHead:h(5)}),'STALE_EVIDENCE');
 assert.equal(adaptiveFreshness(receipt,{...context,sourcePlans:[]}), 'STALE_SOURCE_PLAN');
 threads.get(tid(1)).revision=h(10);
 assert.equal(adaptiveFreshness(receipt,context),'STALE_THREAD');
});
