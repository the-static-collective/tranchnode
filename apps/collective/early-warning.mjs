/** COLLECTIVE-015 — combined weak-signal early-warning research.
 * We predict a FUTURE CHECK REPORT on a selected target, not the unknown
 * moment a real-world regime changes. No peer requests or ledger mutations.
 * Temporal leakage protection: forecast at bin t only sees indicators <=t;
 * trained examples have labels at <=t-embargo. Missing != unchanged.
 */
import {sha} from './kernel.mjs';
import {checkBuckets} from './regime-forecast.mjs';
import {MS_DAY} from './temporal.mjs';
export const EARLY_SCHEMA='motif.collective015.early-warning.v1';
export const EARLY_RECEIPT_SCHEMA='motif.collective015.early-receipt.v1';
export const EARLY_RUN_CAP=96;
const NODE=/^sha256:[0-9a-f]{64}$/;
const SCOPE=/^local:node:[0-9a-f]{64}$/;
const assert=(x,m)=>{if(!x)throw Error(m);};
const clamp=(v,min=.04,max=.96)=>Math.max(min,Math.min(max,v));
const round=v=>v===null?null:Number(v.toFixed(6));
const sigmoid=x=>1/(1+Math.exp(-Math.max(-30,Math.min(30,x))));
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;

// The canonical kernel excludes fractional numbers. Encode them deterministically
// before hashing receipts, without rounding the published scores themselves.
function hashable(x){
 if(typeof x==='number'&&!Number.isSafeInteger(x)){
  assert(Number.isFinite(x),'Non-finite estimate');return ['decimal-number',x.toString()];
 }
 if(Array.isArray(x))return x.map(hashable);
 if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([key,val])=>[key,hashable(val)]));
 return x;
}

const loss=(p,y)=>(p-y)**2;
const atUTC=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(Date.parse(x)).toISOString()===x;
function buckets(records,node,binDays,now){
 const o=checkBuckets({records,nodeId:node,binDays,now});
 return {map:new Map(o.bins.map(b=>[b.index,b.rate])),bins:o.bins,receiptIds:o.usedCheckReceiptIds,missing:o.unobservedBins,echoes:o.duplicateReferencesDropped};
}
/** All features are calculated at a single *frozen decision time* t.
 * Don't impute empty calendar intervals as zero change. Require at least one
 * check in the last two bins for each indicator, and >=2 recent checks.
 */
export function signalFeatures(at,series,{sourceNodes,leadBins=1}={}){
 assert(Number.isInteger(at)&&Array.isArray(sourceNodes)&&sourceNodes.length>=2&&sourceNodes.length<=4,'Invalid features');
 const target=series.get('target'),targetHistory=[];
 for(let i=at-11;i<=at;i++)if(target.has(i))targetHistory.push(target.get(i));
 if(targetHistory.length<5)return null;
 const features=[1],signals=[];
 for(const node of sourceNodes){
  const view=series.get(node);
  if(!(view instanceof Map))return null;
  const recent=[];
  for(let i=at-3;i<=at;i++)if(view.has(i))recent.push(view.get(i));
  if(recent.length<2||!([...view.keys()].some(k=>k>=at-1&&k<=at)))return null;
  const past=[];
  for(let i=at-11;i<=at-4;i++)if(view.has(i))past.push(view.get(i));
  if(past.length<3)return null;
  const level=mean(recent),prior=mean(past),velocity=level-prior;
  // Weak rises alone need not be predictive; cross-products allow conjunction.
  const anomaly=Math.max(0,Math.min(1,(velocity+.2)*1.5));
  signals.push({node,rate:round(level),prior:round(prior),velocity:round(velocity),weakAlert:velocity>.08});
  features.push(level,velocity,anomaly);
 }
 for(let i=0;i<signals.length;i++)for(let j=i+1;j<signals.length;j++){
  features.push(signals[i].rate*signals[j].rate);
 }
 const targetRecent=mean(targetHistory.slice(-Math.min(6,targetHistory.length)));
 features.push(targetRecent);
 return {features,signals,targetRecent:round(targetRecent),cooccurrence:signals.filter(s=>s.weakAlert).length>=2,leadBins};
}
function targetBaseline(target,at){
 const all=[...target].filter(([i])=>i<=at).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
 if(all.length<5)return null;
 const history=all.slice(-10);
 const ewma=history.reduce((p,y)=>.3*y+.7*p,.5);
 return {constant:clamp((all.reduce((x,y)=>x+y,0)+1)/(all.length+2)),ewma:clamp(ewma)};
}
/** One-sided Page-style CUSUM reference detector on TARGET-only check reports.
 * This is a classical, explicitly fixed change-point alarm, not a probability
 * and not a causal forecast. Reference mean uses only the first 20 earlier bins.
 */
