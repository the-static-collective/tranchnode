/** Deterministic synthetic falsification of greedy cross-thread selection.
 * No human identities, network calls, claims of real-world performance or calibrated priors.
 */
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
import {planExperiments,frequencyOnly} from '../apps/collective/experiment-planner.mjs';
import {route} from '../apps/collective/kernel.mjs';
const id=i=>'thread:'+i.toString(16).padStart(64,'0');
const hash=i=>'sha256:'+i.toString(16).padStart(64,'0');
const edge=(from,to)=>({from,to,kind:'test_missing_relation'});
const node=(i,from,to)=>({id:hash(i),kind:'claim',content:{from,to,polarity:'supports'}});
const frozen=hash(777);
function task(index,regime){
 const unique='p'+index+'_';
 const g=(x)=>unique+x;
 let nodes=[],jobs=[],truth=new Map();
 function j(number,from,to,candidates){jobs.push({threadId:id(index*10+number+1),threadRevision:hash(index*10+number+30000),
   receiptId:hash(index*10+number+70000),ledgerHead:frozen,status:'open',question:{from:g(from),to:g(to)},
   assumptions:[],candidateQuestions:candidates.map(([a,b])=>edge(g(a),g(b)))});}
 const shared=['B','C'],single=['A0','A1'],decoy=['AA','AB'];
 if(regime==='shared-beneficial'||regime==='adversarial-denial'){
  nodes=[node(index*10+1,g('S1'),g('B')),node(index*10+2,g('S2'),g('B')),
   node(index*10+3,g('S3'),g('B')),node(index*10+4,g('C'),g('T1')),
   node(index*10+5,g('C'),g('T2')),node(index*10+6,g('C'),g('T3')),
   node(index*10+7,g('Astart'),g('A0')),node(index*10+8,g('A1'),g('Agoal'))];
  for(let i=1;i<=3;i++)j(i,'S'+i,'T'+i,[shared]);
  j(4,'Astart','Agoal',[single]);
  truth.set(JSON.stringify(shared),regime==='shared-beneficial'?'supports':'denies');
  truth.set(JSON.stringify(single),'supports');
 }else if(regime==='frequent-decoy'){
  nodes=[node(index*10+1,g('S'),g('A0')),node(index*10+2,g('A1'),g('T'))];
  j(1,'Q1','R1',[decoy]);j(2,'Q2','R2',[decoy]);j(3,'Q3','R3',[decoy]);j(4,'S','T',[single]);
  truth.set(JSON.stringify(decoy),'supports');truth.set(JSON.stringify(single),'supports');
 }else throw Error('unknown regime');
 return {jobs,nodes,ledgerHead:frozen,probeCredits:128,truth,unique};
}
function chosenGain(t,chosen){
 if(!chosen)return 0;
 const from=chosen.from.slice(t.unique.length),to=chosen.to.slice(t.unique.length);
 const truth=t.truth.get(JSON.stringify([from,to]))||'unknown';
 if(truth==='unknown')return 0;
 const all=new Map(t.nodes.map(n=>[n.id,n]));
 const id='truth-probe';all.set(id,{id,kind:'claim',content:{from:chosen.from,to:chosen.to,polarity:truth}});
 return t.jobs.reduce((count,j)=>count+(route(all,j.question.from,j.question.to).status==='PATH_SUPPORTED_BY_ASSERTIONS'?1:0),0);
}
export function benchmark(){
 const cases=[];
 for(const regime of ['shared-beneficial','frequent-decoy','adversarial-denial']){
  let plannerGain=0,frequencyGain=0,alphabetGain=0,plannerCorrect=0,frequencyCorrect=0,abstentions=0;
  for(let i=1;i<=60;i++){
   const t=task(i,regime),plan=planExperiments(t),ranked=frequencyOnly(t.jobs),
     alphabet=[...ranked].sort((a,b)=>JSON.stringify([a.from,a.to]).localeCompare(JSON.stringify([b.from,b.to])));
   const gainP=chosenGain(t,plan.recommendation),gainF=chosenGain(t,ranked[0]),gainA=chosenGain(t,alphabet[0]);
   plannerGain+=gainP;frequencyGain+=gainF;alphabetGain+=gainA;
   plannerCorrect+=gainP>0?1:0;frequencyCorrect+=gainF>0?1:0;
   abstentions+=plan.recommendation?0:1;
  }
  cases.push({regime,cases:60,metric:'synthetic supported-path count after a constructed answer; not measured information gain',
   plannerSupportedPaths:plannerGain,frequencyOnlySupportedPaths:frequencyGain,alphabeticalSupportedPaths:alphabetGain,
   plannerFirstQuestionPathSuccess:plannerCorrect,frequencyFirstQuestionPathSuccess:frequencyCorrect,plannerAbstentions:abstentions});
 }
 return {schema:'motif.collective008.benchmark.v1',design:'independently constructed deterministic stress regimes',
  taskCount:180,comparators:'All three policies get the same frozen candidate list and observed graph; only the outcome oracle is hidden until scoring',
  disclaimer:'Synthetic and author-controlled; no new intelligence, causal discovery, calibrated probability, or dominance over an equally informed classical planning algorithm is demonstrated.',cases};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const result=benchmark();console.log(JSON.stringify(result,null,2));
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');
}
