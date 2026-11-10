/** Local append-only experiment-selection receipts; NOT TranchNode accepted events. */
import {sha} from './kernel.mjs';
import {PLANNER_SCHEMA} from './experiment-planner.mjs';
export const MAX_PLAN_RECEIPTS=120;
const fail=m=>{throw Error(m);};
export async function makePlanReceipt(scope,plan){
 if(typeof scope!=='string'||!scope.startsWith('local:node:')||plan?.schema!==PLANNER_SCHEMA
    ||plan.policy!=='LOCAL_PROPOSALS_ONLY'||plan.worldTruthCertified!==false
    ||plan.probabilityCalibrated!==false||plan.automaticPeerContacts!==0
    ||plan.automaticEvidenceAdmissions!==0||!Number.isSafeInteger(plan.creditsSpent)
    ||plan.creditsSpent<0||plan.creditsSpent>plan.budget)fail('Unsafe research plan');
 const body={schema:'motif.collective008.plan-receipt.v1',scope,at:new Date().toISOString(),
  plan,kind:'research-strategy-only',independentlyVerifiedWorldFacts:0,authorizedExternalActions:0};
 return {id:await sha(body),...body};
}
export async function replayPlanReceipts(receipts,scope){
 if(!Array.isArray(receipts)||receipts.length>MAX_PLAN_RECEIPTS)fail('Excessive experiment plan receipts');
 const ids=new Set();
 for(const r of receipts){
  if(!r||r.scope!==scope||r.schema!=='motif.collective008.plan-receipt.v1'
     ||r.kind!=='research-strategy-only'||r.independentlyVerifiedWorldFacts!==0
     ||r.authorizedExternalActions!==0||ids.has(r.id)
     ||r.plan?.schema!==PLANNER_SCHEMA||r.plan.policy!=='LOCAL_PROPOSALS_ONLY'
     ||r.plan.automaticPeerContacts!==0||r.plan.automaticEvidenceAdmissions!==0
     ||r.plan.worldTruthCertified!==false||r.plan.probabilityCalibrated!==false
     ||!Array.isArray(r.plan.sourceReceipts)||!Array.isArray(r.plan.candidates)
     ||r.plan.candidates.length>36||!Number.isSafeInteger(r.plan.creditsSpent)
     ||r.plan.creditsSpent>r.plan.budget)fail('Invalid or promoted experiment record');
  const {id,...body}=r;
  if(id!==await sha(body))fail('Experiment history digest mismatch');
  ids.add(id);
 }
 return receipts;
}
export function planFreshness(plan,threads,receipts,ledgerHead){
 if(plan.ledgerHead!==ledgerHead)return 'STALE_EVIDENCE';
 for(const ref of plan.sourceReceipts){
  const thread=threads.get(ref.threadId);
  if(!thread||thread.revision!==ref.threadRevision||thread.status!=='open')return 'STALE_THREAD';
  if(!receipts.some(x=>x.id===ref.receiptId))return 'STALE_RESEARCH';
 }
 return 'CURRENT_SNAPSHOT';
}
