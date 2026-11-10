import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {signalFeatures,forecastEarlyWarning,makeEarlyReceipt,auditEarlyReceipts} from '../apps/collective/early-warning.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const DAY=86400000,DAY0=Date.UTC(2023,0,1),NOW=Date.UTC(2025,0,1);
const T='sha256:'+'a'.repeat(64),A='sha256:'+'b'.repeat(64),B='sha256:'+'c'.repeat(64),C='sha256:'+'d'.repeat(64),SCOPE='local:node:'+'e'.repeat(64);
function rec(node,i,yes,ref=`check-${node.slice(-3)}-${i}`){return {nodeId:node,action:'check',outcome:yes?'changed':'unchanged',id:`check-${node.slice(-3)}-${i}`,sourceReference:ref,at:new Date(DAY0+i*7*DAY).toISOString()};}
function gen(n=76){let seed=42;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32;};
 const records=[];for(let i=0;i<n;i++){
  const a=i%19>=6&&i%19<14,b=i%23>=7&&i%23<15;
  records.push(rec(A,i,rand()<(a?.65:.10)),rec(B,i,rand()<(b?.65:.10)));
  records.push(rec(T,i,rand()<(a&&b?.72:.12)));
 }return records;
}
const request=(records,rest={})=>forecastEarlyWarning({records,targetNode:T,sourceNodes:[A,B],binDays:7,leadBins:1,gapBins:1,now:NOW,...rest});

test('two weak indicators and their interaction are distinct features, while missing remains unknown',()=>{
 const series=new Map([['target',new Map()], [A,new Map()],[B,new Map()]]);
 for(let i=0;i<20;i++){series.get('target').set(i,0);series.get(A).set(i,i<15?.2:.5);series.get(B).set(i,i<15?.2:.5);}
 const x=signalFeatures(19,series,{sourceNodes:[A,B]});assert(x);assert.equal(x.features.length,9);assert(x.cooccurrence);
 series.get(B).delete(19);series.get(B).delete(18);
 assert.equal(signalFeatures(19,series,{sourceNodes:[A,B]}),null);
});

test('research forecast is bounded, source-pinned, contains strictly historical training labels',()=>{
 const x=request(gen());
 assert.equal(x.schema,'motif.collective015.early-warning.v1');assert(x.evaluation);
 assert(x.backtest.every(r=>r.latestTrainingLabelBin===null||r.latestTrainingLabelBin<=r.decisionBin-1));
 assert.equal(x.sourceIndependenceVerified,false);assert.equal(x.automaticExternalActions,0);
 assert.equal(x.worldTruthCertified,false);assert(x.forecast.selectedPolicy);
});

test('future target reports do not alter a previously evaluated earlier forecast',()=>{
 const all=gen(80),now=DAY0+65*7*DAY+DAY;
 const earlier=request(all,{now});
 const modified=all.map(r=>r.nodeId===T&&Date.parse(r.at)>now?{...r,outcome:r.outcome==='changed'?'unchanged':'changed'}:r);
 assert.deepEqual(request(modified,{now}),earlier);
});

test('source duplication across indicators is flagged, never counted as independent confirmation',()=>{
 const rows=gen(80);rows.find(r=>r.nodeId===A).sourceReference='shared-provenance';
 rows.find(r=>r.nodeId===B).sourceReference='shared-provenance';
 const x=request(rows);assert.equal(x.overlappingDeclaredReferencePairs.length,1);assert.equal(x.sourceIndependenceVerified,false);
});

test('sparse checks do not manufacture an absence of change; abstains',()=>{
 const rows=[rec(A,0,false),rec(B,0,false),rec(T,0,false),rec(T,50,true)];
 const x=request(rows);assert.equal(x.forecast,null);assert.equal(x.evaluation,null);
});

test('same target cannot appear among indicators; duplicate indicators and illegal lead rejected',()=>{
 const r=gen();assert.throws(()=>request(r,{sourceNodes:[A,A]}),/distinct/);
 assert.throws(()=>request(r,{sourceNodes:[T,B]}),/distinct/);
 assert.throws(()=>request(r,{leadBins:6}),/chronology/);
});

test('tampering and cross-scope replay are detected; no automatic fact promotion',async()=>{
 const scan=request(gen());const r=await makeEarlyReceipt(SCOPE,{scan,sourceHead:null,temporalHead:'sha256:'+'4'.repeat(64)});
 await auditEarlyReceipts([r],SCOPE);
 assert.equal(r.noAutomaticEvidenceAdoption,true);
 await assert.rejects(auditEarlyReceipts([r], 'local:node:'+'f'.repeat(64)),/Invalid/);
 const modified=structuredClone(r);modified.scan.forecast.ewma=.999;
 await assert.rejects(auditEarlyReceipts([modified],SCOPE),/digest/);
});

test('reported-check timestamps do not claim event onset or causal truth',()=>{
 const r=request(gen());assert.equal(r.individualChangeOnsetsKnown,false);
 assert.equal(r.causalityEstablished,false);assert.equal(r.informationLeakageControlled,true);
});
