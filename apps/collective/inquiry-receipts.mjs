/** Immutable, LOCAL-ONLY researcher receipts, never witness events or graph facts. */
import {sha,canonical} from './kernel.mjs';
import {INQUIRY_VERSION} from './inquiry-engine.mjs';

export const DEFAULT_ALLOCATION=24,MAX_ALLOCATION=256,MAX_RUNS=600;
const threadId=x=>typeof x==='string'&&/^thread:[0-9a-f]{64}$/.test(x);
function check(condition,message){if(!condition)throw Error(message);}
export function remainingBudget(allocation,runs,id){
 check(Number.isSafeInteger(allocation)&&allocation>=2&&allocation<=MAX_ALLOCATION,'Invalid thread budget');
 const consumed=runs.filter(r=>r.result.threadId===id).reduce((sum,r)=>sum+r.result.creditsSpent,0);
 check(consumed<=MAX_ALLOCATION,'Research budget history exceeds bounds');
 return Math.max(0,allocation-consumed);
}
export async function makeInquiryReceipt(scope,result){
 check(typeof scope==='string'&&scope.startsWith('local:node:')&&result?.schema===INQUIRY_VERSION
  &&threadId(result.threadId)&&result.creditsSpent>=2&&result.creditsSpent<=64
  &&result.creditsRemaining===result.budget-result.creditsSpent
  &&result.researchOnly===true&&result.worldTruthCertified===false
  &&result.automaticFactPromotion===false&&result.automaticPeerContact===false,
  'Investigation cannot be recorded as observed or authorized action');
 const event={schema:'motif.collective007.run.v1',scope,at:new Date().toISOString(),
   result,epistemicClass:'research-proposal',acceptedWorldFacts:0,externalActions:0};
 return {id:await sha(event),...event};
}
export async function replayInquiryReceipts(receipts,scope){
 check(Array.isArray(receipts)&&receipts.length<=MAX_RUNS,'Excessive research receipts');
 const ids=new Set();
 for(const r of receipts){
  check(r?.scope===scope&&r.schema==='motif.collective007.run.v1'&&!ids.has(r.id)
    &&r.epistemicClass==='research-proposal'&&r.acceptedWorldFacts===0&&r.externalActions===0
    &&r.result?.schema===INQUIRY_VERSION&&threadId(r.result.threadId)
    &&r.result.researchOnly===true&&!r.result.automaticFactPromotion
    &&!r.result.automaticPeerContact&&!r.result.worldTruthCertified
    &&Number.isSafeInteger(r.result.budget)&&r.result.budget>=2&&r.result.budget<=64
    &&Number.isSafeInteger(r.result.creditsSpent)&&r.result.creditsSpent>=2
    &&r.result.creditsSpent<=r.result.budget
    &&r.result.creditsRemaining===r.result.budget-r.result.creditsSpent,
    'Invalid or promoted inquiry receipt');
  const {id,...body}=r;
  check(id===await sha(body),'Research receipt hash invalid');
  ids.add(id);
 }
 return receipts;
}
/** A prior snapshot may be displayed but never silently re-used as current evidence. */
export function reportFreshness(run,thread,ledgerHead){
 if(!run||!thread)return 'UNKNOWN';
 if(run.result.threadRevision!==thread.revision)return 'STALE_THREAD';
 if(run.result.ledgerHead!==ledgerHead)return 'STALE_EVIDENCE';
 return 'CURRENT_SNAPSHOT';
}
