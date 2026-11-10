import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {scheduleInvestigations} from '../apps/collective/inquiry-engine.mjs';
const TH='thread:'+ 'f'.repeat(64);
const job=id=>({thread:{id,revision:'sha256:'+'a'.repeat(64),status:'open',parent:null,
 question:{from:'A',to:'D'},assumptions:[{id:'assumption:'+'b'.repeat(64),from:'B',to:'C',polarity:'supports'}]},
 nodes:[{id:'source1',kind:'claim',content:{from:'A',to:'B',polarity:'supports'}},
 {id:'source2',kind:'claim',content:{from:'C',to:'D',polarity:'supports'}}],ledgerHead:'sourcehead',budget:18});
function realWorker(task){
 return new Promise((resolve,reject)=>{
  const w=new Worker(new URL('./collective007-worker-bootstrap.mjs',import.meta.url),{type:'module'});
  const stop=setTimeout(()=>{w.terminate();reject(Error('Worker timed out'));},3000);
  w.on('message',msg=>{clearTimeout(stop);w.terminate();msg.ok?resolve(msg.result):reject(Error(msg.error));});
  w.on('error',err=>{clearTimeout(stop);w.terminate();reject(err);});
  w.postMessage({id:task.thread.id,job:task});
 });
}
test('three real worker threads isolate separate what-if experiments',async()=>{
 const tasks=[0,1,2].map(i=>job('thread:'+i.toString(16).padStart(64,'0')));
 const result=await scheduleInvestigations(tasks,{concurrency:3,executor:realWorker});
 assert.equal(result.maxActive,3);
 assert.equal(result.results.length,3);
 for(const r of result.results){
  assert.equal(r.scenarioStatus,'PATH_SUPPORTED_BY_ASSERTIONS');
  assert.equal(r.observedStatus,'UNKNOWN_INSUFFICIENT_EVIDENCE');
  assert.equal(r.automaticPeerContact,false);
 }
});
