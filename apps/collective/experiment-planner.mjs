/** COLLECTIVE-008 — local value-of-inquiry / aperture planner.
 * Binary outcome projections are NOT observations, Bayesian probabilities, or facts.
 * All scores are transparent deterministic heuristics over frozen inquiry receipts.
 */
import {route, statement} from './kernel.mjs';
export const PLANNER_SCHEMA='motif.collective008.experiment-plan.v1';
export const PLAN_MIN_CREDITS=2, PLAN_MAX_CREDITS=512, PLAN_MAX_CANDIDATES=36;
const edgeKey=(from,to)=>JSON.stringify([from,to]);
const isLabel=x=>typeof x==='string'&&x.length>0&&x.length<=90&&!/[\u0000-\u001f]/.test(x);
const assert=(ok,why)=>{if(!ok)throw Error(why);};
const source=n=>n?.kind==='claim'?n.content:n?.kind==='source'?n.content?.statement:null;
const prediction=r=>JSON.stringify({status:r.status,path:r.path});

function checkInputs({jobs,nodes,ledgerHead,probeCredits}){
 assert(Array.isArray(jobs)&&jobs.length<=24,'Too many inquiry threads');
 assert(Array.isArray(nodes)&&nodes.length<=1500,'Observed evidence exceeds bounds');
 assert(new Set(nodes.map(x=>x?.id)).size===nodes.length,'Duplicate observed evidence');
 assert(nodes.every(n=>typeof n?.id==='string'&&['claim','source'].includes(n.kind)),'Unexpected observed node type');
 assert(ledgerHead===null||(typeof ledgerHead==='string'&&ledgerHead.startsWith('sha256:')),'Invalid frozen evidence head');
 assert(Number.isSafeInteger(probeCredits)&&probeCredits>=PLAN_MIN_CREDITS&&probeCredits<=PLAN_MAX_CREDITS,'Planner credit budget must be 2–512');
 const seen=new Set();
 for(const j of jobs){
  assert(j&&typeof j.threadId==='string'&&/^thread:[0-9a-f]{64}$/.test(j.threadId)&&!seen.has(j.threadId),'Invalid or repeated thread');
  seen.add(j.threadId);
  assert(typeof j.threadRevision==='string'&&j.threadRevision.startsWith('sha256:')&&typeof j.receiptId==='string'&&j.receiptId.startsWith('sha256:'),'Missing frozen research provenance');
  assert(j.ledgerHead===ledgerHead,'Planner refuses stale research receipt');
  assert(j.status==='open'&&isLabel(j.question?.from)&&isLabel(j.question?.to)&&j.question.from!==j.question.to,'Invalid active inquiry');
  assert(Array.isArray(j.assumptions)&&j.assumptions.length<=16&&Array.isArray(j.candidateQuestions)&&j.candidateQuestions.length<=12,'Invalid inquiry input bounds');
  for(const a of j.assumptions)assert(a&&typeof a.id==='string'&&isLabel(a.from)&&isLabel(a.to)&&['supports','denies'].includes(a.polarity),'Invalid hypothetical premise');
  for(const q of j.candidateQuestions)statement(q.from,q.to,'supports');
 }
}
function scenarioGraph(nodes,assumptions){
 const graph=new Map(nodes.map(n=>[n.id,n]));
 for(const a of assumptions){const id='hypothesis:'+a.id;graph.set(id,{id,kind:'claim',epistemicState:'hypothetical',content:statement(a.from,a.to,a.polarity)});}
 return graph;
}
function withOutcome(graph,from,to,polarity){
 const next=new Map(graph),id='proposed-result:'+edgeKey(from,to);
 next.set(id,{id,kind:'claim',epistemicState:'counterfactual-only',content:statement(from,to,polarity)});
 return next;
}
/** Explicit, falsifiable 50/50 planning prior, not an estimated chance of truth. */
export function decisionEntropyBits(ifSupports,ifDenies){return prediction(ifSupports)===prediction(ifDenies)?0:1;}
export function candidatePriority({decisionThreads,conjecturedProgress,sourceThreadCount}){
 // Puts discriminatory cross-branch experiments ahead of frequently repeated but uninformative questions.
 // Counts are correlated; NEVER label decisionThreads as statistically independent bits.
 return decisionThreads*100+conjecturedProgress*10+sourceThreadCount;
}

