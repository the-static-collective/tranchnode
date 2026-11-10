import test from 'node:test';
import assert from 'node:assert/strict';
import {identity,makeNode,append,replay,statement,route} from '../apps/collective/kernel.mjs';
import {createThread,assume,replayThreads} from '../apps/collective/threads.mjs';
import {investigateOne,compareThreads,scheduleInvestigations,INQUIRY_VERSION,MAX_BUDGET} from '../apps/collective/inquiry-engine.mjs';
import {makeInquiryReceipt,replayInquiryReceipts,remainingBudget,reportFreshness} from '../apps/collective/inquiry-receipts.mjs';

async function sample({edges=[['A','B']],hypotheses=[],to='D',title='North'}={}){
 const ident=await identity(),scope='local:'+ident.id;
 let events=[];
 for(const [from,target,polarity='supports'] of edges){
  const n=await makeNode(scope,ident.id,'claim',statement(from,target,polarity));
  events=await append(events,scope,ident.id,n);
 }
 let research=[];
 const born=await createThread(research,scope,title,'A',to,events.at(-1)?.id??null);
 research=born.events;
 for(const [from,target,polarity='supports'] of hypotheses)research=await assume(research,scope,born.id,from,target,polarity);
 const thread=(await replayThreads(research,scope)).get(born.id);
 return {ident,scope,thread,events,nodes:[...(await replay(events,scope)).nodes.values()],ledgerHead:events.at(-1)?.id??null};
}
function job(example,budget=24){const {thread,nodes,ledgerHead}=example;return {
 thread:{id:thread.id,revision:thread.revision,parent:thread.parent,status:thread.status,question:thread.question,assumptions:[...thread.assumptions.values()]},
 nodes:nodes.map(n=>({id:n.id,kind:n.kind,content:n.content})),budget,ledgerHead};}

test('three alternative threads coexist; no branch alters immutable real evidence',async()=>{
 const e=await sample({hypotheses:[['B','C'],['C','D']]});
 const other=await sample({hypotheses:[['B','X'],['X','D']]});
 const hold=await sample({edges:[['A','B'],['B','C']],hypotheses:[['B','C','denies']],to:'C'});
 const frozen=JSON.stringify(e.events);
 const outputs=await scheduleInvestigations([job(e),job(other),job(hold)]);
 assert.equal(outputs.results.length,3);
 assert.equal(outputs.results[0].scenarioStatus,'PATH_SUPPORTED_BY_ASSERTIONS');
 assert.equal(outputs.results[1].scenarioStatus,'PATH_SUPPORTED_BY_ASSERTIONS');
 assert.equal(outputs.results[2].scenarioStatus,'HOLD_CONTRADICTION');
 assert.equal(outputs.results[2].stop,'HOLD_UNRESOLVED_CONTRADICTION');
 assert.equal(outputs.results.every(x=>x.worldTruthCertified===false&&x.automaticFactPromotion===false&&x.automaticPeerContact===false),true);
 assert.equal(JSON.stringify(e.events),frozen);
 assert.equal(route(new Map(e.nodes.map(n=>[n.id,n])),'A','D').status,'UNKNOWN_INSUFFICIENT_EVIDENCE');
});

test('ablation identifies pivotal what-if premises without promoting them',async()=>{
 const e=await sample({hypotheses:[['B','C'],['C','D']]});
 const report=investigateOne(job(e));
 assert.equal(report.schema,INQUIRY_VERSION);
 assert.equal(report.observedStatus,'UNKNOWN_INSUFFICIENT_EVIDENCE');
 assert.equal(report.necessityProbes.length,2);
 assert(report.necessityProbes.every(x=>x.requiredForThisPath));
 assert.deepEqual(report.candidateQuestions.map(x=>x.kind),['verify_hypothetical_premise','verify_hypothetical_premise']);
 assert.equal(report.creditsSpent,4);
 assert.equal(report.stop,'AWAIT_EVIDENCE_OR_USER_ACTION');
});

test('unknown graph generates discriminating questions under a fixed budget',async()=>{
 const e=await sample({edges:[['A','B'],['C','D']]});
 const report=investigateOne(job(e,8));
 assert(report.candidateQuestions.length>=1);
 assert(report.candidateQuestions.some(q=>q.from==='B'&&q.to==='C'&&q.kind==='test_missing_relation'));
 assert.equal(report.creditsSpent<=8,true);
 assert.equal(report.creditsRemaining,8-report.creditsSpent);
 assert(report.candidateQuestions.every(q=>q.estimatedDiscrimination===1));
});

