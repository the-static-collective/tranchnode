import test from 'node:test';
import assert from 'node:assert/strict';
import {identity,makeNode,statement} from '../apps/collective/kernel.mjs';
import {MS_DAY,presumedDelta,temporalReceipt,auditTemporalReceipts,temporalProjection,strategyTimeReview} from '../apps/collective/temporal.mjs';

const fixed=Date.parse('2026-01-01T00:00:00.000Z'),day=MS_DAY;
async function setup(){const id=await identity(),scope='local:'+id.id;
 const own=await makeNode(scope,id.id,'claim',statement('door','open','supports'),'2026-01-01T00:00:00.000Z');
 const remote=await makeNode(scope,id.id,'source',{statement:statement('bus','running','supports')},'2026-01-01T00:00:00.000Z');
 const nodes=new Map([[own.id,own],[remote.id,remote]]);return {scope,own,remote,nodes};}
const p=(days,profile='ordinary',acceleration=null)=>presumedDelta({since:fixed,now:fixed+day*days,profile,acceleration});

test('presumed change likelihood grows with time, never marks an assertion false',()=>{
 const a=p(1),b=p(30),c=p(365);
 assert(a.pAtLeastOneChange<b.pAtLeastOneChange&&b.pAtLeastOneChange<c.pAtLeastOneChange);
 assert.equal(p(0).pAtLeastOneChange,0);
 assert.equal(c.empiricallyCalibrated,false);
});
test('positive acceleration increases accumulated hazard; no acceleration gives classical half-life',()=>{
 assert(p(180).pAtLeastOneChange>p(180,'ordinary',0).pAtLeastOneChange);
 const baseline=presumedDelta({since:fixed,now:fixed+90*day,profile:'ordinary',acceleration:0});
 assert.equal(baseline.pAtLeastOneChange,0.5);
});
test('explicitly time-invariant definitions do not decay into likely falsehoods',()=>{
 const invariant=p(3650,'invariant');assert.equal(invariant.pAtLeastOneChange,0);
 assert.equal(invariant.model,'EXPLICIT_TIME_INVARIANT_ASSUMPTION');
});
test('future dated checkpoints and implausible profile inputs are refused',()=>{
 assert.throws(()=>presumedDelta({since:fixed+2*day,now:fixed}),/future/);
 assert.throws(()=>presumedDelta({since:fixed,now:fixed+day,halfLifeDays:-1}),/Invalid change-rate/);
});
test('imported signed testimony has unknown original-check age even if just received',async()=>{
 const s=await setup(),result=temporalProjection(s.nodes,[],{now:fixed+8*day});
 const received=result.records.find(x=>x.nodeId===s.remote.id);
 assert.equal(received.status,'UNKNOWN_NOT_CHECKED');assert.equal(received.model,null);
 assert.equal(received.anchorKind,'NO_INDEPENDENT_CHECK_ANCHOR');
});
test('operator configuration does NOT reset age, though it changes the assumed rate',async()=>{
 const s=await setup();const r=await temporalReceipt(s.scope,{nodeId:s.own.id,profile:'rapid',reason:'Outdoor availability changes frequently'},'2026-01-07T00:00:00.000Z');
 await auditTemporalReceipts([r],s.scope,s.nodes);
 const result=temporalProjection(s.nodes,[r],{now:fixed+30*day});const item=result.records.find(x=>x.nodeId===s.own.id);
 assert.equal(item.anchorAt,s.own.createdAt);
 assert.equal(item.profile,'rapid');assert(item.model.pAtLeastOneChange>0.99);
});
test('documented unchanged check resets anchor, changed check flags unresolved state without mutating claim',async()=>{
 const s=await setup();const one=await temporalReceipt(s.scope,{nodeId:s.own.id,profile:'rapid',action:'check',reason:'Inspected actual door on this date',outcome:'unchanged',sourceReference:'photo door 2026-01-04'},'2026-01-04T00:00:00.000Z');
 const two=await temporalReceipt(s.scope,{nodeId:s.own.id,profile:'rapid',action:'check',reason:'Repeated direct physical inspection',outcome:'changed',sourceReference:'photo door 2026-01-05'},'2026-01-05T00:00:00.000Z');
 const before=JSON.stringify(s.own);const item=temporalProjection(s.nodes,[one,two],{now:fixed+6*day}).records.find(x=>x.nodeId===s.own.id);
 assert.equal(item.anchorAt,one.at);assert.equal(item.status,'RECHECK_REPORTED_CHANGE');
 assert.equal(JSON.stringify(s.own),before);
});
test('inconclusive check does not reset last unchanged anchor',async()=>{
 const s=await setup();const r=await temporalReceipt(s.scope,{nodeId:s.remote.id,profile:'fast',action:'check',reason:'No conclusive outcome available yet',outcome:'inconclusive',sourceReference:'inspection not concluded'},'2026-01-05T00:00:00.000Z');
 const item=temporalProjection(s.nodes,[r],{now:fixed+6*day}).records.find(x=>x.nodeId===s.remote.id);
 assert.equal(item.status,'UNKNOWN_NOT_CHECKED');assert.equal(item.anchorAt,null);
});
test('tamper, foreign scope, and unknown node annotation rejected',async()=>{
 const s=await setup(),r=await temporalReceipt(s.scope,{nodeId:s.own.id,profile:'ordinary',reason:'Normal state may evolve over time'},'2026-01-02T00:00:00.000Z');
 const alter={...r,profile:'invariant'};
 await assert.rejects(auditTemporalReceipts([alter],s.scope,s.nodes),/hash mismatch/);
 await assert.rejects(auditTemporalReceipts([r],s.scope.slice(0,-1)+(s.scope.endsWith('a')?'b':'a'),s.nodes),/Cross-scope/);
 await assert.rejects(auditTemporalReceipts([r],s.scope,new Map()),/unknown graph/);
});
test('elapsed time alone flags an unchanged ledger as due for review',async()=>{
 const s=await setup();const start=temporalProjection(new Map([[s.own.id,s.own]]),[],{now:fixed+1*day});
 const later=temporalProjection(new Map([[s.own.id,s.own]]),[],{now:fixed+365*day});
 assert.equal(strategyTimeReview(start).needsReview,false);
 assert.equal(strategyTimeReview(later).needsReview,true);
 assert.deepEqual(start.records[0].statement,later.records[0].statement);
});
