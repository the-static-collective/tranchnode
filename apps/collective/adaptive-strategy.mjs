/** COLLECTIVE-009: bounded, two-step adaptive counterfactual policy.
 * Every branch is a SIMULATION, not a TranchNode observation or a fact.
 * Probabilities describe anticipated testimony, never objective world truth.
 */
import {route,statement} from './kernel.mjs';
import {localFrontier} from './routing.mjs';
export const ADAPTIVE_SCHEMA='motif.collective009.adaptive-policy.v1';
export const MAX_OPTIONS=8, MAX_HISTORY=200, MAX_PROBES=30000;
const fail=msg=>{throw Error(msg)};
const edgeKey=(a,b)=>JSON.stringify([a,b]);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const fixed=v=>Number(v.toFixed(6));
const src=n=>n.kind==='claim'?n.content:n.kind==='source'?n.content?.statement:null;
function checkJobs(jobs,nodes,head){
 if(!Array.isArray(jobs)||jobs.length>24||!Array.isArray(nodes)||nodes.length>1500)fail('Exceeded research snapshot bounds');
 const seen=new Set(),ids=new Set();
 for(const n of nodes){if(!n||!['claim','source'].includes(n.kind)||typeof n.id!=='string'||ids.has(n.id))fail('Invalid source snapshot');ids.add(n.id);}
 for(const j of jobs){
  if(!j||typeof j.threadId!=='string'||!/^thread:[0-9a-f]{64}$/.test(j.threadId)||seen.has(j.threadId)||
     typeof j.threadRevision!=='string'||!j.threadRevision.startsWith('sha256:')||
     typeof j.receiptId!=='string'||!j.receiptId.startsWith('sha256:')||j.ledgerHead!==head||j.status!=='open'||
     typeof j.question?.from!=='string'||typeof j.question?.to!=='string'||
     !Array.isArray(j.assumptions)||j.assumptions.length>16)fail('Stale or unsafe inquiry snapshot');
  statement(j.question.from,j.question.to,'supports');seen.add(j.threadId);
  for(const a of j.assumptions){if(typeof a.id!=='string')fail('Invalid hypothesis');statement(a.from,a.to,a.polarity);}
 }
}
/** Local samples are **signed, admitted testimony**, not independently verified truth.
 * Group at most one signed statement per public key to avoid rewarding echoes from one signer.
 * An issuer whose prior answers contain BOTH polarities is excluded from this coarse 
 * cross-question prior. That is not necessarily contradictory testimony.
 */
export function testimonyPrior(samples=[],exclude=null,{now=Date.now(),halfLifeDays=30}={}){
 if(!Array.isArray(samples)||samples.length>MAX_HISTORY||!finite(halfLifeDays,1,365)||!Number.isFinite(now))fail('Bad testimony history');
 const seen=new Map();
 for(const s of samples){
  if(!s||s.accepted!==true||!/^node:[0-9a-f]{64}$/.test(s.issuer)||
    typeof s.from!=='string'||typeof s.to!=='string'||!['supports','denies'].includes(s.polarity)||
    !Number.isFinite(s.at)||s.at>now||now-s.at>365*86400000)fail('History must be admitted and attributed');
  if(edgeKey(s.from,s.to)===exclude)continue;
  if(!seen.has(s.issuer))seen.set(s.issuer,[]);
  seen.get(s.issuer).push(s);
 }
 let yes=0,no=0,used=0,conflicted=0;
 for(const group of seen.values()){
  const polarities=new Set(group.map(x=>x.polarity));
  if(polarities.size>1){conflicted++;continue;}
  // One signer cannot multiply its own evidentiary weight by issuing many claims.
  const latest=group.reduce((a,b)=>a.at>b.at?a:b);
  const weight=Math.exp(-Math.LN2*(now-latest.at)/(halfLifeDays*86400000));
  if(latest.polarity==='supports')yes+=weight;else no+=weight;
  used++;
 }
 return {supportsProbability:fixed((1+yes)/(2+yes+no)),effectiveSampleWeight:fixed(yes+no),
  distinctSigningKeysUpperBound:used,excludedMixedPolaritySigners:conflicted,
  basis:'Laplace-smoothed, recency-weighted admitted assertions; NOT a verified probability of real-world truth',
  empiricallyCalibrated:false};
}
/** Count per-thread conditional graph outcomes and number of still-open *question doors*.
 * This is an explicit proxy objective. Opening a door is NOT learning a new fact.
 */
