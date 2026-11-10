import test from 'node:test';
import assert from 'node:assert/strict';
import {identity,makeNode,append,replay,statement,route,sha,makeBundle,receive} from '../apps/collective/kernel.mjs';
import {createThread,assume,retract,markThread,replayThreads,evaluateThread,THREAD_CAP,ASSUMPTION_CAP} from '../apps/collective/threads.mjs';

async function owner(){const ident=await identity();return {ident,scope:'local:'+ident.id,events:[],research:[]};}
async function claim(w,from,to,polarity='supports'){
 const n=await makeNode(w.scope,w.ident.id,'claim',statement(from,to,polarity));
 w.events=await append(w.events,w.scope,w.ident.id,n);return n.id;
}
async function newThread(w,title,from='A',to='D',opts={}){
 const result=await createThread(w.research,w.scope,title,from,to,w.events.at(-1)?.id??null,opts);
 w.research=result.events;return result.id;
}
async function hypothetical(w,id,from,to,polarity='supports'){
 w.research=await assume(w.research,w.scope,id,from,to,polarity);
}
async function evaluate(w,id){
 const t=(await replayThreads(w.research,w.scope)).get(id);
 return evaluateThread(t,(await replay(w.events,w.scope)).nodes,w.events.at(-1)?.id??null);
}

test('several independent what-if threads hold simultaneous contradictory possible futures without mutating observed evidence',async()=>{
 const w=await owner();await claim(w,'A','B');
 const past=JSON.stringify(w.events);
 const north=await newThread(w,'North route'),south=await newThread(w,'South route');
 await hypothetical(w,north,'B','C');await hypothetical(w,north,'C','D');
 await hypothetical(w,south,'B','Z');await hypothetical(w,south,'Z','D');
 const result1=await evaluate(w,north),result2=await evaluate(w,south);
 assert.equal(result1.status,'CONDITIONAL_PATH_WITH_HYPOTHESES');
 assert.equal(result2.status,'CONDITIONAL_PATH_WITH_HYPOTHESES');
 assert.deepEqual(result1.path,['A','B','C','D']);assert.deepEqual(result2.path,['A','B','Z','D']);
 assert.equal(result1.observedStatus,'UNKNOWN_INSUFFICIENT_EVIDENCE');
 assert.equal(result1.assumptionsUsed.length,2);
 assert.deepEqual(result1.evidenceIds.length,1);
 assert.equal(JSON.stringify(w.events),past);
 assert.equal((await replay(w.events,w.scope)).nodes.size,1);
});

test('what-if fork copies exact pinned assumptions; parent edits cannot rewrite child history',async()=>{
 const w=await owner();await claim(w,'A','B');
 const parent=await newThread(w,'Parent');await hypothetical(w,parent,'B','C');
 const child=await newThread(w,'Child','A','D',{parentId:parent});
 const p1=(await replayThreads(w.research,w.scope)).get(parent);
 const childBefore=(await replayThreads(w.research,w.scope)).get(child);
 assert.equal(childBefore.parent.digest,p1.revision);
 assert.equal(childBefore.assumptions.size,1);
 const assumption=[...p1.assumptions.keys()][0];
 w.research=await retract(w.research,w.scope,parent,assumption);
 assert.equal((await replayThreads(w.research,w.scope)).get(parent).assumptions.size,0);
 assert.equal((await replayThreads(w.research,w.scope)).get(child).assumptions.size,1);
 await hypothetical(w,child,'C','D');
 assert.equal((await evaluate(w,child)).status,'CONDITIONAL_PATH_WITH_HYPOTHESES');
 assert.equal((await evaluate(w,parent)).status,'UNKNOWN_INSUFFICIENT_EVIDENCE');
});

