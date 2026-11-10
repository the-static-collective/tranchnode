/** COLLECTIVE-007: local counterfactual probe planner. No inference is a world fact.
 * Every route() invocation spends one fixed, auditable inference credit.
 */
import {route} from './kernel.mjs';

export const INQUIRY_VERSION='motif.collective007.inquiry.v1';
export const MIN_BUDGET=2, MAX_BUDGET=64, MAX_CANDIDATES=12, MAX_GRAPH_NODES=1500;
const isLabel=x=>typeof x==='string'&&x.length>0&&x.length<=90;
const edgeKey=(from,to)=>JSON.stringify([from,to]);
const assertion=n=>n?.kind==='claim'?n.content:n?.kind==='source'?n.content?.statement:null;
function collect(nodes){
 const edges=new Map();
 for(const n of nodes.values()){
  const s=assertion(n);
  if(!s||!isLabel(s.from)||!isLabel(s.to)||!['supports','denies'].includes(s.polarity))continue;
  const k=edgeKey(s.from,s.to);if(!edges.has(k))edges.set(k,{from:s.from,to:s.to,supports:[],denies:[]});
  edges.get(k)[s.polarity].push(n.id);
 }
 return edges;
}
function overlay(nodes,assumptions,without=null){
 const result=new Map(nodes);
 for(const a of assumptions)if(a.id!==without){
  result.set('hypothesis:'+a.id,{id:'hypothesis:'+a.id,kind:'claim',content:{from:a.from,to:a.to,polarity:a.polarity}});
 }
 return result;
}
function walk(edges,start,reverse=false){
 const distances=new Map([[start,0]]),queue=[start];
 for(let i=0;i<queue.length&&queue.length<300;i++){
  const at=queue[i],distance=distances.get(at);
  for(const e of edges.values()){
   if(!e.supports.length||e.denies.length)continue;
   const first=reverse?e.to:e.from,second=reverse?e.from:e.to;
   if(first===at&&!distances.has(second)){
    distances.set(second,distance+1);queue.push(second);
   }
  }
 }
 return distances;
}
const pathish=x=>['PATH_SUPPORTED_BY_ASSERTIONS','TRIVIAL'].includes(x.status);
const held=x=>x.status==='HOLD_CONTRADICTION';
function valid(thread,nodes,budget){
 if(!thread||!thread.question||!isLabel(thread.question.from)||!isLabel(thread.question.to)
    ||typeof thread.id!=='string'||!thread.id.startsWith('thread:')
    ||typeof thread.revision!=='string'||!['open','held','archived'].includes(thread.status)
    ||!Array.isArray(thread.assumptions)||thread.assumptions.length>16)
   throw Error('Invalid inquiry snapshot');
 if(!Array.isArray(nodes)||nodes.length>MAX_GRAPH_NODES||nodes.some(n=>typeof n?.id!=='string'||!['claim','source'].includes(n.kind)))
   throw Error('Inquiry snapshot exceeds bounded local graph view');
 if(!Number.isSafeInteger(budget)||budget<MIN_BUDGET||budget>MAX_BUDGET)throw Error('Inquiry budget must be 2–64 inference credits');
}
/** Pure, deterministic evaluation, no network/IO, no observed-memory writes. */
export function investigateOne({thread,nodes,budget=18,ledgerHead=null}){
 valid(thread,nodes,budget);
 const evidence=new Map(nodes.map(n=>[n.id,n]));
 if(evidence.size!==nodes.length)throw Error('Duplicate graph node');
 const q=thread.question,spent={count:0};
 function measure(graph){if(spent.count>=budget)return null;spent.count++;return route(graph,q.from,q.to);}
 const observed=measure(evidence);
 const world=overlay(evidence,thread.assumptions);
 const scenario=measure(world);
 const root={schema:INQUIRY_VERSION,threadId:thread.id,threadRevision:thread.revision,
   parent:thread.parent??null,question:q,ledgerHead,
   budget,creditsSpent:0,creditsRemaining:budget,stop:'',
   observedStatus:observed.status,scenarioStatus:scenario.status,
   observedEvidenceIds:observed.evidenceIds,
   scenarioEvidenceIds:scenario.evidenceIds.filter(id=>!id.startsWith('hypothesis:')),
   hypothesisIdsUsed:scenario.evidenceIds.filter(id=>id.startsWith('hypothesis:')).map(x=>x.slice('hypothesis:'.length)),
   tensions:scenario.tensions,necessityProbes:[],candidateQuestions:[],
   researchOnly:true,automaticFactPromotion:false,automaticPeerContact:false,worldTruthCertified:false};
 if(thread.status!=='open'){
  root.stop=thread.status==='archived'?'ARCHIVED':'ON_HOLD';
 }else if(held(scenario)){
  for(const t of scenario.tensions.slice(0,MAX_CANDIDATES)){
   root.candidateQuestions.push({from:t.from,to:t.to,kind:'resolve_conflicting_testimony',
    reason:'Opposing assertions are recorded; ask for independent corroboration, not a vote.',
    supportingIds:t.supporting,contestingIds:t.contesting,
    evidenceStatus:'CONTESTED',estimatedDiscrimination:null});
  }
  root.stop='HOLD_UNRESOLVED_CONTRADICTION';
 }else{
  // Ablation: remove one hypothetical premise at a time, without changing memory.
  for(const a of thread.assumptions){
   const after=measure(overlay(evidence,thread.assumptions,a.id));
   if(!after)break;
   root.necessityProbes.push({assumptionId:a.id,from:a.from,to:a.to,
     removedStatus:after.status,requiredForThisStatus:after.status!==scenario.status,
     requiredForThisPath:after.status!==scenario.status||JSON.stringify(after.path)!==JSON.stringify(scenario.path)});
  }
  if(root.hypothesisIdsUsed.length){
   for(const a of thread.assumptions.filter(a=>root.hypothesisIdsUsed.includes(a.id)).slice(0,MAX_CANDIDATES)){
    root.candidateQuestions.push({from:a.from,to:a.to,kind:'verify_hypothetical_premise',
      assumptionId:a.id,reason:'This conditional path uses an unverified what-if assumption.',
      evidenceStatus:'HYPOTHETICAL',estimatedDiscrimination:null});
   }
  }
  if(!pathish(scenario)){
   const edges=collect(world),left=walk(edges,q.from),right=walk(edges,q.to,true);
   const possible=[];
   for(const [from,ld] of left)for(const [to,rd] of right){
    if(from===to||edges.has(edgeKey(from,to)))continue;
    possible.push({from,to,depth:ld+rd});
   }
   // Shallow bridge preferences are heuristic, not a learned probability.
   possible.sort((a,b)=>b.depth-a.depth||a.from.localeCompare(b.from)||a.to.localeCompare(b.to));
   for(const c of possible.slice(0,MAX_CANDIDATES)){
    if(spent.count+2>budget)break;
    const id='probe:'+c.from+'->'+c.to;
    const accepted=measure(new Map([...world,[id,{id,kind:'claim',content:{from:c.from,to:c.to,polarity:'supports'}}]]));
    const denied=measure(new Map([...world,[id,{id,kind:'claim',content:{from:c.from,to:c.to,polarity:'denies'}}]]));
    // An experiment is discriminating when its two plausible outcomes differ.
    const distinct=accepted.status!==denied.status||JSON.stringify(accepted.path)!==JSON.stringify(denied.path);
    if(distinct)root.candidateQuestions.push({from:c.from,to:c.to,kind:'test_missing_relation',
       reason:'A local graph gap bridges two reachable parts of this counterfactual.',
       evidenceStatus:'UNVERIFIED',estimatedDiscrimination:1,
       ifSupports:accepted.status,ifDenies:denied.status});
   }
  }else if(!root.candidateQuestions.length){
   // Even a supported asserted path may need independent falsification.
   for(let i=0;i<Math.min(scenario.path.length-1,MAX_CANDIDATES);i++){
    root.candidateQuestions.push({from:scenario.path[i],to:scenario.path[i+1],kind:'seek_counterevidence',
      reason:'Test a pivotal recorded assertion rather than mistaking repeated agreement for confirmation.',
      evidenceStatus:'ASSERTED_NOT_VERIFIED',estimatedDiscrimination:null});
   }
  }
  if(root.candidateQuestions.length)root.stop=spent.count>=budget?'BUDGET_SPENT_WITH_CANDIDATES':'AWAIT_EVIDENCE_OR_USER_ACTION';
  else root.stop=spent.count>=budget?'BUDGET_EXHAUSTED':'NO_DISCRIMINATING_TEST_FOUND';
 }
 root.creditsSpent=spent.count;root.creditsRemaining=budget-spent.count;
 return root;
}

