import {sha} from './kernel.mjs';
import {auditTemporalReceipts,MS_DAY} from './temporal.mjs';
export const TRAJECTORY_SCHEMA='motif.collective013.trajectory-scan.v1';
export const TRAJECTORY_RECEIPT_SCHEMA='motif.collective013.trajectory-receipt.v1';
export const TRAJECTORY_RUN_CAP=96,MAX_TRAJECTORY_NODES=24;
const check=(x,m)=>{if(!x)throw Error(m);};
const idOK=x=>typeof x==='string'&&/^sha256:[0-9a-f]{64}$/.test(x);
const scopeOK=x=>typeof x==='string'&&/^local:node:[0-9a-f]{64}$/.test(x);
const iso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString()===x;
const avg=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
const rnd=x=>x===null?null:+x.toFixed(5);
const observed=x=>x&&x.action==='check'&&['changed','unchanged','inconclusive'].includes(x.outcome);
const hashable=x=>typeof x==='number'&&!Number.isSafeInteger(x)?(check(Number.isFinite(x),'Invalid fraction'),['decimal-number',String(x)]):Array.isArray(x)?x.map(hashable):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,hashable(v)])):x;
export function pairFollowups({records,triggerNodeId,targetNodeId,windowDays=14,now=Date.now()}){
 check(idOK(triggerNodeId)&&idOK(targetNodeId)&&triggerNodeId!==targetNodeId,'Distinct source IDs required');
 check(Array.isArray(records)&&records.length<=4096&&Number.isFinite(now),'Invalid history');
 check(Number.isInteger(windowDays)&&windowDays>=1&&windowDays<=365,'Window must be 1 to 365 days');
 const all=records.filter(observed);
 for(const r of all)check(iso(r.at)&&Date.parse(r.at)<=now+60000,'Bad or future check time');
 const get=(id)=>all.filter(r=>r.nodeId===id&&r.outcome!=='inconclusive').sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));
 const triggers=get(triggerNodeId),targets=get(targetNodeId),used=new Set(),pairs=[];
 let censored=0,echo=0;
 for(const a of triggers){
  const start=Date.parse(a.at),end=Math.min(now,start+windowDays*MS_DAY);
  let chosen=null;
  for(const b of targets){
   const t=Date.parse(b.at);
   if(t<=start||t>end||used.has(b.id))continue;
   if(a.sourceReference===b.sourceReference){echo++;continue;}
   chosen=b;break;
  }
  if(!chosen){censored++;continue;}
  used.add(chosen.id);
  pairs.push({triggerReceiptId:a.id,targetReceiptId:chosen.id,triggerAt:a.at,
   targetCheckedAt:chosen.at,triggerChanged:a.outcome==='changed',targetChanged:chosen.outcome==='changed',
   reportLagDays:rnd((Date.parse(chosen.at)-start)/MS_DAY),independenceVerified:false});
 }
 return {pairs,triggerCount:triggers.length,censored,sameReferenceRejected:echo,horizonDays:windowDays,
   reportTimeNotEventTime:true,duplicateTargetChecksUsed:0};
}
export function fitTrajectory({records,triggerNodeId,targetNodeId,windowDays=14,now=Date.now(),holdoutFraction=.25}){
 check(Number.isFinite(holdoutFraction)&&holdoutFraction>=.2&&holdoutFraction<=.5,'Bad holdout');
 const matched=pairFollowups({records,triggerNodeId,targetNodeId,windowDays,now});
 const events=matched.pairs,held=Math.max(1,Math.floor(events.length*holdoutFraction)),train=events.slice(0,Math.max(0,events.length-held)),test=events.slice(train.length);
 const changed=train.filter(x=>x.triggerChanged),control=train.filter(x=>!x.triggerChanged),count=xs=>xs.filter(x=>x.targetChanged).length;
 const enough=changed.length>=3&&control.length>=3;
 const p=(xs)=>(count(xs)+1)/(xs.length+2);
 const p1=enough?p(changed):null,p0=enough?p(control):null,all=enough?p(train):null;
 const brier=fn=>avg(test.map(x=>(fn(x)-(x.targetChanged?1:0))**2));
 const model=enough&&test.length>=4?brier(x=>x.triggerChanged?p1:p0):null;
 const base=enough&&test.length>=4?brier(()=>all):null;
 const positive=test.filter(x=>x.triggerChanged).length,negative=test.length-positive;
 let status='INSUFFICIENT_CHECKED_EPISODES';
 if(enough&&test.length<4)status='AWAIT_HELDOUT_CHECKS';
 else if(enough&&(!positive||!negative))status='UNBALANCED_HELDOUT';
 else if(enough&&base-model<-.000001)status='FAILED_HELDOUT';
 else if(enough&&Math.abs(p1-p0)<.1)status='NO_STRONG_ASSOCIATION';
 else if(enough)status='PROVISIONAL_PREDICTIVE_ASSOCIATION';
 const lags=events.filter(x=>x.triggerChanged&&x.targetChanged).map(x=>x.reportLagDays).sort((a,b)=>a-b);
 const median=lags.length?(lags[Math.floor((lags.length-1)/2)]+lags[Math.floor(lags.length/2)])/2:null;
 return {schema:TRAJECTORY_SCHEMA,triggerNodeId,targetNodeId,horizonDays:windowDays,status,
  trainingCount:train.length,trainTriggerChanged:changed.length,trainTriggerUnchanged:control.length,
  holdoutCount:test.length,holdoutTriggerChanged:positive,holdoutTriggerUnchanged:negative,
  matching:{triggerChecks:matched.triggerCount,matched:events.length,censored:matched.censored,
    sameReferenceRejected:matched.sameReferenceRejected,distinctTargetCheckIds:events.length},
  trainedConditionalRate:rnd(p1),trainedControlRate:rnd(p0),trainedOverallRate:rnd(all),reportedRateDifference:rnd(enough?p1-p0:null),
  heldoutBrier:rnd(model),heldoutBaselineBrier:rnd(base),heldoutBrierImprovement:rnd(base===null?null:base-model),
  medianCheckToCheckLagDays:rnd(median),
  usedCheckReceiptIds:[...new Set(events.flatMap(x=>[x.triggerReceiptId,x.targetReceiptId]))].sort(),
  reportOrderNotEventOrder:true,causalityEstablished:false,sourceIndependenceVerified:false,
  missingFollowupsNeverCountedAsUnchanged:true,worldTruthCertified:false,automaticExternalActions:0,
  interpretation:'Time order of reports, not actual changes; observational association is not causation.'};
}
export function discoverTrajectories({records,nodes,windowDays=14,now=Date.now(),maxNodes=MAX_TRAJECTORY_NODES}){
 check(Array.isArray(records)&&records.length<=4096&&nodes instanceof Map&&Number.isInteger(maxNodes)&&maxNodes>=2&&maxNodes<=MAX_TRAJECTORY_NODES,'Invalid scan');
 const ids=[...nodes.values()].filter(x=>['claim','source'].includes(x.kind)).slice(0,maxNodes).map(x=>x.id),results=[];
 for(const a of ids)for(const b of ids)if(a!==b){
  const r=fitTrajectory({records,triggerNodeId:a,targetNodeId:b,windowDays,now});
  if(r.matching.matched)results.push(r);
 }
 const ranking=x=>x.status==='PROVISIONAL_PREDICTIVE_ASSOCIATION'?3:x.status==='FAILED_HELDOUT'?2:x.status==='NO_STRONG_ASSOCIATION'?1:0;
 results.sort((a,b)=>ranking(b)-ranking(a)||(b.heldoutBrierImprovement??-1)-(a.heldoutBrierImprovement??-1)||a.triggerNodeId.localeCompare(b.triggerNodeId)||a.targetNodeId.localeCompare(b.targetNodeId));
 return {schema:'motif.collective013.trajectory-discovery.v1',windowDays,scannedNodes:ids.length,
 scannedDirectedPairs:ids.length*(ids.length-1),matchedPairs:results.length,
 provisionalCount:results.filter(x=>x.status==='PROVISIONAL_PREDICTIVE_ASSOCIATION').length,
 results,causalGraphInferred:false,declaredDependenciesMutated:false,automaticEvidenceAdmissions:0,automaticPeerContacts:0};
}
export function trajectoryRechecks({discovery,records,now=Date.now()}){
 check(discovery?.schema==='motif.collective013.trajectory-discovery.v1'&&Array.isArray(records),'Invalid scan');
 const last=new Map();
 for(const x of [...records].filter(observed).sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id)))last.set(x.nodeId,x);
 const actions=[];
 for(const r of discovery.results){
  if(r.status!=='PROVISIONAL_PREDICTIVE_ASSOCIATION'||r.reportedRateDifference<=0)continue;
  const a=last.get(r.triggerNodeId),b=last.get(r.targetNodeId);
  if(!a||a.outcome!=='changed'||Date.parse(a.at)>now||Date.parse(a.at)+r.horizonDays*MS_DAY<now)continue;
  if(b&&Date.parse(b.at)>Date.parse(a.at)&&b.outcome!=='inconclusive')continue;
  actions.push({triggerNodeId:r.triggerNodeId,targetNodeId:r.targetNodeId,triggerReceiptId:a.id,
   reason:'Historical check-report association only. Manually recheck; no inferred change.',
   heldoutBrierImprovement:r.heldoutBrierImprovement,autoContact:false,automaticFactPromotion:false});
 }
 return actions.slice(0,24);
}
export async function makeTrajectoryReceipt(scope,{projection,sourceHead,temporalHead,now=new Date().toISOString()}){
 check(scopeOK(scope)&&projection?.schema==='motif.collective013.trajectory-discovery.v1'&&iso(now),'Invalid scan receipt');
 const body={schema:TRAJECTORY_RECEIPT_SCHEMA,scope,at:now,sourceHead,temporalHead,projection,
  researchOnly:true,causalClaim:false,automaticLedgerUpdates:0};
 return {id:await sha(hashable(body)),...body};
}
export async function auditTrajectoryReceipts(receipts,scope){
 check(scopeOK(scope)&&Array.isArray(receipts)&&receipts.length<=TRAJECTORY_RUN_CAP,'Invalid research history');
 const seen=new Set();
 for(const r of receipts){
  check(r?.schema===TRAJECTORY_RECEIPT_SCHEMA&&r.scope===scope&&iso(r.at)&&r.researchOnly===true&&r.causalClaim===false&&r.automaticLedgerUpdates===0&&r.projection?.schema==='motif.collective013.trajectory-discovery.v1'&&Array.isArray(r.projection.results)&&r.projection.results.length<=552&&!seen.has(r.id),'Invalid or repeated trajectory receipt');
  const {id,...body}=r;
  check(id===await sha(hashable(body)),'Trajectory research hash mismatch');seen.add(id);
 }
 return receipts;
}
export const validateTrajectorySource=(records,scope,nodes)=>auditTemporalReceipts(records,scope,nodes);
