/** Deterministic author-scripted cases; not held-out independent research evidence. */
import {writeFileSync} from 'node:fs';
import {adaptivePolicy} from '../apps/collective/adaptive-strategy.mjs';
import {planExperiments} from '../apps/collective/experiment-planner.mjs';
import {route} from '../apps/collective/kernel.mjs';
const h=i=>'sha256:'+i.toString(16).padStart(64,'0'),tid=i=>'thread:'+i.toString(16).padStart(64,'0');
const key=(a,b)=>JSON.stringify([a,b]);
function frame(i,regime,round,observed){
 const A='A_'+i,B='B_'+i,C='C_'+i,Z='Z_'+i;
 const nodes=[{id:h(10000+i),kind:'claim',content:{from:A,to:B,polarity:'supports'}},...observed.map((o,k)=>({id:h(20000+i*5+k),kind:'claim',content:o}))];
 const ledgerHead=h(30000+i*5+round);
 const jobs=[{threadId:tid(i+1),threadRevision:h(100000+i),receiptId:h(200000+i),ledgerHead,status:'open',
  question:{from:A,to:Z},assumptions:[],candidateQuestions:[{from:B,to:Z},{from:B,to:C},{from:C,to:Z}]
   .map(x=>({...x,kind:'test_missing_relation'}))}];
 const experimentPlan=planExperiments({jobs,nodes,ledgerHead,probeCredits:60});
 const profiles={
  [key(B,Z)]:{pYes:.35,pAnswered:1,cost:1},
  [key(B,C)]:{pYes:.90,pAnswered:1,cost:1},
  [key(C,Z)]:{pYes:.90,pAnswered:1,cost:1},
 };
 return {jobs,nodes,ledgerHead,experimentPlan,profiles,terms:{A,B,C,Z}};
}
function outcomeFor(regime,terms){
 const {B,C,Z}=terms;
 const named={
  gateway_valid:{[key(B,Z)]:'denies',[key(B,C)]:'supports',[key(C,Z)]:'supports'},
  gateway_blocked:{[key(B,Z)]:'supports',[key(B,C)]:'denies',[key(C,Z)]:'supports'},
  unexpected_denial:{[key(B,Z)]:'supports',[key(B,C)]:'supports',[key(C,Z)]:'denies'},
 };return named[regime];
}
function play(i,regime,horizon){
 const observed=[],chosen=[];let firstSupport=false;
 for(let round=0;round<2;round++){
  const env=frame(i,regime,round,observed),policy=adaptivePolicy({...env,options:{horizon,credits:20000,apertureWeight:1}});
  if(!policy.recommendation)break;
  const {from,to}=policy.recommendation,answer=outcomeFor(regime,env.terms)[key(from,to)]||'unknown';
  chosen.push({from,to,answer});
  if(answer!=='unknown')observed.push({from,to,polarity:answer});
  const graph=new Map([...env.nodes.map(n=>[n.id,n]),...observed.map((o,k)=>['answer'+k,{id:'answer'+k,kind:'claim',content:o}])]);
  const verdict=route(graph,env.terms.A,env.terms.Z);
  if(round===0)firstSupport=verdict.status==='PATH_SUPPORTED_BY_ASSERTIONS';
  if(verdict.status==='PATH_SUPPORTED_BY_ASSERTIONS')break;
 }
 const end=frame(i,regime,2,observed);
 return {firstSupport,finalSupported:route(new Map(end.nodes.map(n=>[n.id,n])),end.terms.A,end.terms.Z).status==='PATH_SUPPORTED_BY_ASSERTIONS',
  questionsUsed:chosen.length,trace:chosen};
}
const output={schema:'motif.collective009.frozen-constructed-benchmark.v1',date:'2026-11-10',
 controls:'Each policy has identical constructed outcomes, costs and priors. One-step replans after each answer. Outcomes authored in this script, not measured world truth.',
 regimes:[],caveats:['No real-world accuracy or historical probability calibration established.',
   'Graph-path outcomes remain conditional on scripted assertions, not demonstrated truth.',
   'Lookahead can lose badly when priors mispredict or gateway premise is denied.']};
for(const regime of ['gateway_valid','gateway_blocked','unexpected_denial']){
 const out={name:regime,cases:36,adaptive:{supportedAfterFirst:0,finalSupported:0,queries:0},myopic:{supportedAfterFirst:0,finalSupported:0,queries:0},examples:[]};
 for(let j=0;j<36;j++){
  const i=(output.regimes.length)*100+j+1,a=play(i,regime,2),b=play(i,regime,1);
  for(const [name,result] of [['adaptive',a],['myopic',b]]){
   out[name].supportedAfterFirst+=Number(result.firstSupport);out[name].finalSupported+=Number(result.finalSupported);out[name].queries+=result.questionsUsed;
  }
  if(!j)out.examples.push({adaptive:a,myopic:b});
 }
 output.regimes.push(out);
}
const dest=process.argv[2];if(dest)writeFileSync(dest,JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