/** Produce a ranked, evidence-pinned experiment menu. No network, no storage mutation. */
export function planExperiments({jobs,nodes,ledgerHead=null,probeCredits=128}){
 checkInputs({jobs,nodes,ledgerHead,probeCredits});
 const byId=new Map(),worlds=new Map();
 const orderedJobs=[...jobs].sort((a,b)=>a.threadId.localeCompare(b.threadId));
 for(const j of orderedJobs){
  worlds.set(j.threadId,scenarioGraph(nodes,j.assumptions));
  for(const q of j.candidateQuestions){
   const key=edgeKey(q.from,q.to);
   if(!byId.has(key))byId.set(key,{key,from:q.from,to:q.to,requests:[]});
   const c=byId.get(key);
   if(!c.requests.some(r=>r.threadId===j.threadId))c.requests.push({threadId:j.threadId,sourceReceiptId:j.receiptId,kind:q.kind});
  }
 }
 // Candidate pool: all open threads contribute; only current receipts are eligible.
 const allCandidates=[...byId.values()].sort((a,b)=>b.requests.length-a.requests.length||a.key.localeCompare(b.key));
 const candidates=allCandidates.slice(0,PLAN_MAX_CANDIDATES);
 let remaining=probeCredits,spent=0,probed=0;
 const evaluated=[];
 for(const c of candidates){
  const price=c.requests.length*2;
  // Never partially evaluate a candidate, which would bias its apparent cross-thread coverage.
  if(price>remaining)continue;
  remaining-=price;spent+=price;probed++;
  let decisionThreads=0,progress=0;
  const impacts=[];
  for(const request of c.requests){
   const j=orderedJobs.find(x=>x.threadId===request.threadId),world=worlds.get(j.threadId);
   const affirmative=route(withOutcome(world,c.from,c.to,'supports'),j.question.from,j.question.to);
   const negative=route(withOutcome(world,c.from,c.to,'denies'),j.question.from,j.question.to);
   const decisionBits=decisionEntropyBits(affirmative,negative);
   decisionThreads+=decisionBits;
   const supportsPath=affirmative.status==='PATH_SUPPORTED_BY_ASSERTIONS';
   const deniesPath=negative.status==='PATH_SUPPORTED_BY_ASSERTIONS';
   if(supportsPath!==deniesPath)progress++;
   impacts.push({threadId:j.threadId,sourceReceiptId:request.sourceReceiptId,question:j.question,
    ifSupports:{status:affirmative.status,path:affirmative.path},
    ifDenies:{status:negative.status,path:negative.path},
    changedOutcome:!!decisionBits,conditionalPathSplit:supportsPath!==deniesPath,
    needsIndependentEvidence:true});
  }
  const jointInformationUpperBoundBits=decisionThreads?1:0;
  evaluated.push({from:c.from,to:c.to,sourceThreadCount:c.requests.length,
   answerStates:['supports','denies','unknown'],assumedTwoOutcomePrior:'0.5/0.5 (illustrative; no empirical calibration)',
   jointInformationUpperBoundBits,decisionThreadCount:decisionThreads,conditionalPathSplitCount:progress,
   probeCreditsSpent:price,priority:candidatePriority({decisionThreads,
      conjecturedProgress:progress,sourceThreadCount:c.requests.length}),
   impacts,provenance:c.requests.map(x=>({threadId:x.threadId,receiptId:x.sourceReceiptId,kind:x.kind})),
   policy:'suggestion-only; explicit action required; never convert projected answer into observed evidence'});
 }
 evaluated.sort((a,b)=>b.priority-a.priority||b.sourceThreadCount-a.sourceThreadCount||edgeKey(a.from,a.to).localeCompare(edgeKey(b.from,b.to)));
 const best=evaluated[0]??null;
 const status=!allCandidates.length?'NO_CANDIDATES':
   (probed<allCandidates.length?'PARTIAL_BUDGET':best?.decisionThreadCount?'DISCRIMINATING_CANDIDATE':'NO_DISCRIMINATING_TEST');
 return {schema:PLANNER_SCHEMA,ledgerHead,sourceThreadCount:orderedJobs.length,
  sourceReceipts:orderedJobs.map(x=>({threadId:x.threadId,threadRevision:x.threadRevision,receiptId:x.receiptId})),
  evaluatedCandidateCount:probed,unevaluatedCandidateCount:allCandidates.length-probed,
  budget:probeCredits,creditsSpent:spent,creditsRemaining:remaining,selectionStatus:status,
  policy:'LOCAL_PROPOSALS_ONLY',automaticPeerContacts:0,automaticEvidenceAdmissions:0,
  probabilityCalibrated:false,worldTruthCertified:false,
  recommendation:best?.decisionThreadCount?{from:best.from,to:best.to,priority:best.priority,decisionThreadCount:best.decisionThreadCount,provisional:status==='PARTIAL_BUDGET'}:null,
  candidates:evaluated};
}

/** A sequential, equally informed frequency-only control for fair comparisons. */
export function frequencyOnly(jobs){
 const freq=new Map();
 for(const j of jobs)for(const q of j.candidateQuestions){const k=edgeKey(q.from,q.to);
  if(!freq.has(k))freq.set(k,{from:q.from,to:q.to,threads:new Set()});freq.get(k).threads.add(j.threadId);
 }
 return [...freq.values()].sort((a,b)=>b.threads.size-a.threads.size||edgeKey(a.from,a.to).localeCompare(edgeKey(b.from,b.to)))
  .map(c=>({from:c.from,to:c.to,sourceThreadCount:c.threads.size}));
}
