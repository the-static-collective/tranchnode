import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {checkBuckets,forecastFromPast,regimeFeatures,fitRegime,scanRegimes,makeRegimeReceipt,auditRegimeReceipts} from '../apps/collective/regime-forecast.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const DAY=86400000,start=Date.UTC(2022,0,3),now=Date.UTC(2026,0,1),A='sha256:'+'a'.repeat(64),B='sha256:'+'b'.repeat(64),scope='local:node:'+'c'.repeat(64);
const r=(i,outcome,id=A,source='independent-check-'+i)=>({id:'r-'+id.slice(-1)+'-'+i,nodeId:id,action:'check',
 outcome,sourceReference:source,at:new Date(start+i*7*DAY).toISOString()});
const series=(n=80)=>Array.from({length:n},(_,i)=>r(i,i<n/2?'unchanged':'changed'));
test('missing observations and inconclusive checks are not unchanged',()=>{
 const x=checkBuckets({records:[r(0,'changed'),r(2,'inconclusive'),r(8,'unchanged')],nodeId:A,now});
 assert.equal(x.bins.length,2);assert.equal(x.unobservedBins,7);assert.equal(x.inconclusive,1);
});
test('identical literal source reference is de-duplicated',()=>{
 const x=checkBuckets({records:[r(0,'changed',A,'same-source-01'),r(1,'changed',A,'same-source-01')],nodeId:A,now});
 assert.equal(x.reportCount,1);assert.equal(x.duplicateReferencesDropped,1);
});
test('future checks do not inform the model',()=>{
 const future={...r(1,'changed'),at:new Date(now+DAY).toISOString()};
 assert.equal(checkBuckets({records:[r(0,'unchanged'),future],nodeId:A,now}).reportCount,1);
});
test('acceleration is defined only with checked contiguous calendar buckets',()=>{
 const bins=Array.from({length:12},(_,i)=>({index:i,rate:i<4?0:i<8?.2:.9}));
 assert(regimeFeatures(bins).acceleration>0);
 bins[10].index=100;assert.equal(regimeFeatures(bins).acceleration,null);
});
test('volatility burst and potential regular cycle are only research candidates',()=>{
 const high=[.5,.5,.5,.5,.5,.5,.5,.5,0,1,0,1].map((rate,index)=>({index,rate}));
 assert.equal(regimeFeatures(high).activity,'VOLATILITY_CLUSTER_CANDIDATE');
 const cycle=Array.from({length:40},(_,index)=>({index,rate:index%3===0?1:0}));
 assert.equal(regimeFeatures(cycle).cycle.lagBins,3);
 assert.equal(regimeFeatures(cycle).cycle.needsIndependentHoldout,true);
});
test('predeclared forecaster uses past, not held-out target',()=>{
 const records=series(),last=records.at(-1);const changed=records.map(x=>x===last?{...x,outcome:'unchanged'}:x);
 const x=fitRegime({records,nodeId:A,now,gapBins:2}),y=fitRegime({records:changed,nodeId:A,now,gapBins:2});
 assert.equal(x.chronologicalForecasts.at(-1).forecast,y.chronologicalForecasts.at(-1).forecast);
 assert.notEqual(x.chronologicalForecasts.at(-1).observedRate,y.chronologicalForecasts.at(-1).observedRate);
 assert(x.evaluation.observations>=6);assert.equal(x.causalityEstablished,false);
});
test('sparse history abstains; no causal or world-fact promotion',()=>{
 const result=fitRegime({records:series(6),nodeId:A,now});
 assert.equal(result.status,'INSUFFICIENT_CHECKED_HISTORY');assert.equal(result.nextCheckForecast,null);
 const nodes=new Map([[A,{id:A,kind:'claim'}],[B,{id:B,kind:'source'}]]),original=nodes.size;
 const scan=scanRegimes({records:series(30),nodes,now});
 assert.equal(nodes.size,original);assert.equal(scan.automaticResearchContacts,0);
});
test('receipt hashes and scope protect locally stored research from silent changes',async()=>{
 const nodes=new Map([[A,{id:A,kind:'claim'}]]);
 const scan=scanRegimes({records:series(),nodes,now});
 const proof=await makeRegimeReceipt(scope,{result:scan,sourceHead:null,temporalHead:'sha256:'+'e'.repeat(64)});
 await auditRegimeReceipts([proof],scope);
 const forged=structuredClone(proof);forged.result.results[0].status='CERTAIN';
 await assert.rejects(auditRegimeReceipts([forged],scope),/hash mismatch/);
 await assert.rejects(auditRegimeReceipts([proof],'local:node:'+'f'.repeat(64)),/scope/);
});
