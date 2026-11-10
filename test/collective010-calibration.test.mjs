import test from 'node:test';
import assert from 'node:assert/strict';
import {makeResolutionReceipt,auditResolutionReceipts,independentCases,fitResolutionPrior,scoreChronological,calibratedProfiles} from '../apps/collective/calibration.mjs';
import {route} from '../apps/collective/kernel.mjs';
const scope='local:node:'+'a'.repeat(64);
const at=i=>new Date(Date.UTC(2026,0,1)+i*86400000).toISOString();
const mk=(i,outcome='supports',{tag='general',groupId='group:'+i,when=at(i),method='sealed_benchmark',ref='sealed:external-oracle:'+i}={})=>
 makeResolutionReceipt(scope,{caseId:'case:'+i,groupId,tag,question:{from:'A',to:'B'},outcome,method,
 sourceReference:ref},when);
const rows=async(n,outcomes=()=> 'supports')=>Promise.all(Array.from({length:n},(_,i)=>mk(i,outcomes(i))));

test('manual resolution must name a separate check; identity signatures and agreement are not ground truth',async()=>{
 await assert.rejects(mk(1,'supports',{method:'peer_agreement'}),/Unknown independent-check/);
 await assert.rejects(mk(1,'supports',{ref:'x'}),/reference/);
 await assert.rejects(makeResolutionReceipt(scope,{caseId:'abc',groupId:'xyz',tag:'general',question:{from:'X',to:'Y'},outcome:'supports',
   method:'documented_third_party',sourceReference:'ref:published'},'invalid'),/scope or time/);
 const item=await mk(1);
 assert.equal(item.worldFactCertified,false);
 assert.equal(item.independentCheck,'USER_DECLARED_NOT_AUTOMATICALLY_VERIFIED');
 assert.equal(item.importedIntoEvidenceLedger,false);
});

test('source reference and claimed labels are integrity checked on replay, with no duplicated case',async()=>{
 const r=await rows(2);assert.equal((await auditResolutionReceipts(r,scope)).length,2);
 const tampered=structuredClone(r);tampered[0].outcome='denies';
 await assert.rejects(auditResolutionReceipts(tampered,scope),/digest/);
 const dupe=await mk(0,'denies',{groupId:'other:0'});
 await assert.rejects(auditResolutionReceipts([...r,dupe],scope),/Duplicate resolution identity or case/);
 await assert.rejects(auditResolutionReceipts(r,'local:node:'+'b'.repeat(64)),/Invalid or misrepresented/);
});

test('correlated echo group contributes once; mixed polarity group goes on hold',async()=>{
 const r=[await mk(1,'supports',{groupId:'family:a'}),await mk(2,'supports',{groupId:'family:a'}),
    await mk(3,'denies',{groupId:'family:b'}),await mk(4,'supports',{groupId:'family:b'})];
 const examined=independentCases(r);
 assert.equal(examined.independentGroupsDeclared,1);
 assert.equal(examined.echoRemoved,3);
 assert.equal(examined.conflictedGroupsHeld,1);
 const fit=fitResolutionPrior(r,{now:Date.parse(at(9)),minGroups:2});
 assert.equal(fit.eligible,false);assert.equal(fit.declaredIndependentGroups,1);
});

test('warmup and explicit opt-in: no confidence override for insufficient cases',async()=>{
 const plan={candidates:[{from:'A',to:'B'},{from:'B',to:'C'}]};
 const before=calibratedProfiles(plan,await rows(7),{now:Date.parse(at(20))});
 assert.equal(before.overrides,0);assert.deepEqual(before.profiles,{});
 const after=calibratedProfiles(plan,await rows(8),{now:Date.parse(at(20))});
 assert.equal(after.overrides,2);
 assert(after.fit.pYes>.5);
 assert.equal(after.fit.heldOutValidated,false);
});

test('unresolved independent checks affect answerability but do not count as denials',async()=>{
 const a=await rows(12,i=>i<6?'inconclusive':'supports');
 const fit=fitResolutionPrior(a,{now:Date.parse(at(20)),halfLifeDays:365});
 assert(fit.pAnswered<.85);
 assert(fit.pYes>.5);
 const allDenies=fitResolutionPrior(await rows(12,()=> 'denies'),{now:Date.parse(at(20))});
 assert(allDenies.pYes<.5);
});

test('predicting a case excludes that case and all future outcomes',async()=>{
 const items=await rows(14,i=>i<10?'supports':'denies');
 const scored=scoreChronological(items,{halfLifeDays:365});
 assert.equal(scored.evaluatedAfterWarmup,6);
 assert.equal(scored.forecasts[0].caseId,'case:8');
 assert.equal(scored.forecasts[0].priorCases,8);
 const first=scored.forecasts[0];
 const alternate=items.map(x=>structuredClone(x));
 for(let i=8;i<alternate.length;i++)alternate[i].outcome='supports';
 const scoredChangedFuture=scoreChronological(alternate,{halfLifeDays:365});
 assert.equal(scoredChangedFuture.forecasts[0].pYes,first.pYes);
 assert.equal(scoredChangedFuture.forecasts[0].pAnswered,first.pAnswered);
});

test('one family does not train a different question family',async()=>{
 const a=await rows(12,()=> 'supports');
 assert.equal(fitResolutionPrior(a,{tag:'physical',now:Date.parse(at(20))}).eligible,false);
 assert.equal(fitResolutionPrior(a,{tag:'general',now:Date.parse(at(20))}).eligible,true);
});

test('past-only scoring makes failure measurable and cannot certify actual world facts',async()=>{
 const fit=scoreChronological(await rows(24,i=>i<16?'supports':'denies'),{halfLifeDays:60});
 assert.equal(fit.prequential,true);
 assert.equal(fit.declaredIndependenceNotVerified,true);
 assert(fit.supportsConditionalOnAnswer.modelBrier>=0);
 assert(fit.supportsConditionalOnAnswer.modelLogLoss>=0);
 assert.equal(fit.supportsConditionalOnAnswer.evaluated,16);
});

test('calibrating a research strategy does not alter the observed evidence graph',async()=>{
 const nodes=new Map([['local',{id:'local',kind:'claim',content:{from:'A',to:'C',polarity:'supports'}}]]);
 const before=route(nodes,'A','B');
 const r=calibratedProfiles({candidates:[{from:'C',to:'B'}]},await rows(12),{now:Date.parse(at(18))});
 assert.equal(r.overrides,1);
 assert.deepEqual(route(nodes,'A','B'),before);
 assert.equal(r.guarantee.includes('not an externally certified'),true);
});

test('future contradictory echoes cannot decide which past cases get evaluated',async()=>{
 const past=await rows(14,i=>i<9?'supports':'denies');
 const future=await mk(99,'denies',{groupId:'group:0',when:at(99)});
 const a=scoreChronological(past),b=scoreChronological([...past,future]);
 assert.deepEqual(b.forecasts,a.forecasts);
 assert.equal(b.discardedEchoes,1);
 assert.equal(b.heldConflictedGroups,1);
});

test('date ties are not future evidence: same timestamp cases cannot train each other',async()=>{
 const same=await Promise.all(Array.from({length:10},(_,i)=>mk(i,'supports',{when:at(0)})));
 const scores=scoreChronological(same);
 assert.equal(scores.answered.evaluated,0);
});
