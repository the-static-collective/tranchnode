import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptivePolicy,testimonyPrior,strategyChange} from '../apps/collective/adaptive-strategy.mjs';
import {planExperiments} from '../apps/collective/experiment-planner.mjs';
import {route} from '../apps/collective/kernel.mjs';
const h=i=>'sha256:'+i.toString(16).padStart(64,'0'),tid=i=>'thread:'+i.toString(16).padStart(64,'0');
const ledger=h(441);
const edge=(i,a,b,polarity='supports')=>({id:h(i),kind:'claim',content:{from:a,to:b,polarity}});
const q=(from,to)=>({from,to,kind:'test_missing_relation'});
function caseOne({head=ledger,nodes=[edge(1,'A','B')]}={}){
 const jobs=[{threadId:tid(1),threadRevision:h(11),receiptId:h(12),ledgerHead:head,status:'open',
  question:{from:'A',to:'Z'},assumptions:[],candidateQuestions:[q('B','Z'),q('B','C'),q('C','Z')]}];
 const experimentPlan=planExperiments({jobs,nodes,ledgerHead:head,probeCredits:100});
 return {jobs,nodes,ledgerHead:head,experimentPlan};
}
const key=(from,to)=>JSON.stringify([from,to]);
const profiles={
 [key('B','Z')]:{pYes:0.35,pAnswered:1,cost:1},
 [key('B','C')]:{pYes:0.9,pAnswered:1,cost:1},
 [key('C','Z')]:{pYes:0.9,pAnswered:1,cost:1},
};

test('two-step lookahead selects gateway whose first step produces no supported path',()=>{
 const input=caseOne();
 const p=adaptivePolicy({...input,profiles,options:{apertureWeight:1,credits:20000}});
 assert.deepEqual([p.recommendation.from,p.recommendation.to],['B','C']);
 assert.deepEqual(p.recommendation.ifSupports,{from:'C',to:'Z'});
 assert.deepEqual(p.recommendation.ifDenies,{from:'B',to:'Z'});
 assert(p.alternatives.find(x=>x.from==='B'&&x.to==='Z').expectedTwoStepGain<p.recommendation.estimatedTwoStepNetGain);
 assert.equal(p.automaticPeerContacts,0);assert.equal(p.automaticEvidenceAdmissions,0);
 assert.equal(p.probabilityCalibrated,false);assert.equal(p.worldTruthCertified,false);
 const before=route(new Map(input.nodes.map(n=>[n.id,n])),'A','Z');
 assert.equal(before.status,'UNKNOWN_INSUFFICIENT_EVIDENCE');
 assert.equal(input.nodes.length,1);
});

test('an independently admitted denial forces a strategy pivot on an updated snapshot',()=>{
 const before=adaptivePolicy({...caseOne(),profiles});
 const afterInput=caseOne({head:h(442),nodes:[edge(1,'A','B'),edge(4,'B','C','denies')]});
 const after=adaptivePolicy({...afterInput,profiles});
 assert.equal(after.recommendation.from,'B');assert.equal(after.recommendation.to,'Z');
 const change=strategyChange(before,after);
 assert.equal(change.status,'PIVOT_AFTER_EVIDENCE');assert.equal(change.changed,true);
 assert.equal(strategyChange(before,before).status,'UNCHANGED_EVIDENCE');
});

test('only one signed key can influence testimony prior once; echo does not amplify it',()=>{
 const now=Date.parse('2026-11-10T00:00:00.000Z'),issuer='node:'+'a'.repeat(64),other='node:'+'b'.repeat(64);
 const samples=[];
 for(let i=0;i<20;i++)samples.push({issuer,from:'A'+i,to:'B'+i,polarity:'supports',accepted:true,at:now});
 const one=testimonyPrior(samples,null,{now});
 assert.equal(one.distinctSigningKeysUpperBound,1);assert.equal(one.supportsProbability,0.666667);
 samples.push({issuer:other,from:'X',to:'Y',polarity:'denies',accepted:true,at:now});
 assert.equal(testimonyPrior(samples,null,{now}).supportsProbability,0.5);
 samples.push({issuer,from:'S',to:'T',polarity:'denies',accepted:true,at:now});
 const opposed=testimonyPrior(samples,null,{now});
 assert.equal(opposed.excludedMixedPolaritySigners,1);
 assert.equal(opposed.distinctSigningKeysUpperBound,1);
 assert.equal(opposed.supportsProbability,0.333333);
});