test('short budget cannot silently exceed per-thread inference credits',async()=>{
 const e=await sample({hypotheses:[['B','C'],['C','D']]});
 const report=investigateOne(job(e,2));
 assert.equal(report.creditsSpent,2);
 assert.equal(report.necessityProbes.length,0);
 assert.equal(report.budget,2);
 assert.throws(()=>investigateOne(job(e,1)),/budget/);
 assert.throws(()=>investigateOne(job(e,MAX_BUDGET+1)),/budget/);
});

test('contradiction HOLD produces opposing sources, not a majority-vote answer',async()=>{
 const e=await sample({edges:[['A','B'],['B','C']],hypotheses:[['B','C','denies']],to:'C'});
 const r=investigateOne(job(e));
 assert.equal(r.stop,'HOLD_UNRESOLVED_CONTRADICTION');
 assert.equal(r.candidateQuestions.length,1);
 assert.equal(r.candidateQuestions[0].evidenceStatus,'CONTESTED');
 assert(r.candidateQuestions[0].contestingIds[0].startsWith('hypothesis:'));
});

test('cross-thread question echo is explicitly only a proposal',async()=>{
 const first=await sample({edges:[['A','B'],['C','D']]});
 const second=await sample({edges:[['A','B'],['C','D']],title:'South'});
 const r1=investigateOne(job(first)),r2=investigateOne(job(second));
 const comparison=compareThreads([r1,r2]);
 assert(comparison.related.length>=1);
 assert.equal(comparison.related[0].kind,'shared_unanswered_test');
 assert.equal(comparison.crossPromotedFacts,0);
 assert.match(comparison.related[0].interpretation,/not corroborating evidence/);
});

test('three independent executors execute simultaneously within a strict limit, in input order',async()=>{
 const example=await sample(),jobs=Array.from({length:9},(_,i)=>({...job(example),thread:{...job(example).thread,id:'thread:'+i.toString(16).padStart(64,'0')}}));
 let calls=0;
 const response=await scheduleInvestigations(jobs,{concurrency:3,executor:async task=>{
  calls++;await new Promise(resolve=>setTimeout(resolve,12));return investigateOne(task);
 }});
 assert.equal(calls,9);assert.equal(response.maxActive,3);
 assert.deepEqual(response.results.map(x=>x.threadId),jobs.map(x=>x.thread.id));
 await assert.rejects(scheduleInvestigations(jobs,{concurrency:5}),/bounds/);
});

test('research receipts detect tampering; stale evidence and budgets remain separate',async()=>{
 const s=await sample({hypotheses:[['B','C']]});const result=investigateOne(job(s));
 const receipt=await makeInquiryReceipt(s.scope,result);
 assert.equal((await replayInquiryReceipts([receipt],s.scope)).length,1);
 assert.equal(remainingBudget(24,[receipt],s.thread.id),24-result.creditsSpent);
 assert.equal(reportFreshness(receipt,s.thread,s.ledgerHead),'CURRENT_SNAPSHOT');
 assert.equal(reportFreshness(receipt,{...s.thread,revision:'changed'},s.ledgerHead),'STALE_THREAD');
 assert.equal(reportFreshness(receipt,s.thread,'other-ledger-head'),'STALE_EVIDENCE');
 const altered=structuredClone(receipt);altered.result.stop='PROVEN_WORLD_FACT';
 await assert.rejects(replayInquiryReceipts([altered],s.scope),/hash invalid/);
 const promoted=structuredClone(receipt);promoted.acceptedWorldFacts=1;
 await assert.rejects(replayInquiryReceipts([promoted],s.scope),/promoted/);
});

test('held/archived threads do not produce actionable proposals',async()=>{
 const e=await sample({hypotheses:[['B','C']]});
 for(const status of ['held','archived']){
  const result=investigateOne({...job(e),thread:{...job(e).thread,status}});
  assert.equal(result.candidateQuestions.length,0);
  assert.equal(result.stop,status==='held'?'ON_HOLD':'ARCHIVED');
 }
});
