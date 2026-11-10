import test from 'node:test';
import assert from 'node:assert/strict';
import {candidatePriority,decisionEntropyBits,frequencyOnly,planExperiments} from '../apps/collective/experiment-planner.mjs';
import {makePlanReceipt,planFreshness,replayPlanReceipts} from '../apps/collective/experiment-receipts.mjs';
import {route} from '../apps/collective/kernel.mjs';

const tid=i=>'thread:'+i.toString(16).padStart(64,'0');
const h=i=>'sha256:'+i.toString(16).padStart(64,'0');
const ledger=h(111);
const source=(id,from,to,polarity='supports')=>({id:h(id),kind:'claim',content:{from,to,polarity}});
const job=(i,from,to,questions,assumptions=[])=>({threadId:tid(i),threadRevision:h(i+400),receiptId:h(i+900),
 ledgerHead:ledger,status:'open',question:{from,to},candidateQuestions:questions.map(([a,b])=>({from:a,to:b,kind:'test_missing_relation'})),assumptions});
const q=(from,to)=>[from,to];
function arrange(){
 const nodes=[source(1,'A','B'),source(2,'C','D'),source(3,'E','B'),source(4,'C','F'),source(5,'G','B')];
 const jobs=[job(1,'A','D',[q('B','C')]),job(2,'E','F',[q('B','C')]),job(3,'G','D',[q('B','C')]),job(4,'H','K',[q('I','J')])];
 return {jobs,nodes,ledgerHead:ledger,probeCredits:80};
}

test('cross-thread discriminating bridge outranks private or unrelated candidates, with source receipts',()=>{
 const plan=planExperiments(arrange());
 assert.equal(plan.recommendation.from,'B');assert.equal(plan.recommendation.to,'C');
 assert.equal(plan.candidates[0].decisionThreadCount,3);
 assert.equal(plan.candidates[0].conditionalPathSplitCount,3);
 assert.equal(plan.candidates[0].sourceThreadCount,3);
 assert.equal(plan.candidates[0].jointInformationUpperBoundBits,1); // correlated across threads
 assert.equal(plan.candidates.find(c=>c.from==='I').decisionThreadCount,0);
 assert.equal(plan.candidates[0].provenance.length,3);
 assert.equal(plan.automaticPeerContacts,0);
 assert.equal(plan.automaticEvidenceAdmissions,0);
 assert.equal(plan.worldTruthCertified,false);
});

test('frequency-only heuristic is fooled by common but irrelevant question',()=>{
 const nodes=[source(1,'A','B'),source(2,'C','D')];
 const jobs=[job(1,'A','D',[q('Z','Y'),q('B','C')]),job(2,'P','Q',[q('Z','Y')]),job(3,'S','T',[q('Z','Y')])];
 assert.equal(frequencyOnly(jobs)[0].from,'Z');
 const selected=planExperiments({jobs,nodes,ledgerHead:ledger,probeCredits:32});
 assert.equal(selected.recommendation.from,'B');
 assert.equal(selected.candidates[0].decisionThreadCount,1);
});

test('counterfactual probes never mutate evidence or make the negative answer a fact',()=>{
 const input=arrange(),original=JSON.stringify(input.nodes);
 const plan=planExperiments(input);
 assert.equal(JSON.stringify(input.nodes),original);
 const impact=plan.candidates[0].impacts[0];
 assert.equal(impact.ifSupports.status,'PATH_SUPPORTED_BY_ASSERTIONS');
 assert.equal(impact.ifDenies.status,'UNKNOWN_INSUFFICIENT_EVIDENCE');
 assert.equal(impact.needsIndependentEvidence,true);
 assert.equal(plan.probabilityCalibrated,false);
});

test('budget is strictly enforced without partial cross-thread candidate scoring',()=>{
 const inps=arrange();inps.probeCredits=4;
 const plan=planExperiments(inps);
 assert.equal(plan.creditsSpent,2);
 assert.equal(plan.creditsRemaining,2);
 assert.equal(plan.unevaluatedCandidateCount,1);
 assert.equal(plan.candidates.length,1);
 assert.equal(plan.recommendation,null); // candidate has no demonstrated discrimination
 assert.equal(plan.selectionStatus,'PARTIAL_BUDGET');
});

test('rejects stale evidence, duplicated threads, malformed edges, unsafe budgets',()=>{
 const inp=arrange();
 assert.throws(()=>planExperiments({...inp,jobs:[{...inp.jobs[0],ledgerHead:h(222)}]}),/stale/);
 assert.throws(()=>planExperiments({...inp,jobs:[inp.jobs[0],inp.jobs[0]]}),/repeated/);
 assert.throws(()=>planExperiments({...inp,probeCredits:513}),/budget/);
 assert.throws(()=>planExperiments({...inp,jobs:[{...inp.jobs[0],candidateQuestions:[{from:'',to:'X',kind:'bad'}]}]}),/Edges/);
});

test('held threads are rejected as candidate decision sources',()=>{
 const i=arrange();i.jobs[0].status='held';
 assert.throws(()=>planExperiments(i),/active inquiry/);
});

test('candidate utility distinguishes correlated joint information from branch count',()=>{
 const a={status:'UNKNOWN_INSUFFICIENT_EVIDENCE',path:[]};
 const b={status:'PATH_SUPPORTED_BY_ASSERTIONS',path:['A','B']};
 assert.equal(decisionEntropyBits(a,a),0);
 assert.equal(decisionEntropyBits(a,b),1);
 assert(candidatePriority({decisionThreads:3,conjecturedProgress:0,sourceThreadCount:3})>
        candidatePriority({decisionThreads:1,conjecturedProgress:1,sourceThreadCount:1}));
});

test('tampering with a proposal receipt is caught; staleness is explicit',async()=>{
 const plan=planExperiments(arrange()),scope='local:node:'+'a'.repeat(64),receipt=await makePlanReceipt(scope,plan);
 await replayPlanReceipts([receipt],scope);
 const threads=new Map(arrange().jobs.map(j=>[j.threadId,{revision:j.threadRevision,status:'open'}]));
 const sourceReceipts=arrange().jobs.map(j=>({id:j.receiptId}));
 assert.equal(planFreshness(plan,threads,sourceReceipts,ledger),'CURRENT_SNAPSHOT');
 assert.equal(planFreshness(plan,threads,sourceReceipts,h(44)),'STALE_EVIDENCE');
 threads.get(tid(1)).revision=h(45);
 assert.equal(planFreshness(plan,threads,sourceReceipts,ledger),'STALE_THREAD');
 const copy=structuredClone(receipt);copy.plan.candidates[0].priority=10000;
 await assert.rejects(replayPlanReceipts([copy],scope),/digest mismatch/);
});

test('independent observed graph is not modified across planning runs',()=>{
 const inps=arrange();
 const before=route(new Map(inps.nodes.map(n=>[n.id,n])),'A','D');
 assert.equal(before.status,'UNKNOWN_INSUFFICIENT_EVIDENCE');
 planExperiments(inps);
 const after=route(new Map(inps.nodes.map(n=>[n.id,n])),'A','D');
 assert.deepEqual(after,before);
});
