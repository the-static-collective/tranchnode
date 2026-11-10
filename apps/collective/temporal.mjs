/** COLLECTIVE-011 — the Presumed Delta: time is evidence about possible state change.
 * An estimate of AT LEAST ONE CHANGE is not a probability that a proposition is false.
 * No estimated rate is calibrated or proof of change; category selection is operator-authored.
 * Does not mutate the source graph or transmit information.
 */
import {sha} from './kernel.mjs';
export const TEMPORAL_SCHEMA='motif.collective011.temporal-annotation.v1';
export const MAX_TEMPORAL_EVENTS=4096;
export const MS_DAY=86400000;
// Defaults are ILLUSTRATIONS, not empirical facts or recommendations for every domain.
export const TEMPORAL_PROFILES=Object.freeze({
 invariant:{halfLifeDays:null,acceleration:0,description:'Formal identity or stable definition; time-based change is not modeled'},
 slow:{halfLifeDays:1825,acceleration:0.05,description:'Slow-changing physical or institutional state (illustrative)'},
 ordinary:{halfLifeDays:90,acceleration:0.12,description:'Regularly changing circumstances (illustrative)'},
 fast:{halfLifeDays:7,acceleration:0.15,description:'Fast-changing availability or conditions (illustrative)'},
 rapid:{halfLifeDays:1,acceleration:0.20,description:'Very fast-changing local state (illustrative)'}
});
const fail=reason=>{throw Error(reason);};
const requireThat=(valid,reason)=>{if(!valid)fail(reason);};
const validScope=x=>typeof x==='string'&&/^local:node:[0-9a-f]{64}$/.test(x);
const validNode=x=>typeof x==='string'&&/^sha256:[0-9a-f]{64}$/.test(x);
function parseTime(value){
 requireThat(typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value),'Require UTC ISO timestamp');
 const at=Date.parse(value);requireThat(Number.isFinite(at)&&new Date(at).toISOString().slice(0,19)===value.slice(0,19),'Invalid UTC timestamp');
 return at;
}
function rounded(x){return +x.toFixed(6);}
/** Nonhomogeneous hazard: h(t)=ln(2)/L * (1+a*t/L), where L is a scale,
 * NOT necessarily a half-life if acceleration > 0. Integrated hazard grows
 * as ln(2) * (t/L + (a/2)*(t/L)^2).
 */
export function presumedDelta({since,now,profile='ordinary',halfLifeDays=null,acceleration=null}){
 requireThat(Number.isFinite(now)&&now>=0,'Invalid present time');
 const start=typeof since==='string'?parseTime(since):since;
 requireThat(Number.isFinite(start)&&start>=0,'Invalid observed time');
 if(start>now+60000)fail('Last check is in the future; investigate device clock');
 const config=TEMPORAL_PROFILES[profile];requireThat(config,'Unknown state-change class');
 if(profile==='invariant'&&(halfLifeDays!==null||acceleration!==null))fail('Invariant cannot take a nonzero volatility rate');
 const d=Math.max(0,(now-start)/MS_DAY);
 if(profile==='invariant')return {profile,ageDays:rounded(d),cumulativeHazard:0,pAtLeastOneChange:0,
  remainingUnchangedProbability:1,model:'EXPLICIT_TIME_INVARIANT_ASSUMPTION',empiricallyCalibrated:false};
 const L=halfLifeDays??config.halfLifeDays,a=acceleration??config.acceleration;
 requireThat(Number.isFinite(L)&&L>=0.1&&L<=365000&&Number.isFinite(a)&&a>=0&&a<=2,'Invalid change-rate parameters');
 const units=d/L,hazard=Math.LN2*(units+0.5*a*units*units);
 const p=-Math.expm1(-hazard);
 return {profile,ageDays:rounded(d),rateScaleDays:L,acceleration:a,
  cumulativeHazard:rounded(Math.min(hazard,1e15)),pAtLeastOneChange:rounded(Math.min(1,Math.max(0,p))),
  remainingUnchangedProbability:rounded(Math.exp(-hazard)),
  model:'NONHOMOGENEOUS_POISSON_AT_LEAST_ONE_RELEVANT_CHANGE',empiricallyCalibrated:false};
}
function checkReceiptShape(r){
 requireThat(r&&r.schema===TEMPORAL_SCHEMA&&validScope(r.scope)&&validNode(r.nodeId)&&
  ['classify','check'].includes(r.action)&&Object.hasOwn(TEMPORAL_PROFILES,r.profile),'Invalid temporal receipt');
 parseTime(r.at);
 requireThat(typeof r.reason==='string'&&r.reason.trim()===r.reason&&r.reason.length>=8&&r.reason.length<=320&&!/[\x00-\x1f]/.test(r.reason),'Explain temporal assessment');
 requireThat(r.operatorDeclared===true&&r.worldFactCertified===false&&r.updatesEvidenceLedger===false,'Temporal research cannot become testimony');
 if(r.action==='check'){
  requireThat(['unchanged','changed','inconclusive'].includes(r.outcome)&&
   typeof r.sourceReference==='string'&&r.sourceReference.length>=8&&r.sourceReference.length<=320&&
   r.sourceReference.trim()===r.sourceReference,'Recheck requires declared result and reference');
 }else requireThat(r.outcome===null&&r.sourceReference===null,'Classification cannot reset a check');
 return r;
}
export async function temporalReceipt(scope,{nodeId,profile,action='classify',reason,outcome=null,sourceReference=null},at=new Date().toISOString()){
 const body={schema:TEMPORAL_SCHEMA,scope,nodeId,profile,action,reason,outcome,sourceReference,at,
  operatorDeclared:true,worldFactCertified:false,updatesEvidenceLedger:false};
 checkReceiptShape(body);
 return {id:await sha(body),...body};
}
export async function auditTemporalReceipts(records,scope,knownNodes=null){
 requireThat(validScope(scope)&&Array.isArray(records)&&records.length<=MAX_TEMPORAL_EVENTS,'Invalid temporal history');
 const ids=new Set();
 for(const r of records){
  checkReceiptShape(r);requireThat(r.scope===scope&&!ids.has(r.id),'Cross-scope or duplicated temporal event');
  if(knownNodes)requireThat(knownNodes.has(r.nodeId),'Temporal annotation for unknown graph node');
  const {id,...body}=r;requireThat(id===await sha(body),'Temporal history hash mismatch');ids.add(id);
 }
 return records;
}
/** Rebuild the latest annotation for each immutable claim/source. Reclassification never
 * changes the last actual *operator-declared* unchanged check date.
 */
