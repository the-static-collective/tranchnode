/** COLLECTIVE-014 — regime-of-change research, inspired by quantitative forecasting.
 * This forecasts FUTURE CHECK REPORTS, not world states or financial prices.
 * A check timestamp is not an event-onset timestamp.
 */
import {sha} from './kernel.mjs';
import {MS_DAY} from './temporal.mjs';
export const REGIME_SCHEMA='motif.collective014.regime-forecast.v1';
export const REGIME_RECEIPT_SCHEMA='motif.collective014.regime-receipt.v1';
export const REGIME_RUN_CAP=96;
const assert=(x,m)=>{if(!x)throw Error(m)};
const isNode=x=>typeof x==='string'&&/^sha256:[0-9a-f]{64}$/.test(x);
const isScope=x=>typeof x==='string'&&/^local:node:[0-9a-f]{64}$/.test(x);
const round=x=>x===null?null:Number(x.toFixed(6));
const clamp=(x,min=.04,max=.96)=>Math.max(min,Math.min(max,x));
const mean=x=>x.length?x.reduce((a,b)=>a+b,0)/x.length:null;
const variance=x=>x.length>=2?mean(x.map(v=>(v-mean(x))**2)):null;
const atUTC=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString()===x;
const pOrNull=x=>x===null?null:round(x);
const validBins=new Set([1,7,14,30]);
function hashable(x){
 if(typeof x==='number'&&!Number.isSafeInteger(x)){assert(Number.isFinite(x),'Nonfinite forecast');return ['decimal-number',x.toString()];}
 if(Array.isArray(x))return x.map(hashable);
 if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,hashable(v)]));
 return x;
}
/** Calendar buckets; NEVER fill unobserved time with unchanged reports.
 * Exact repeated source references are de-duplicated, but independent provenance
 * is not verified: different strings may refer to the same evidence source.
 */
export function checkBuckets({records,nodeId,binDays=7,now=Date.now()}){
 assert(isNode(nodeId)&&validBins.has(binDays),'Invalid node or bucket width');
 assert(Array.isArray(records)&&records.length<=4096&&Number.isFinite(now)&&now>=0,'Invalid check history');
 const grouped=new Map(),references=new Set(),used=[];
 let inconclusive=0,duplicateRefs=0,futureRejected=0;
 const selected=records.filter(r=>r?.nodeId===nodeId&&r.action==='check')
  .sort((a,b)=>String(a.at).localeCompare(String(b.at))||String(a.id).localeCompare(String(b.id)));
 for(const r of selected){
  assert(atUTC(r.at)&&['changed','unchanged','inconclusive'].includes(r.outcome),'Invalid check report');
  if(Date.parse(r.at)>now+60000){futureRejected++;continue;}
  if(r.outcome==='inconclusive'){inconclusive++;continue;}
  assert(typeof r.sourceReference==='string'&&r.sourceReference.length>=8,'Missing check provenance');
  if(references.has(r.sourceReference)){duplicateRefs++;continue;}
  references.add(r.sourceReference);
  const index=Math.floor(Date.parse(r.at)/(binDays*MS_DAY));
  if(!grouped.has(index))grouped.set(index,{index,changed:0,unchanged:0,receiptIds:[]});
  const g=grouped.get(index);g[r.outcome]++;g.receiptIds.push(r.id);used.push(r.id);
 }
 const bins=[...grouped.values()].sort((a,b)=>a.index-b.index).map(g=>({
  ...g,checked:g.changed+g.unchanged,rate:round(g.changed/(g.changed+g.unchanged)),
  at:new Date(g.index*binDays*MS_DAY).toISOString()
 }));
 const span=bins.length?bins.at(-1).index-bins[0].index+1:0;
 return {bins,reportCount:used.length,usedCheckReceiptIds:used,
  inconclusive,duplicateReferencesDropped:duplicateRefs,futureReportsRejected:futureRejected,
  unobservedBins:span-bins.length,spanBins:span,binDays,
  missingMeansUnknown:true,reportDatesAreNotEventOnsets:true,independenceVerified:false};
}
/** Fixed forecaster: fast/slow EWMA, threshold-switch momentum regime. Not fitted
 * on holdout labels. Expanding Beta(1,1) rate is the equal-information baseline.
 */
