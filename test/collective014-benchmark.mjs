/** Five author-controlled synthetic check sequences, not a financial backtest. */
import {fitRegime} from '../apps/collective/regime-forecast.mjs';
const DAY=86400000,start=Date.UTC(2021,0,4),now=Date.UTC(2026,5,1),id='sha256:'+'f'.repeat(64);
function build(seed,kind){let x=seed;const random=()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/2**32;};
 return Array.from({length:140},(_,i)=>{const p=kind==='stable'?.2:kind==='ramp'?.1+.75*i/139:
  kind==='switch'?(i<98?.15:.85):kind==='reversal'?(i<98?.85:.15):i%2===0?.95:.05;
  return {id:'r-'+seed+'-'+i,nodeId:id,action:'check',outcome:random()<p?'changed':'unchanged',
   sourceReference:'reference-'+seed+'-'+i,at:new Date(start+i*7*DAY).toISOString()};});
}
const outcomes={};
for(const kind of ['stable','ramp','switch','reversal','alternating']){
 const runs=[];
 for(let seed=1;seed<=24;seed++){
  const x=fitRegime({records:build(seed,kind),nodeId:id,now,binDays:7,gapBins:1});
  if(!x.evaluation)throw Error('Holdout unavailable');runs.push(x.evaluation);
 }
 const avg=key=>+(runs.reduce((s,r)=>s+r[key],0)/runs.length).toFixed(6);
 outcomes[kind]={runs:24,adaptiveBrier:avg('adaptiveBrier'),baselineBrier:avg('baselineBrier'),
  improvement:avg('improvement'),adaptiveBetterCases:runs.filter(r=>r.adaptiveBrier<r.baselineBrier).length};
}
console.log(JSON.stringify({schema:'motif.collective014.synthetic-benchmark.v1',outcomes,
 cases:120,episodesPerCase:140,walkForward:true,trainingEmbargoBuckets:1,
 syntheticNotMarketOrFieldData:true,forecastPolicyPredeclared:true,worldTruthCertified:false},null,2));
