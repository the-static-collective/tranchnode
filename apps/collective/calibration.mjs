/** COLLECTIVE-010 — score probability forecasts against *separate* labeled resolutions.
 * A resolution is a HUMAN-DECLARED reference, never inferred from peer consensus.
 * No claim is made that the referenced source was independently verified by code.
 * Nothing here writes to the accepted evidence ledger or sends a network message.
 */
import {sha,statement} from './kernel.mjs';
export const RESOLUTION_SCHEMA='motif.collective010.resolution.v1';
export const MAX_RESOLUTIONS=2048;
export const DEFAULT_MIN_GROUPS=8;
const TYPES=new Set(['independent_measurement','documented_third_party','sealed_benchmark']);
const OUTCOMES=new Set(['supports','denies','inconclusive']);
const validKey=x=>typeof x==='string'&&/^[a-zA-Z0-9_.:-]{3,80}$/.test(x);
const validTag=x=>typeof x==='string'&&/^[a-z][a-z0-9_-]{2,31}$/.test(x);
const strictDate=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(x)&&Number.isFinite(Date.parse(x));
function requireThat(ok,msg){if(!ok)throw Error(msg);}
function fixed(n){return Number(n.toFixed(6));}

export function checkResolution(data){
 requireThat(data&&validKey(data.caseId)&&validKey(data.groupId)&&validTag(data.tag),
   'Resolution needs distinct case, group and question family identifiers');
 statement(data.question?.from,data.question?.to,'supports');
 requireThat(OUTCOMES.has(data.outcome)&&TYPES.has(data.method), 'Unknown independent-check method or outcome');
 requireThat(typeof data.sourceReference==='string'&&data.sourceReference.trim()===data.sourceReference&&
   data.sourceReference.length>=8&&data.sourceReference.length<=320&&!/[\u0000-\u001f]/.test(data.sourceReference),
  'Provide an external experiment, measurement, DOI, archived record, or sealed oracle reference (8–320 chars)');
 return data;
}
export async function makeResolutionReceipt(scope,data,at=new Date().toISOString()){
 requireThat(typeof scope==='string'&&/^local:node:[0-9a-f]{64}$/.test(scope)&&strictDate(at), 'Invalid local calibration scope or time');
 const checked=checkResolution(data);
 const body={schema:RESOLUTION_SCHEMA,scope,at,
   caseId:checked.caseId,groupId:checked.groupId,tag:checked.tag,
   question:{from:checked.question.from,to:checked.question.to},
   outcome:checked.outcome,method:checked.method,sourceReference:checked.sourceReference,
   independentCheck:'USER_DECLARED_NOT_AUTOMATICALLY_VERIFIED',
   peerAgreementIsNotGroundTruth:true,worldFactCertified:false,
   importedIntoEvidenceLedger:false,automaticExternalActions:0};
 return {id:await sha(body),...body};
}
export async function auditResolutionReceipts(records,scope){
 requireThat(Array.isArray(records)&&records.length<=MAX_RESOLUTIONS,'Resolution history capacity reached');
 const ids=new Set(),caseIds=new Set();
 for(const r of records){
  requireThat(r?.schema===RESOLUTION_SCHEMA&&r.scope===scope&&strictDate(r.at)&&
    r.independentCheck==='USER_DECLARED_NOT_AUTOMATICALLY_VERIFIED'&&
    r.peerAgreementIsNotGroundTruth===true&&r.worldFactCertified===false&&
    r.importedIntoEvidenceLedger===false&&r.automaticExternalActions===0,
    'Invalid or misrepresented resolution receipt');
  checkResolution(r);
  requireThat(typeof r.id==='string'&&!ids.has(r.id)&&!caseIds.has(r.caseId),
    'Duplicate resolution identity or case (do not count repeat claims as cases)');
  const {id,...body}=r;
  requireThat(await sha(body)===id,'Altered resolution receipt digest');
  ids.add(id);caseIds.add(r.caseId);
 }
 return records;
}

/** One counted case per evidence family. If a group has contradictory labels,
 * quarantine that *entire* group; do not silently choose the majority or newest.
 * Group independence is a user declaration, not verified identity independence.
 */