test('new negative hypothetical against observed assertion preserves explicit contradiction',async()=>{
 const w=await owner();await claim(w,'A','B');await claim(w,'B','C');
 const t=await newThread(w,'What if B-C is broken?','A','C');
 await hypothetical(w,t,'B','C','denies');
 const report=await evaluate(w,t);
 assert.equal(report.status,'HOLD_CONTRADICTION');
 assert.equal(report.tensions.length,1);
 assert.equal(report.observedStatus,'PATH_SUPPORTED_BY_ASSERTIONS');
 assert.equal(report.automaticPromotion,false);
});

test('hypothetical alternative is not promoted after an actual, authenticated source arrives',async()=>{
 const a=await owner(),b=await owner();await claim(a,'A','B');
 const t=await newThread(a,'Possible missing connection','A','C');
 await hypothetical(a,t,'B','C');
 const before=await evaluate(a,t);
 assert.equal(before.status,'CONDITIONAL_PATH_WITH_HYPOTHESES');
 const id=await claim(b,'B','C');
 const bundle=await makeBundle(b.ident,(await replay(b.events,b.scope)).nodes,[id]);
 a.events=(await receive(a.events,a.scope,a.ident.id,bundle)).events;
 const after=await evaluate(a,t);
 assert.equal(after.observedStatus,'PATH_SUPPORTED_BY_ASSERTIONS');
 assert.equal(after.assumptions.length,1); // still a hypothesis, not rewritten as fact
 assert.equal(after.verifiedWorldTruth,false);
 const p=(await replayThreads(a.research,a.scope)).get(t);
 assert.equal(p.baseLedgerHead,before.createdAgainst);
});

test('retract and archive events keep their lineage, archived branch is immutable',async()=>{
 const w=await owner(),id=await newThread(w,'Temporary');
 await hypothetical(w,id,'A','C');
 const prior=[...(await replayThreads(w.research,w.scope)).get(id).assumptions.keys()][0];
 w.research=await retract(w.research,w.scope,id,prior);
 assert.equal((await replayThreads(w.research,w.scope)).get(id).assumptions.size,0);
 w.research=await markThread(w.research,w.scope,id,'held');
 w.research=await markThread(w.research,w.scope,id,'archived');
 assert.equal((await replayThreads(w.research,w.scope)).get(id).events,5);
 await assert.rejects(assume(w.research,w.scope,id,'B','D','supports'),/archived/);
});

test('tampering with parent revision or research event never passes replay',async()=>{
 const w=await owner(),a=await newThread(w,'A');await hypothetical(w,a,'A','B');
 await newThread(w,'Fork','A','D',{parentId:a});
 const swapped=structuredClone(w.research);
 swapped[1].op.assumption.to='FORGED';
 await assert.rejects(replayThreads(swapped,w.scope),/integrity/);
 const badFork=structuredClone(w.research);
 badFork[2].op.parent.digest='sha256:'+'1'.repeat(64);
 const {slot,digest,...body}=badFork[2];
 badFork[2].digest=await sha(body);
 await assert.rejects(replayThreads(badFork,w.scope),/fork parent/);
});

test('branch cap and per-branch assumption cap refuse unbounded search',async()=>{
 const w=await owner();const t=await newThread(w,'Capacity test');
 for(let i=0;i<ASSUMPTION_CAP;i++)await hypothetical(w,t,'A'+i,'B'+i);
 await assert.rejects(assume(w.research,w.scope,t,'A99','B99','supports'),/excessive/);
 for(let i=1;i<THREAD_CAP;i++)await newThread(w,'Scenario '+i);
 await assert.rejects(createThread(w.research,w.scope,'Overbound','A','B',null),/capacity/);
});

test('research evaluations remain deterministic across shuffled storage enumeration',async()=>{
 const w=await owner(),a=await newThread(w,'Alpha'),b=await newThread(w,'Beta');
 await hypothetical(w,a,'A','B');await hypothetical(w,b,'A','C');
 const f=await replayThreads(w.research,w.scope),r=await replayThreads([...w.research].reverse(),w.scope);
 assert.deepEqual([...f.keys()].sort(),[...r.keys()].sort());
 assert.deepEqual([...f.get(a).assumptions],[...r.get(a).assumptions]);
});