export function targetCusum(target,at,{reference=20,slack=.10,threshold=2.5}={}){
 const observations=[...target].filter(([i])=>i<=at).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
 if(observations.length<reference+6)return null;
 const p0=(observations.slice(0,reference).reduce((a,b)=>a+b,0)+1)/(reference+2);
 let statistic=0;
 for(const y of observations.slice(reference))statistic=Math.max(0,statistic+y-p0-slack);
 return {referenceMean:round(p0),oneSidedStatistic:round(statistic),threshold,
   reviewAlarm:statistic>=threshold,kind:'TARGET_ONLY_POSITIVE_CUSUM_DIAGNOSTIC'};
}
/** Sequentially fitted regularized logistic model; no promise of probabilities
 * being calibrated. Every coefficient sees only resolved training labels.
 */
function fitLogistic(samples,dims){
 const w=Array(dims).fill(0);
 if(samples.length<20)return null;
 const ybar=(samples.reduce((s,x)=>s+x.y,0)+1)/(samples.length+2);
 w[0]=Math.log(ybar/(1-ybar));
 // Deterministic batch gradient descent, ridge penalty (except intercept).
 for(let epoch=0;epoch<300;epoch++){
  const gradients=Array(dims).fill(0);
  for(const s of samples){const p=sigmoid(w.reduce((sum,v,j)=>sum+v*s.x[j],0));
   for(let j=0;j<dims;j++)gradients[j]+=(p-s.y)*s.x[j];}
  for(let j=0;j<dims;j++)w[j]-=.3*(gradients[j]/samples.length+(j===0?0:.01*w[j]));
 }
 return w;
}
export function forecastEarlyWarning({records,targetNode,sourceNodes,binDays=7,leadBins=1,gapBins=1,now=Date.now(),maxForecasts=30}){
 assert(Array.isArray(records)&&records.length<=4096&&NODE.test(targetNode)&&
  Array.isArray(sourceNodes)&&sourceNodes.length>=2&&sourceNodes.length<=4&&
  sourceNodes.every(n=>NODE.test(n)&&n!==targetNode)&&new Set(sourceNodes).size===sourceNodes.length,
  'Choose one target and 2–4 distinct indicator relations');
 assert([1,7,14,30].includes(binDays)&&Number.isInteger(leadBins)&&leadBins>=1&&leadBins<=4&&
  Number.isInteger(gapBins)&&gapBins>=1&&gapBins<=4&&Number.isFinite(now)&&now>=0&&
  Number.isInteger(maxForecasts)&&maxForecasts>=1&&maxForecasts<=40,'Invalid chronology or forecast parameters');
 const relevant=[targetNode,...sourceNodes],data=new Map(relevant.map(n=>[n,buckets(records,n,binDays,now)]));
 const series=new Map([['target',data.get(targetNode).map],...sourceNodes.map(n=>[n,data.get(n).map])]);
 const indices=[...data.get(targetNode).map.keys()].sort((a,b)=>a-b),observedEnd=Math.floor(now/(binDays*MS_DAY));
 const earliest=Math.min(...relevant.flatMap(n=>[...data.get(n).map.keys()]));
 if(!Number.isFinite(earliest))return {schema:EARLY_SCHEMA,status:'NO_CHECK_HISTORY',forecast:null,evaluation:null,
   targetNode,sourceNodes,binDays,leadBins,gapBins,informationLeakageControlled:true,
   absenceNotNegativeEvidence:true,worldTruthCertified:false,automaticExternalActions:0};
 const last=Math.max(...indices,earliest),latestT=Math.min(last,observedEnd);
 const forecastAgeBins=observedEnd-latestT;
 // Keep research responsive on modest phones: bound historical calendar search.
 const historyWindowStart=Math.max(earliest,latestT-127);
 const periods=[];
 // Need >=12 calendar bins of history before an early-warning decision.
 for(let t=historyWindowStart+14;t<=latestT;t++){
  const current=signalFeatures(t,series,{sourceNodes,leadBins}),base=targetBaseline(series.get('target'),t);
  if(!current||!base)continue;
  const samples=[];
  for(let s=historyWindowStart+12;s+leadBins<=t-gapBins;s++){
   if(!series.get('target').has(s+leadBins))continue;
   const x=signalFeatures(s,series,{sourceNodes,leadBins});if(!x)continue;
   samples.push({x:x.features,y:series.get('target').get(s+leadBins),at:s,targetAt:s+leadBins});
  }
  const weights=fitLogistic(samples,current.features.length);
  const model=weights?clamp(sigmoid(weights.reduce((a,w,j)=>a+w*current.features[j],0))):null;
  const future=t+leadBins;
  const result={decisionBin:t,targetBin:future,trainingCount:samples.length,
   cusum:targetCusum(series.get('target'),t),
   latestTrainingLabelBin:samples.at(-1)?.targetAt??null,
   signal:current.signals,cooccurrence:current.cooccurrence,
   model:round(model),ewma:round(base.ewma),constant:round(base.constant),
   decision:'REVIEW_ONLY',futureObserved:series.get('target').has(future)?series.get('target').get(future):null};
  assert(result.latestTrainingLabelBin===null||result.latestTrainingLabelBin<=t-gapBins,'Future-label leakage');
  periods.push(result);
 }
 const evaluated=periods.filter(r=>r.futureObserved!==null&&r.model!==null);
 const holdout=evaluated.slice(-maxForecasts);
 const report=holdout.length>=8?{
  checkedTargets:holdout.length,
  modelBrier:round(mean(holdout.map(r=>loss(r.model,r.futureObserved)))),
  ewmaBrier:round(mean(holdout.map(r=>loss(r.ewma,r.futureObserved)))),
  constantBrier:round(mean(holdout.map(r=>loss(r.constant,r.futureObserved)))),
  modelImprovementVsEWMA:round(mean(holdout.map(r=>loss(r.ewma,r.futureObserved)-loss(r.model,r.futureObserved)))),
  modelImprovementVsConstant:round(mean(holdout.map(r=>loss(r.constant,r.futureObserved)-loss(r.model,r.futureObserved)))),
  positiveChecks:holdout.filter(r=>r.futureObserved>=.5).length,
  evaluatedBins:holdout.map(r=>r.targetBin),
  trainingIsAlwaysEarlier:true,
  warning:'Multiple checks from one source may still be correlated. Report dates are not change-onset dates.'
 }:null;
 // Propose a nowcast with latest known indicators, never use a FUTURE label.
 const recent=signalFeatures(latestT,series,{sourceNodes,leadBins});
 const nowPeriod=periods.findLast(x=>x.decisionBin===latestT)??null;
 const modelBetter=report&&report.modelImprovementVsEWMA>0;
 const forecast=nowPeriod&&nowPeriod.model!==null?{
  ...nowPeriod,
  targetCheckedInFuture:nowPeriod.futureObserved!==null,
  proposedProbability:round(modelBetter?nowPeriod.model:nowPeriod.ewma),
  selectedPolicy:modelBetter?'HELDOUT_FAVORS_COMBINED_MODEL':'CONSERVATIVE_EWMA_BASELINE',
  alertSuggested:!!(modelBetter&&nowPeriod.model>=.65&&nowPeriod.model-nowPeriod.ewma>=.08),
  warning:report?'Past heldout performance is retrospective and may not persist':'Insufficient held-out evidence'
 }:null;
 const shared=[];
 // Duplicate declared source references can masquerade as independent indicators.
 for(let i=0;i<sourceNodes.length;i++)for(let j=i+1;j<sourceNodes.length;j++){
  const refs=new Set(records.filter(r=>r.nodeId===sourceNodes[i]&&r.action==='check').map(r=>r.sourceReference));
  if(records.some(r=>r.nodeId===sourceNodes[j]&&r.action==='check'&&refs.has(r.sourceReference)))shared.push([sourceNodes[i],sourceNodes[j]]);
 }
 return {schema:EARLY_SCHEMA,status:!report?'INSUFFICIENT_HELDOUT_EVIDENCE':
  report.modelImprovementVsEWMA<0?'COMBINED_MODEL_UNDERPERFORMS':'EXPLORATORY_WARNING_AVAILABLE',
  targetNode,sourceNodes,binDays,leadBins,gapBins,asOf:new Date(now).toISOString(),forecastAgeBins,
  lastTargetCheckedBin:latestT,predictedFutureReportBin:latestT+leadBins,trainingWindowMaxCalendarBins:128,
  forecast,evaluation:report,weakSignalCount:recent?.signals.filter(s=>s.weakAlert).length??0,
  overlappingDeclaredReferencePairs:shared,provenanceReceipts:relevant.map(n=>({nodeId:n,checks:data.get(n).receiptIds,
   omittedUnknownBins:data.get(n).missing,identicalReferencesExcluded:data.get(n).echoes})),
  backtest:holdout.slice(-16),
  forecastNotCurrentIfOlderThanTwoBins:forecastAgeBins>2,
  researchOnly:true,probabilitiesIndependentlyCalibrated:false,individualChangeOnsetsKnown:false,
  sourceIndependenceVerified:false,causalityEstablished:false,worldTruthCertified:false,
  automaticExternalActions:0,automaticEvidenceAdmissions:0,absenceNotNegativeEvidence:true,
  informationLeakageControlled:true};
}
export async function makeEarlyReceipt(scope,{scan,sourceHead,temporalHead}){
 assert(SCOPE.test(scope)&&scan?.schema===EARLY_SCHEMA&&scan.researchOnly===true&&scan.worldTruthCertified===false&&
  scan.automaticExternalActions===0&&typeof temporalHead==='string'&&
  (sourceHead===null||typeof sourceHead==='string'),'Invalid early-warning research receipt');
 const body={schema:EARLY_RECEIPT_SCHEMA,scope,at:new Date().toISOString(),sourceHead,temporalHead,
  scan,noAutomaticEvidenceAdoption:true,independenceUnverified:true};
 return {id:await sha(hashable(body)),...body};
}
export async function auditEarlyReceipts(records,scope){
 assert(SCOPE.test(scope)&&Array.isArray(records)&&records.length<=EARLY_RUN_CAP,'Early-warning history cap');
 const seen=new Set();
 for(const r of records){
  assert(r?.schema===EARLY_RECEIPT_SCHEMA&&r.scope===scope&&!seen.has(r.id)&&atUTC(r.at)&&
   r.scan?.schema===EARLY_SCHEMA&&r.scan.researchOnly&&r.scan.worldTruthCertified===false&&
   r.scan.automaticExternalActions===0&&r.noAutomaticEvidenceAdoption&&r.independenceUnverified,'Invalid early-warning receipt');
  const {id,...body}=r;assert(id===await sha(hashable(body)),'Early-warning receipt digest mismatch');seen.add(id);
 }
 return records;
}
