import test from 'node:test';
import assert from 'node:assert/strict';
import {appendDependency,replayDependencies,correlatedDelta} from '../apps/collective/dependency-delta.mjs';
import {temporalProjection,temporalReceipt} from '../apps/collective/temporal.mjs';
const scope='local:node:'+'a'.repeat(64),id=i=>'sha256:'+i.toString(16).padStart(64,'0');
const now=Date.parse('2026-01-11T00:00:00Z');
const nodes=new Map([1,2,3].map(i=>[id(i),{id:id(i),kind:'claim',createdAt:'2026-01-01T00:00:00.000Z',content:{from:'A'+i,to:'B'+i,polarity:'supports'}}]));
test('reported change triggers bounded review not fact promotion',async()=>{
 const check=await temporalReceipt(scope,{nodeId:id(1),profile:'fast',action:'check',reason:'Operator dated check note',outcome:'changed',sourceReference:'fixture://operator-confirmation'},'2026-01-08T00:00:00.000Z');
 const annotations=[check],temporal=temporalProjection(nodes,annotations,{now});
 let events=[];
 for(const [from,to,strength] of [[1,2,'strong'],[2,3,'medium'],[1,3,'weak']]){
  const r=await appendDependency(events,scope,{fromNodeId:id(from),toNodeId:id(to),strength,reason:'Possible shared change context'},{knownNodes:nodes});events=r.events;
 }
 const replay=await replayDependencies(events,scope,nodes);
 const result=correlatedDelta({nodes,temporalProjection:temporal,temporalRecords:annotations,links:replay.active,now});
 assert.equal(result.shocks.length,1);
 assert.equal(result.correlatedReviewCount,2);
 assert.equal(result.affected.find(x=>x.nodeId===id(3)).correlatedPressure,.51);
 assert.equal(result.automaticObservationChanges,0);assert.equal(result.worldTruthCertified,false);
 const tampered=structuredClone(events);tampered[0].strength='weak';
 await assert.rejects(replayDependencies(tampered,scope,nodes),/Tampered|Invalid/);
});
