/** COLLECTIVE-010 deterministic, FROZEN SYNTHETIC oracle; never real validation. */
import {writeFileSync} from 'node:fs';
import {makeResolutionReceipt,fitResolutionPrior,scoreChronological,independentCases} from '../apps/collective/calibration.mjs';
const scope='local:node:'+'b'.repeat(64);
const t=i=>new Date(Date.UTC(2026,0,1)+i*600000).toISOString();
function rng(seed){let x=seed>>>0;return()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/2**32);}
async function series(name,n,policy,seed=42){
 const roll=rng(seed),items=[];
 for(let i=0;i<n;i++){
  const outcome=policy(i,roll);
  items.push(await makeResolutionReceipt(scope,{caseId:`${name}:case:${i}`,groupId:`${name}:group:${i}`,tag:'general',
   question:{from:'Sample',to:'Outcome'},outcome,method:'sealed_benchmark',
   sourceReference:`synthetic:sealed:${name}:${i}`},t(i)));
 }
 return items;
}
const regime=[];
regime.push({name:'stationary-80pct-support-80pct-answered',records:await series('steady',240,(i,r)=>r()<.20?'inconclusive':r()<.80?'supports':'denies',91)});
regime.push({name:'abrupt-support-reversal-after-120',records:await series('drift',240,(i,r)=>r()<.15?'inconclusive':r()<(i<120?.9:.1)?'supports':'denies',47)});
regime.push({name:'mostly-inconclusive-80pct',records:await series('inconclusive',240,(i,r)=>r()<.8?'inconclusive':r()<.55?'supports':'denies',54)});
const echoRecords=await series('anti-echo',64,()=> 'denies',26);
for(let i=0;i<128;i++){
 echoRecords.push(await makeResolutionReceipt(scope,{caseId:`echo:case:${i}`,groupId:'echo:single-origin',tag:'general',
  question:{from:'Sample',to:'Outcome'},outcome:'supports',method:'sealed_benchmark',sourceReference:`synthetic:repeat:${i}`},t(64+i)));
}
regime.push({name:'one-echo-family-128-times-vs-64-denials',records:echoRecords});
const results={schema:'motif.collective010.synthetic-test-report.v1',truth:'deliberately_scripted_not_real_world',
  independence:'group IDs assigned by benchmark author, NOT a physical validation',minGroups:8,
  scoring:'prequential out-of-sample proper Brier and log-loss',regimes:[]};
for(const run of regime){
 const scored=scoreChronological(run.records,{halfLifeDays:21});
 const groups=independentCases(run.records);
 const fit=fitResolutionPrior(run.records,{now:Date.parse(t(300)),halfLifeDays:21});
 results.regimes.push({name:run.name,totalRecords:run.records.length,distinctCountedGroups:groups.cases.length,
  echoDiscounted:groups.echoRemoved,conflictedGroupsHeld:groups.conflictedGroupsHeld,
  finalEstimate:{pYes:fit.pYes,pAnswered:fit.pAnswered},
  answerability:scored.answered,supportGivenAnswer:scored.supportsConditionalOnAnswer});
}
console.log(JSON.stringify(results,null,2));
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(results,null,2)+'\n');