/** Comparison produces only suggested cross-thread questions. No graph joins. */
export function compareThreads(results){
 if(!Array.isArray(results)||results.length>24)throw Error('Too many research threads');
 const related=[];
 for(let i=0;i<results.length;i++)for(let j=i+1;j<results.length;j++){
  const a=results[i],b=results[j];
  if(a.threadId===b.threadId)throw Error('Duplicate research thread');
  const aQ=new Set(a.candidateQuestions.map(q=>JSON.stringify([q.from,q.to])));
  const common=b.candidateQuestions.filter(q=>aQ.has(JSON.stringify([q.from,q.to])))
    .map(q=>({from:q.from,to:q.to}));
  if(common.length)related.push({a:a.threadId,b:b.threadId,kind:'shared_unanswered_test',questions:common.slice(0,6),
    interpretation:'Independent branches suggested a similar question; this is not corroborating evidence.'});
  else if(a.question.from===b.question.from&&a.question.to===b.question.to&&a.scenarioStatus!==b.scenarioStatus){
   related.push({a:a.threadId,b:b.threadId,kind:'divergent_hypothetical_outcome',questions:[],
    interpretation:'Different assumptions produce different outcomes; neither outcome is promoted into observation.'});
  }
 }
 return {schema:'motif.collective007.cross-thread.v1',related:related.slice(0,48),crossPromotedFacts:0};
}

/** Round-robin worker scheduler with no starvation, deterministic result ordering.
 * The executor may use actual workers, but may never perform unapproved network IO.
 */
export async function scheduleInvestigations(jobs,{concurrency=3,executor=async task=>investigateOne(task)}={}){
 if(!Array.isArray(jobs)||jobs.length>24||!Number.isSafeInteger(concurrency)||concurrency<1||concurrency>4)throw Error('Invalid scheduler bounds');
 const seen=new Set();for(const job of jobs){if(seen.has(job.thread.id))throw Error('Duplicate scheduled thread');seen.add(job.thread.id);}
 const results=new Array(jobs.length);let next=0,maxActive=0,active=0;
 const workers=Array.from({length:Math.min(jobs.length,concurrency)},async()=>{
  while(next<jobs.length){const index=next++;active++;maxActive=Math.max(maxActive,active);
   try{results[index]=await executor(jobs[index]);}finally{active--;}
  }
 });
 await Promise.all(workers);
 return {results,maxActive,comparison:compareThreads(results),allLocalOnly:true};
}