function valueOf(worlds,questions,outcomes,{apertureWeight},costCounter){
 const observedResults=[],frontier=new Set();let possiblePaths=0;
 const asserted=new Map();
 for(const [key,answer] of outcomes)if(answer==='supports'||answer==='denies'){
  const [from,to]=JSON.parse(key),id='simulated:'+key;
  asserted.set(id,{id,kind:'claim',epistemicState:'counterfactual-only',content:{from,to,polarity:answer}});
 }
 for(const w of worlds){
  const graph=new Map([...w.graph,...asserted]);
  costCounter.calls++;if(costCounter.calls>costCounter.limit)fail('Simulation credit budget exhausted; no partial plan published');
  const result=route(graph,w.question.from,w.question.to);
  // Avoid counting conflicts as successful paths, including global HOLD.
  if(result.status==='PATH_SUPPORTED_BY_ASSERTIONS')possiblePaths++;
  // Only edges from the current reachable frontier can become possible follow-up tests.
  // Independent of testimony truth: frontier is conditional on recorded assertions and assumptions.
  const reached=localFrontier(graph,w.question.from);
  for(const q of questions)if(!outcomes.has(q.key)&&reached.has(q.from))frontier.add(q.key);
  observedResults.push({threadId:w.threadId,status:result.status,path:result.path,
   dependsOnHypotheses:result.evidenceIds.some(id=>id.startsWith('hypothesis:')||id.startsWith('simulated:'))});
 }
 return {utility:possiblePaths*12+frontier.size*apertureWeight,conditionalPathCount:possiblePaths,
  openQuestionCount:frontier.size,openQuestions:[...frontier],threadResults:observedResults};
}
function optionalOptions(options){
 const o={apertureWeight:options?.apertureWeight??1,defaultCost:options?.defaultCost??1,
  defaultAnsweredProbability:options?.defaultAnsweredProbability??0.85,
  defaultSupportsProbability:options?.defaultSupportsProbability??0.5,
  horizon:options?.horizon??2,credits:options?.credits??20000};
 if(![1,2].includes(o.horizon)||!finite(o.apertureWeight,0,6)||!finite(o.defaultCost,0,30)||
   !finite(o.defaultAnsweredProbability,0,1)||!finite(o.defaultSupportsProbability,0,1)||
   !Number.isSafeInteger(o.credits)||o.credits<24||o.credits>MAX_PROBES)fail('Invalid model budget, cost, or forecast assumption');
 return o;
}
function signature(q){return edgeKey(q.from,q.to);}
function checkProfile(profile,baseline,defaultCost,defaultAnsweredProbability){
 const p={pYes:profile?.pYes??baseline,cost:profile?.cost??defaultCost,pAnswered:profile?.pAnswered??defaultAnsweredProbability};
 if(!finite(p.pYes,0,1)||!finite(p.cost,0,30)||!finite(p.pAnswered,0,1))fail('Invalid experiment profile');
 return p;
}
export function adaptivePolicy({jobs,nodes,ledgerHead=null,experimentPlan,history=[],options={},profiles={}}){
 checkJobs(jobs,nodes,ledgerHead);
 if(!experimentPlan||experimentPlan.schema!=='motif.collective008.experiment-plan.v1'||
    experimentPlan.ledgerHead!==ledgerHead||!Array.isArray(experimentPlan.candidates)||
    experimentPlan.sourceThreadCount!==jobs.length||experimentPlan.sourceReceipts.length!==jobs.length)fail('Requires current COLLECTIVE-008 proposal, not stale or fabricated observations');
 for(const j of jobs)if(!experimentPlan.sourceReceipts.some(x=>x.threadId===j.threadId&&x.threadRevision===j.threadRevision&&x.receiptId===j.receiptId))fail('Plan provenance disagrees with live thread');
 const o=optionalOptions(options),seenKeys=new Set();
 if(!profiles||typeof profiles!=='object'||Array.isArray(profiles))fail('Invalid proposal profiles');
 const questions=[];
 for(const c of experimentPlan.candidates.slice(0,MAX_OPTIONS)){
  statement(c.from,c.to,'supports');const key=signature(c);
  if(seenKeys.has(key))fail('Duplicate planned experiment');seenKeys.add(key);
  const p=testimonyPrior(history,key),profile=checkProfile(profiles[key],
     p.distinctSigningKeysUpperBound>=2?p.supportsProbability:o.defaultSupportsProbability,o.defaultCost,o.defaultAnsweredProbability);
  questions.push({key,from:c.from,to:c.to,sourceThreadCount:c.sourceThreadCount,
   provenance:c.provenance,proposalPriority:c.priority,...profile,
   priorEvidence:p,probabilityCalibrated:false});
 }
 if(!questions.length)return {schema:ADAPTIVE_SCHEMA,status:'ABSTAIN_NO_EXPERIMENTS',recommendation:null,options:o,
    ledgerHead,automaticPeerContacts:0,automaticEvidenceAdmissions:0,worldTruthCertified:false,
    probabilityCalibrated:false,questions:[],creditsSpent:0};
 const originals=new Map(nodes.map(n=>[n.id,n]));
 const observedEdges=new Set(nodes.map(src).filter(Boolean).map(s=>edgeKey(s.from,s.to)));
 const worlds=jobs.map(j=>{
  const graph=new Map(originals);
  for(const a of j.assumptions)graph.set('hypothesis:'+a.id,{id:'hypothesis:'+a.id,kind:'claim',epistemicState:'hypothetical',content:{from:a.from,to:a.to,polarity:a.polarity}});
  return {threadId:j.threadId,question:j.question,graph};
 });
 const counter={calls:0,limit:o.credits},memo=new Map();
 function evaluation(outcomes){
  const key=JSON.stringify([...outcomes].sort(([a],[b])=>a.localeCompare(b)));
  if(!memo.has(key))memo.set(key,valueOf(worlds,questions,outcomes,o,counter));
  return memo.get(key);
 }
 const rootValue=evaluation(new Map());
 // A question is eligible when any research thread can reach its FROM endpoint.
 function eligible(q,outcomes,v){return !observedEdges.has(q.key)&&!outcomes.has(q.key)&&v.openQuestions.includes(q.key);}
 function evaluateQuestion(q,outcomes,depth,current){
  const branches=[{answer:'supports',prob:q.pAnswered*q.pYes},
    {answer:'denies',prob:q.pAnswered*(1-q.pYes)},
    {answer:'unknown',prob:1-q.pAnswered}];
  let expected=-q.cost;const contingencies=[];
  for(const branch of branches){
   const after=new Map(outcomes);after.set(q.key,branch.answer);
   const immediate=evaluation(after);
   let future={expectedUtility:immediate.utility,choice:null,incrementalGain:0};
   if(depth>1){
    const next=bestAt(after,depth-1,immediate);
    if(next&&next.expectedUtility>immediate.utility)future=next;
   }
   expected+=branch.prob*future.expectedUtility;
   contingencies.push({answer:branch.answer,assumedProbability:fixed(branch.prob),
     immediateUtility:fixed(immediate.utility),conditionalPaths:immediate.conditionalPathCount,
     possibleNextQuestions:immediate.openQuestionCount,
     nextQuestion:future.choice?{from:future.choice.from,to:future.choice.to}:null,
     nextStepExpectedUtility:fixed(future.expectedUtility)});
  }
  return {choice:q,expectedUtility:expected,incrementalGain:expected-current.utility,contingencies};
 }
 function bestAt(outcomes,depth,at){
  let best=null;
  for(const q of questions){
   if(!eligible(q,outcomes,at))continue;
   const option=evaluateQuestion(q,outcomes,depth,at);
   if(!best||option.expectedUtility>best.expectedUtility+1e-9||
      (Math.abs(option.expectedUtility-best.expectedUtility)<1e-9&&q.key<best.choice.key))best=option;
  }
  return best;
 }
 const ranked=[];
 for(const q of questions){if(!eligible(q,new Map(),rootValue))continue;
  ranked.push(evaluateQuestion(q,new Map(),o.horizon,rootValue));}
 ranked.sort((a,b)=>b.expectedUtility-a.expectedUtility||a.choice.key.localeCompare(b.choice.key));
 const winning=ranked[0];
 const recommendation=winning&&winning.incrementalGain>1e-8?{from:winning.choice.from,to:winning.choice.to,
    estimatedTwoStepNetGain:fixed(winning.incrementalGain),
    explanation:'Most promising two-step policy under explicit testimony and cost assumptions; not a world-truth guarantee',
    ifSupports:winning.contingencies[0].nextQuestion,ifDenies:winning.contingencies[1].nextQuestion,
    ifUnknown:winning.contingencies[2].nextQuestion}:null;
 return {schema:ADAPTIVE_SCHEMA,ledgerHead,sourceThreadCount:jobs.length,
  sourceReceipts:jobs.map(j=>({threadId:j.threadId,threadRevision:j.threadRevision,receiptId:j.receiptId})),
  status:recommendation?'PROPOSE_ADAPTIVE_QUESTION':'ABSTAIN_NONPOSITIVE_VALUE',recommendation,
  decisionHorizon:o.horizon,
  baseline:rootValue.utility,conditionalSupportedPathsBaseline:rootValue.conditionalPathCount,
  modelDescription:'Two-step lookahead; Laplace-shrunk testimony propensity only; explicit costs, answerability and counterfactual frontier value',
  planningAssumptions:o,probabilityCalibrated:false,worldTruthCertified:false,
  automaticPeerContacts:0,automaticEvidenceAdmissions:0,
  creditsSpent:counter.calls,creditsLimit:o.credits,questionCount:questions.length,
  questions:questions.map(({key,from,to,pYes,pAnswered,cost,priorEvidence})=>({key,from,to,pYes,pAnswered,cost,priorEvidence})),
  alternatives:ranked.map(r=>({from:r.choice.from,to:r.choice.to,expectedTwoStepGain:fixed(r.incrementalGain),
    expectedUtility:fixed(r.expectedUtility),cost:r.choice.cost,contingencies:r.contingencies}))};
}

/** Input is a new independently accepted evidence snapshot. No automatic replan/communication.
 * An actual strategy pivot is reported only when this caller explicitly recomputes.
 */
export function strategyChange(oldPolicy,newPolicy){
 if(oldPolicy.schema!==ADAPTIVE_SCHEMA||newPolicy.schema!==ADAPTIVE_SCHEMA)fail('Incompatible strategy receipts');
 if(oldPolicy.ledgerHead===newPolicy.ledgerHead)return {status:'UNCHANGED_EVIDENCE',changed:false};
 const before=oldPolicy.recommendation,after=newPolicy.recommendation;
 const changed=!same(before&&[before.from,before.to],after&&[after.from,after.to]);
 return {status:changed?'PIVOT_AFTER_EVIDENCE':'SAME_CHOICE_AFTER_EVIDENCE',changed,
  before:before?{from:before.from,to:before.to}:null,after:after?{from:after.from,to:after.to}:null,
  claim:'Only a change in recommended experiment after a fresh local evidence snapshot; not causal proof or discovered world truth'};
}