export function independentCases(records,{tag='general',before=Infinity}={}){
 requireThat(Array.isArray(records)&&records.length<=MAX_RESOLUTIONS&&validTag(tag)&&(Number.isFinite(before)||before===Infinity),'Bad calibration filter');
 const byGroup=new Map();
 for(const r of records){
  checkResolution(r);
  const at=Date.parse(r.at);
  requireThat(strictDate(r.at)&&Number.isFinite(at),'Invalid labeled outcome date');
  if(r.tag!==tag||at>=before)continue;
  if(!byGroup.has(r.groupId))byGroup.set(r.groupId,[]);
  byGroup.get(r.groupId).push(r);
 }
 const eligible=[];let echoRemoved=0,conflicted=0;
 for(const group of byGroup.values()){
  const labels=new Set(group.map(r=>r.outcome));
  if(labels.size>1){conflicted++;echoRemoved+=group.length;continue;}
  group.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||a.caseId.localeCompare(b.caseId));
  eligible.push(group[0]);echoRemoved+=group.length-1;
 }
 eligible.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||a.caseId.localeCompare(b.caseId));
 return {cases:eligible,independentGroupsDeclared:eligible.length,echoRemoved,conflictedGroupsHeld:conflicted};
}

/** Beta shrinkage + time decay, separately for answerability and conditional yes.
 * These probabilities model author-supplied resolutions; not verified world truth.
 */
export function fitResolutionPrior(records,{tag='general',now=Date.now(),halfLifeDays=21,
 minGroups=DEFAULT_MIN_GROUPS,priorYes=0.5,priorAnswered=0.85,priorWeight=4}={}){
 requireThat(Number.isFinite(now)&&Number.isFinite(halfLifeDays)&&halfLifeDays>=1&&halfLifeDays<=365&&
  Number.isSafeInteger(minGroups)&&minGroups>=2&&minGroups<=64&&
  [priorYes,priorAnswered].every(p=>typeof p==='number'&&p>=0&&p<=1)&&
  Number.isFinite(priorWeight)&&priorWeight>=2&&priorWeight<=30,'Invalid calibration configuration');
 const selected=independentCases(records,{tag,before:now});
 let answered=0,yes=0,all=0;
 for(const r of selected.cases){
  const ageDays=Math.max(0,(now-Date.parse(r.at))/86400000);
  const weight=Math.exp(-Math.LN2*ageDays/halfLifeDays);
  all+=weight;
  if(r.outcome!=='inconclusive'){
   answered+=weight;
   if(r.outcome==='supports')yes+=weight;
  }
 }
 const pAnswered=(priorWeight*priorAnswered+answered)/(priorWeight+all);
 const pYes=(priorWeight*priorYes+yes)/(priorWeight+answered);
 return {tag,eligible:selected.cases.length>=minGroups,declaredIndependentGroups:selected.cases.length,
  minGroups,echoRemoved:selected.echoRemoved,conflictedGroupsHeld:selected.conflictedGroupsHeld,
  effectiveWeight:fixed(all),answeredWeight:fixed(answered),pYes:fixed(pYes),pAnswered:fixed(pAnswered),
  trainingPolicy:'causal-cutoff, one group once, quarantine mixed labels, Beta shrinkage, exponential recency decay',
  estimateOf:'user-supplied resolution outcomes; not factual certainty',
  independentlyVerifiedBySoftware:false,heldOutValidated:false};
}
function brier(p,y){return (p-y)**2;}
function logLoss(p,y){const safe=Math.max(1e-6,Math.min(1-1e-6,p));return -y*Math.log(safe)-(1-y)*Math.log(1-safe);}
/** True prequential: forecast case i using ONLY cases timestamped BEFORE case i.
 * No current label, current group or later case may enter the prediction.
 */
