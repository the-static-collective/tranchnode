/** Predeclared, deterministic synthetic challenge. Never evidence of field prediction. */
import {forecastEarlyWarning} from '../apps/collective/early-warning.mjs';
const DAY=86400000,origin=Date.UTC(2023,0,1),now=Date.UTC(2027,0,1);
const T='sha256:'+'a'.repeat(64),A='sha256:'+'b'.repeat(64),B='sha256:'+'c'.repeat(64);
function seeded(seed){let s=seed>>>0;return ()=>((s=(1664525*s+1013904223)>>>0)/2**32);}
function report(node,i,yes){return {nodeId:node,action:'check',outcome:yes?'changed':'unchanged',id:`reference-${node.slice(-2)}-${i}`,sourceReference:`dated-record-${node.slice(-2)}-${i}`,at:new Date(origin+i*7*DAY).toISOString()};}
function environment(mode,seed,n=100){
 const rand=seeded(seed),rows=[];let a=0,b=0;
 for(let i=0;i<n;i++){
  // Exogenous phase schedules of *different* weak precursor signals. Their
  // alignment may or may not predict TARGET REPORTS, not unobserved world state.
  a=i%23>=5&&i%23<14;
  b=(i+seed%4)%29>=7&&(i+seed%4)%29<17;
  const ar=rand()<(a?.65:.16),br=rand()<(b?.65:.16);
  let prob=.15;
  if(mode==='conjunction')prob=a&&b?.80:.12;
  else if(mode==='stable')prob=.16;
  else if(mode==='inverse_last_third')prob=i<n*.67?(a&&b?.75:.12):(a&&b?.08:.73);
  else if(mode==='source_noise')prob=a?.30:.13;
  rows.push(report(A,i,ar),report(B,i,br),report(T,i,rand()<prob));
 }return rows;
}
const modes=['conjunction','stable','inverse_last_third','source_noise'];
const res={schema:'motif.collective015.synthetic-benchmark.v1',experiment:'Weak signals across checked relations, target at next checked bin',
 authorDesigned:true,predeclaredModes:modes,trialsPerMode:18,binsPerTrial:100,
 notRealWorldValidation:true,results:[]};
for(const mode of modes){
 let model=0,ewma=0,constant=0,n=0,alert=0,positiveAlarm=0,negativeAlarm=0;
 for(let trial=1;trial<=18;trial++){
  const x=forecastEarlyWarning({records:environment(mode,330+trial),targetNode:T,sourceNodes:[A,B],now,binDays:7,leadBins:1,gapBins:1,maxForecasts:25});
  if(!x.evaluation)throw Error('Synthetic evaluation missing: '+mode);
  model+=x.evaluation.modelBrier;ewma+=x.evaluation.ewmaBrier;constant+=x.evaluation.constantBrier;n++;
  for(const r of x.backtest){if(r.model!==null&&r.model>=.65&&r.model-r.ewma>=.08){alert++;r.futureObserved>=.5?positiveAlarm++:negativeAlarm++;}}
 }
 res.results.push({mode,trials:n,combinedBrier:+(model/n).toFixed(5),targetEWMA_Brier:+(ewma/n).toFixed(5),
   constantBrier:+(constant/n).toFixed(5),modelImprovementVsEWMA:+((ewma-model)/n).toFixed(5),
   exploratoryAlerts:alert,alertsFollowedByChangedCheck:positiveAlarm,falseAlarmChecks:negativeAlarm});
}
console.log(JSON.stringify(res,null,2));