export function forecastFromPast(history){
 assert(Array.isArray(history)&&history.every(b=>Number.isSafeInteger(b.index)&&Number.isInteger(b.checked)&&b.checked>0&&
  Number.isInteger(b.changed)&&b.changed>=0&&b.changed<=b.checked),'Invalid past check buckets');
 if(!history.length)return {adaptive:.5,baseline:.5,fast:.5,slow:.5,momentum:0,variant:'NO_HISTORY'};
 let fast=.5,slow=.5,changed=0,checked=0;
 const ordered=[...history].sort((a,b)=>a.index-b.index);
 let previous=ordered[0].index-1;
 for(const b of ordered){
  const skipped=Math.min(300,Math.max(0,b.index-previous-1));
  fast=slow+(fast-slow)*Math.pow(.7,skipped);
  const fraction=b.changed/b.checked;
  fast=.42*fraction+.58*fast;
  slow=.12*fraction+.88*slow;
  changed+=b.changed;checked+=b.checked;previous=b.index;
 }
 const baseline=(changed+1)/(checked+2),momentum=fast-slow;
 const active=ordered.length>=6&&Math.abs(momentum)>.10;
 const adaptive=clamp(active?fast:slow);
 return {adaptive:round(adaptive),baseline:round(baseline),fast:round(fast),slow:round(slow),
  momentum:round(momentum),variant:active?'MOMENTUM_REGIME':'SMOOTHED_LEVEL'};
}
const loss=(p,b)=>(b.changed*(1-p)**2+(b.checked-b.changed)*p**2);
function pearson(a,b){const ma=mean(a),mb=mean(b);const x=a.map((v,i)=>(v-ma)*(b[i]-mb)).reduce((s,v)=>s+v,0);
 const da=a.reduce((s,v)=>s+(v-ma)**2,0),db=b.reduce((s,v)=>s+(v-mb)**2,0);
 return da>0&&db>0?x/Math.sqrt(da*db):null;}
/** Exploratory patterns of rates, not established seasonality or real changes.
 * Rate shifts and variance comparison require uninterrupted recent calendar bins.
 */
export function regimeFeatures(bins){
 const last=bins.slice(-12).map(b=>b.rate);
 const recent=last.slice(-4),prior=last.slice(-8,-4),earlier=last.slice(-12,-8);
 const consecutive=n=>bins.length>=n&&bins.slice(-n).every((b,i,arr)=>i===0||b.index===arr[i-1].index+1);
 const valid8=consecutive(8),valid12=consecutive(12);
 const velocity=valid8?mean(recent)-mean(prior):null;
 const oldVelocity=valid12?mean(prior)-mean(earlier):null;
 const acceleration=velocity!==null&&oldVelocity!==null?velocity-oldVelocity:null;
 const recentVariance=valid8?variance(recent):null,priorVariance=valid8?variance(prior):null;
 const varianceRatio=recentVariance!==null&&priorVariance!==null?(recentVariance+.01)/(priorVariance+.01):null;
 const rateMomentum=velocity===null?'INSUFFICIENT_CHECKED_BINS':velocity>.15?'RISING_REPORTED_CHANGE_RATE':velocity<-.15?'FALLING_REPORTED_CHANGE_RATE':'NO_STRONG_RATE_SHIFT';
 const activity=varianceRatio!==null&&varianceRatio>=2.5&&recentVariance>=.02?'VOLATILITY_CLUSTER_CANDIDATE':'NO_VOLATILITY_ALERT';
 const index=new Map(bins.map(b=>[b.index,b.rate]));let cycle=null;
 for(let lag=2;lag<=6;lag++){
  const left=[],right=[];
  for(const b of bins){if(index.has(b.index-lag)){left.push(index.get(b.index-lag));right.push(b.rate);}}
  if(left.length<12)continue;
  const correlation=pearson(left,right);
  if(correlation!==null&&correlation>.65&&(!cycle||correlation>cycle.correlation))
   cycle={lagBins:lag,pairs:left.length,correlation:round(correlation),hypothesisOnly:true,needsIndependentHoldout:true};
 }
 return {rateMomentum,velocity:pOrNull(velocity),acceleration:pOrNull(acceleration),
  varianceRatio:pOrNull(varianceRatio),activity,cycle,
  seasonalSignalNotConfirmed:true,clusteringNotCausality:true,
  skippedRateShiftForSparseCalendar:bins.length>=8&&!valid8};
}
/** Chronological walk-forward with embargo gap: no target or future data in training.
 * Brier score counts conclusive checks, not invented missing negatives.
 */