export function scoreChronological(records,{tag='general',minGroups=DEFAULT_MIN_GROUPS,
  halfLifeDays=21,priorYes=0.5,priorAnswered=0.85}={}){
 // Select the FIRST case in each family at its historical occurrence. Never
 // let a later contradictory echo retroactively choose which older cases exist.
 const observed=[...records].filter(r=>r.tag===tag).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||a.caseId.localeCompare(b.caseId));
 const groupsSeen=new Set(),ledger=[];let echoRemoved=0;
 for(const r of observed){checkResolution(r);
  if(groupsSeen.has(r.groupId)){echoRemoved++;continue;}
  groupsSeen.add(r.groupId);ledger.push(r);
 }
 let countAnswered=0,countSupport=0;
 const loss={answerability:{model:0,baseline:0,modelLog:0,baselineLog:0},
  support:{model:0,baseline:0,modelLog:0,baselineLog:0}};
 const forecasts=[];
 for(const r of ledger){
  const at=Date.parse(r.at),train=observed.filter(x=>Date.parse(x.at)<at&&x.groupId!==r.groupId);
  const fit=fitResolutionPrior(train,{tag,now:at,minGroups,halfLifeDays,priorYes,priorAnswered});
  if(!fit.eligible)continue;
  const yAnswered=Number(r.outcome!=='inconclusive');
  loss.answerability.model+=brier(fit.pAnswered,yAnswered);
  loss.answerability.baseline+=brier(priorAnswered,yAnswered);
  loss.answerability.modelLog+=logLoss(fit.pAnswered,yAnswered);
  loss.answerability.baselineLog+=logLoss(priorAnswered,yAnswered);
  countAnswered++;
  const item={caseId:r.caseId,groupId:r.groupId,pAnswered:fit.pAnswered,actualAnswered:yAnswered,
    pYes:fit.pYes,actualSupports:r.outcome==='inconclusive'?null:Number(r.outcome==='supports'),
    priorCases:train.length,outcome:r.outcome};
  if(r.outcome!=='inconclusive'){
   const y=Number(r.outcome==='supports');
   loss.support.model+=brier(fit.pYes,y);
   loss.support.baseline+=brier(priorYes,y);
   loss.support.modelLog+=logLoss(fit.pYes,y);
   loss.support.baselineLog+=logLoss(priorYes,y);
   countSupport++;
  }
  forecasts.push(item);
 }
 const summary=(bucket,n)=>n?{
  evaluated:n,modelBrier:fixed(bucket.model/n),baselineBrier:fixed(bucket.baseline/n),
  modelLogLoss:fixed(bucket.modelLog/n),baselineLogLoss:fixed(bucket.baselineLog/n),
  brierImprovement:fixed((bucket.baseline-bucket.model)/n)}:
  {evaluated:0,modelBrier:null,baselineBrier:null,modelLogLoss:null,baselineLogLoss:null,brierImprovement:null};
 return {tag,prequential:true,trainedOnlyOnEarlierGroups:true,scoredAgainst:'user-declared externally checked outcomes',
  declaredIndependenceNotVerified:true,firstCaseNeverForecastFromItself:true,
  evaluatedAfterWarmup:countAnswered,heldConflictedGroups:independentCases(records,{tag}).conflictedGroupsHeld,
  discardedEchoes:echoRemoved,
  answered:summary(loss.answerability,countAnswered),supportsConditionalOnAnswer:summary(loss.support,countSupport),
  forecasts};
}

/** Default mode leaves the existing testimony prior untouched. Explicit opt-in is
 * required; fewer than 8 distinct declared cases results in NO profile overrides.
 */
export function calibratedProfiles(plan,records,{tag='general',now=Date.now(),minGroups=DEFAULT_MIN_GROUPS,
  halfLifeDays=21}={}){
 requireThat(plan&&Array.isArray(plan.candidates),'Current Aperture candidates required');
 const fit=fitResolutionPrior(records,{tag,now,minGroups,halfLifeDays});
 const profiles={};
 if(fit.eligible){for(const c of plan.candidates.slice(0,8)){
  statement(c.from,c.to,'supports');
  profiles[JSON.stringify([c.from,c.to])]={pYes:fit.pYes,pAnswered:fit.pAnswered};
 }}
 return {profiles,fit,overrides:Object.keys(profiles).length,
  guarantee:'opt-in author-declared outcome estimate, not an externally certified probability'};
}
