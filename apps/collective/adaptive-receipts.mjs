/** COLLECTIVE-009: locally held, content-digested simulation plans, not accepted evidence. */
import {sha} from './kernel.mjs';
import {ADAPTIVE_SCHEMA} from './adaptive-strategy.mjs';
export const MAX_ADAPTIVE_RECEIPTS=80;
const fail=msg=>{throw Error(msg)};
function safe(p){return p&&p.schema===ADAPTIVE_SCHEMA&&p.worldTruthCertified===false&&
  p.probabilityCalibrated===false&&p.automaticPeerContacts===0&&p.automaticEvidenceAdmissions===0&&
  Number.isSafeInteger(p.creditsSpent)&&p.creditsSpent>=0&&p.creditsSpent<=p.creditsLimit&&
  Array.isArray(p.sourceReceipts)&&p.sourceReceipts.length<=24&&Array.isArray(p.alternatives)&&p.alternatives.length<=8&&
  p.sourceReceipts.every(r=>/^thread:[0-9a-f]{64}$/.test(r.threadId)&&r.threadRevision.startsWith('sha256:')&&r.receiptId.startsWith('sha256:'));}
function encodeDecimalNumbers(data){
 if(data===null||typeof data==='string'||typeof data==='boolean')return data;
 if(typeof data==='number'){
  if(!Number.isFinite(data))fail('Nonfinite forecast');
  return Number.isSafeInteger(data)?data:data.toFixed(6);
 }
 if(Array.isArray(data))return data.map(encodeDecimalNumbers);
 if(typeof data==='object'&&Object.getPrototypeOf(data)===Object.prototype){
  const out={};for(const [k,v] of Object.entries(data))out[k]=encodeDecimalNumbers(v);
  return out;
 }
 fail('Unsupported strategy receipt data');
}
export async function makeAdaptiveReceipt(scope,policy,sourcePlanId){
 if(!/^local:node:[0-9a-f]{64}$/.test(scope)||!safe(policy)||typeof sourcePlanId!=='string'||!sourcePlanId.startsWith('sha256:'))
  fail('Invalid adaptive-policy evidence boundary');
 const body={schema:'motif.collective009.policy-receipt.v1',scope,at:new Date().toISOString(),policy:encodeDecimalNumbers(policy),sourcePlanId,
  epistemicState:'simulation-only',authorizedExternalActions:0,admittedObservedFacts:0};
 return {id:await sha(body),...body};
}
export async function replayAdaptiveReceipts(receipts,scope){
 if(!Array.isArray(receipts)||receipts.length>MAX_ADAPTIVE_RECEIPTS)fail('Adaptive history bound reached');
 const seen=new Set();
 for(const r of receipts){
  if(!r||r.scope!==scope||r.schema!=='motif.collective009.policy-receipt.v1'||
   r.epistemicState!=='simulation-only'||r.authorizedExternalActions!==0||r.admittedObservedFacts!==0||
   !safe(r.policy)||typeof r.sourcePlanId!=='string'||!r.sourcePlanId.startsWith('sha256:')||seen.has(r.id))
   fail('Tampered or promoted strategy record');
  const {id,...body}=r;if(id!==await sha(body))fail('Strategy receipt digest mismatch');seen.add(id);
 }
 return receipts;
}
export function adaptiveFreshness(receipt,{ledgerHead,threads,sourcePlans}){
 if(receipt.policy.ledgerHead!==ledgerHead)return 'STALE_EVIDENCE';
 if(!sourcePlans.some(x=>x.id===receipt.sourcePlanId))return 'STALE_SOURCE_PLAN';
 for(const r of receipt.policy.sourceReceipts){const t=threads.get(r.threadId);
  if(!t||t.revision!==r.threadRevision||t.status!=='open')return 'STALE_THREAD';}
 return 'CURRENT_SNAPSHOT';
}