export function temporalProjection(nodes,records,{now=Date.now(),defaultProfile='ordinary'}={}){
 requireThat(nodes instanceof Map&&Array.isArray(records)&&Number.isFinite(now)&&
  Object.hasOwn(TEMPORAL_PROFILES,defaultProfile),'Invalid projection');
 const byNode=new Map();
 for(const r of [...records].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||a.id.localeCompare(b.id))){
  checkReceiptShape(r);if(Date.parse(r.at)>now+60000)fail('Temporal annotation dated in future');
  requireThat(nodes.has(r.nodeId),'Orphaned temporal record');
  const old=byNode.get(r.nodeId)||{profile:defaultProfile,checks:[],assessment:null};
  old.profile=r.profile;
  if(r.action==='check'){
   old.checks.push(r);
   if(r.outcome==='unchanged')old.assessment=r;
  }
  byNode.set(r.nodeId,old);
 }
 const results=[];
 for(const n of nodes.values()){
  if(n.kind!=='claim'&&n.kind!=='source')continue;
  const r=byNode.get(n.id),profile=r?.profile??defaultProfile;
  const mostRecent=r?.checks?.at(-1)||null;
  // An imported source's RECEIPT date is not the remote claim's verification time.
  const anchor=r?.assessment?.at??(n.kind==='claim'?n.createdAt:null);
  const anchorKind=r?.assessment?'OPERATOR_ATTESTED_RECHECK':n.kind==='claim'?'LOCAL_ASSERTION_DATE_NOT_VERIFICATION':'NO_INDEPENDENT_CHECK_ANCHOR';
  const changedAfterAnchor=mostRecent?.outcome==='changed'&&(!r.assessment||Date.parse(mostRecent.at)>=Date.parse(r.assessment.at));
  const risk=anchor!==null?presumedDelta({since:anchor,now,profile}):null;
  let status;
  if(changedAfterAnchor)status='RECHECK_REPORTED_CHANGE';
  else if(anchor===null)status='UNKNOWN_NOT_CHECKED';
  else if(risk.pAtLeastOneChange>=0.8)status='HIGH_RECHECK_PRIORITY';
  else if(risk.pAtLeastOneChange>=0.4)status='RECHECK_SUGGESTED';
  else status=profile==='invariant'?'INVARIANT_BY_EXPLICIT_ASSUMPTION':'LOWER_MODELED_CHANGE_RISK';
  results.push({nodeId:n.id,kind:n.kind,statement:n.kind==='claim'?n.content:n.content.statement,
   profile,anchorAt:anchor,anchorKind,latestReviewOutcome:mostRecent?.outcome??null,status,
   model:risk,sourceTruthVerifiedBySoftware:false,modelRatesEmpiricallyCalibrated:false});
 }
 results.sort((a,b)=>{
  const priority=x=>x.status==='RECHECK_REPORTED_CHANGE'?4:x.status==='UNKNOWN_NOT_CHECKED'?3:x.status==='HIGH_RECHECK_PRIORITY'?2:x.status==='RECHECK_SUGGESTED'?1:0;
  return priority(b)-priority(a)||(b.model?.pAtLeastOneChange??0)-(a.model?.pAtLeastOneChange??0)||a.nodeId.localeCompare(b.nodeId);
 });
 return {schema:'motif.collective011.temporal-projection.v1',asOf:new Date(now).toISOString(),
  records:results,unknownCount:results.filter(x=>x.status==='UNKNOWN_NOT_CHECKED').length,
  priorityCount:results.filter(x=>['RECHECK_REPORTED_CHANGE','HIGH_RECHECK_PRIORITY'].includes(x.status)).length,
  estimatedChangeIsNotFalsehood:true,automaticFactPromotion:false,automaticRemoteCheck:false};
}
/** An unchanged ledger/strategy can still age. Crossing a threshold raises review, not falsity. */
export function strategyTimeReview(projection,threshold=0.8){
 requireThat(Number.isFinite(threshold)&&threshold>0&&threshold<1,'Invalid temporal review threshold');
 const affected=projection.records.filter(r=>r.status==='RECHECK_REPORTED_CHANGE'||
  r.status==='UNKNOWN_NOT_CHECKED'||(r.model&&r.model.pAtLeastOneChange>=threshold));
 return {needsReview:affected.length>0,affectedNodeIds:affected.map(x=>x.nodeId),
  reason:'TIME_CAN_CHANGE_WORLD_STATE_WITHOUT_NEW_LEDGER_EVENTS',
  notAnAssertionOfFalsity:true,automatedExternalChecks:0};
}