export function fitRegime({records,nodeId,binDays=7,now=Date.now(),gapBins=1,holdoutFraction=.25}){
 assert(Number.isInteger(gapBins)&&gapBins>=0&&gapBins<=4,'Gap must be 0–4 bins');
 assert(Number.isFinite(holdoutFraction)&&holdoutFraction>=.2&&holdoutFraction<=.5,'Invalid holdout fraction');
 const buckets=checkBuckets({records,nodeId,binDays,now}),bins=buckets.bins;
 const heldout=Math.max(1,Math.floor(bins.length*holdoutFraction)),start=bins.length-heldout;
 let sumAdaptive=0,sumBaseline=0,count=0,holdoutBinsScored=0;
 const chronology=[];
 for(let i=Math.max(start,0);i<bins.length;i++){
  const target=bins[i];
  const train=bins.slice(0,i).filter(b=>b.index<=target.index-gapBins-1);
  if(train.length<8)continue;
  const forecast=forecastFromPast(train);
  sumAdaptive+=loss(forecast.adaptive,target);sumBaseline+=loss(forecast.baseline,target);
  count+=target.checked;holdoutBinsScored++;
  chronology.push({bucket:target.index,knownTrainingBins:train.length,targetCheckCount:target.checked,
   forecast:forecast.adaptive,baseline:forecast.baseline,observedRate:target.rate});
 }
 const coverage=bins.length>=2?bins.length/(bins.at(-1).index-bins[0].index+1):null;
 const features=regimeFeatures(bins),latest=forecastFromPast(bins);
 const evaluation=count>=6&&holdoutBinsScored>=4?{
  observations:count,bins:holdoutBinsScored,gapBins,
  adaptiveBrier:round(sumAdaptive/count),baselineBrier:round(sumBaseline/count),
  improvement:round((sumBaseline-sumAdaptive)/count),
  rule:'Frozen hyperparameters, chronological expanding walk-forward, strictly earlier checked bins'
 }:null;
 const age=bins.length?Math.floor(now/(binDays*MS_DAY))-bins.at(-1).index:null;
 const status=bins.length<16?'INSUFFICIENT_CHECKED_HISTORY':
  !evaluation?'AWAIT_HELDOUT_CHECKS':evaluation.improvement<-.00001?'HELDOUT_WORSE_THAN_BASELINE':
  'EXPLORATORY_FORECAST_AVAILABLE';
 const warnings=[];
 if(features.rateMomentum!=='NO_STRONG_RATE_SHIFT'&&features.rateMomentum!=='INSUFFICIENT_CHECKED_BINS')warnings.push(features.rateMomentum);
 if(features.activity==='VOLATILITY_CLUSTER_CANDIDATE')warnings.push(features.activity);
 if(features.cycle)warnings.push('PERIODICITY_CANDIDATE_NOT_VALIDATED');
 if(age!==null&&age>2)warnings.push('LAST_CHECK_BUCKET_IS_STALE');
 if(coverage!==null&&coverage<.5)warnings.push('SPARSE_CHECKING_CAN_BIAS_FORECAST');
 return {schema:REGIME_SCHEMA,nodeId,binDays,asOf:new Date(now).toISOString(),status,
  checkedBins:bins.length,checks:buckets.reportCount,coverageOfSpan:pOrNull(coverage),
  unobservedBins:buckets.unobservedBins,inconclusiveReports:buckets.inconclusive,
  exactEchoesDropped:buckets.duplicateReferencesDropped,futureReportsRejected:buckets.futureReportsRejected,
  latestCheckedBucket:bins.at(-1)?.at??null,ageSinceLastCheckedBins:age,
  nextCheckForecast:bins.length>=16?latest:null,features,warnings,evaluation,
  chronologicalForecasts:chronology.slice(-24),usedCheckReceiptIds:buckets.usedCheckReceiptIds,
  modeling:'FIXED_EWMA_LEVEL_MOMENTUM_AND_TEMPORAL_REGIME_DIAGNOSTICS',
  predicts:'FUTURE_REPORTS_CONDITIONAL_ON_RECHECKS_NOT_WORLD_EVENTS',
  operatorDeclaredChecks:true,independentSourceIdentityVerified:false,
  causalityEstablished:false,realWorldCalibrationEstablished:false,
  automaticExternalActions:0,automaticEvidenceAdmissions:0,worldTruthCertified:false};
}
export function scanRegimes({records,nodes,binDays=7,now=Date.now(),gapBins=1,maxNodes=24}){
 assert(nodes instanceof Map&&Array.isArray(records)&&Number.isInteger(maxNodes)&&maxNodes>=1&&maxNodes<=24,'Invalid source scan');
 const ids=[...nodes.values()].filter(n=>n.kind==='claim'||n.kind==='source').slice(0,maxNodes).map(n=>n.id);
 const results=ids.map(nodeId=>fitRegime({records,nodeId,binDays,now,gapBins}));
 results.sort((a,b)=>b.warnings.length-a.warnings.length||b.checkedBins-a.checkedBins||a.nodeId.localeCompare(b.nodeId));
 return {schema:'motif.collective014.regime-scan.v1',asOf:new Date(now).toISOString(),binDays,gapBins,
  sourceCount:ids.length,results,claimOfCausality:false,automaticResearchContacts:0};
}
export async function makeRegimeReceipt(scope,{result,sourceHead,temporalHead,now=new Date().toISOString()}){
 assert(isScope(scope)&&result?.schema==='motif.collective014.regime-scan.v1'&&atUTC(now)&&
  (sourceHead===null||typeof sourceHead==='string')&&typeof temporalHead==='string','Invalid regime research receipt');
 const body={schema:REGIME_RECEIPT_SCHEMA,scope,at:now,sourceHead,temporalHead,
  result,researchOnly:true,noAutomaticWorldClaims:true,noExternalActions:true};
 return {id:await sha(hashable(body)),...body};
}
export async function auditRegimeReceipts(records,scope){
 assert(isScope(scope)&&Array.isArray(records)&&records.length<=REGIME_RUN_CAP,'Invalid regime receipt log');
 const ids=new Set();
 for(const record of records){
  assert(record?.schema===REGIME_RECEIPT_SCHEMA&&record.scope===scope&&!ids.has(record.id)&&
    record.noAutomaticWorldClaims===true&&record.noExternalActions===true&&record.researchOnly===true&&
    record.result?.schema==='motif.collective014.regime-scan.v1'&&record.result.results?.length<=24,
   'Invalid research receipt scope or policy');
  const {id,...body}=record;assert(id===await sha(hashable(body)),'Regime receipt hash mismatch');ids.add(id);
 }
 return records;
}