test('cost and refusal probability can justify abstention rather than spurious inquiry',()=>{
 const policy=adaptivePolicy({...caseOne(),profiles:{},options:{defaultCost:30,defaultAnsweredProbability:0,
  defaultSupportsProbability:0.5,apertureWeight:0,credits:20000}});
 assert.equal(policy.status,'ABSTAIN_NONPOSITIVE_VALUE');assert.equal(policy.recommendation,null);
});

test('invalid/stale provenance, impossible forecasts, and inadequate budget all refuse',()=>{
 const input=caseOne();
 assert.throws(()=>adaptivePolicy({...input,ledgerHead:h(444)}),/current COLLECTIVE-008|Stale/);
 assert.throws(()=>adaptivePolicy({...input,profiles:{[key('B','C')]:{pYes:1.1}}}),/profile/);
 assert.throws(()=>adaptivePolicy({...input,options:{credits:23}}),/Invalid model budget/);
});

test('inconclusive response preserves the observed ledger and offers an alternative',()=>{
 const p=adaptivePolicy({...caseOne(),profiles:{[key('B','C')]:{pYes:0.9,pAnswered:0.75,cost:1},
   [key('C','Z')]:{pYes:0.9,pAnswered:1,cost:1},
   [key('B','Z')]:{pYes:0.35,pAnswered:1,cost:1}}});
 const first=p.alternatives.find(x=>x.from==='B'&&x.to==='C');
 assert(first.contingencies.some(x=>x.answer==='unknown'&&x.assumedProbability===0.25));
 assert.equal(p.conditionalSupportedPathsBaseline,0);
});

test('no route can be made from an unrelated unreachable question',()=>{
 const input=caseOne();input.jobs[0].candidateQuestions=[q('X','Y')];
 input.experimentPlan=planExperiments({jobs:input.jobs,nodes:input.nodes,ledgerHead:input.ledgerHead,probeCredits:10});
 const result=adaptivePolicy(input);
 assert.equal(result.recommendation,null);
 assert.equal(result.status,'ABSTAIN_NONPOSITIVE_VALUE');
});


test('time-aware source testimony prior decays without declaring real-world calibration',()=>{
 const now=Date.parse('2026-11-10T00:00:00.000Z');
 const sample=[{issuer:'node:'+'a'.repeat(64),from:'X',to:'Y',polarity:'supports',accepted:true,at:now-100*86400000},
   {issuer:'node:'+'b'.repeat(64),from:'M',to:'N',polarity:'denies',accepted:true,at:now}];
 const p=testimonyPrior(sample,null,{now,halfLifeDays:30});
 assert(p.supportsProbability<0.5);
 assert.equal(p.empiricallyCalibrated,false);
});

test('insufficient simulation credits result in a refusal, never a partial recommended plan',()=>{
 const jobs=[],nodes=[edge(1,'A','B')];
 for(let i=0;i<24;i++)jobs.push({threadId:tid(i+1),threadRevision:h(i+100),receiptId:h(i+200),status:'open',
  ledgerHead:ledger,question:{from:'A',to:'D'},assumptions:[],candidateQuestions:[q('B','D')]});
 const experimentPlan={schema:'motif.collective008.experiment-plan.v1',ledgerHead:ledger,
  sourceThreadCount:24,sourceReceipts:jobs.map(j=>({threadId:j.threadId,threadRevision:j.threadRevision,receiptId:j.receiptId})),
  candidates:[{from:'B',to:'D',priority:101,sourceThreadCount:24,provenance:[]}]};
 assert.throws(()=>adaptivePolicy({jobs,nodes,ledgerHead:ledger,experimentPlan,options:{credits:24}}),/Simulation credit budget exhausted/);
});
