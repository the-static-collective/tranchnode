/** COLLECTIVE-012 — shared-change review, NOT automatic change inference.
 * Declared links are hypotheses. A reported change may raise recheck priority.
 * Review weights are heuristic and never probabilities or fact updates.
 */
import {sha} from './kernel.mjs';
import {evaluateThread} from './threads.mjs';
export const DEPENDENCY_SCHEMA='motif.collective012.dependency-event.v1';
export const DEPENDENCY_CAP=512, MAX_HOPS=3;
const weights={weak:.3,medium:.6,strong:.85};
const scopeOK=x=>typeof x==='string'&&/^local:node:[0-9a-f]{64}$/.test(x);
const nodeOK=x=>typeof x==='string'&&/^sha256:[0-9a-f]{64}$/.test(x);
const check=(x,msg)=>{if(!x)throw Error(msg);};
function validEvent(x,scope,nodes){
 check(x?.schema===DEPENDENCY_SCHEMA&&x.scope===scope&&scopeOK(scope)&&Number.isSafeInteger(x.sequence)&&x.sequence>0&&
 typeof x.id==='string'&&x.id.startsWith('sha256:')&&x.operatorDeclared===true&&x.worldTruthCertified===false&&
 x.automaticObservationChanges===0&&x.automaticPeerContacts===0&&
 typeof x.reason==='string'&&x.reason.trim()===x.reason&&x.reason.length>=8&&x.reason.length<=240,'Invalid dependency event');
 check(typeof x.at==='string'&&Number.isFinite(Date.parse(x.at))&&new Date(x.at).toISOString()===x.at,'Invalid timestamp');
 if(x.action==='link'){
  check(nodeOK(x.fromNodeId)&&nodeOK(x.toNodeId)&&x.fromNodeId!==x.toNodeId&&
   ['depends_on','shared_context'].includes(x.kind)&&Object.hasOwn(weights,x.strength)&&x.linkId===null,'Invalid relation');
  if(nodes)check(nodes.has(x.fromNodeId)&&nodes.has(x.toNodeId),'Unknown graph relation');
 }else check(x.action==='unlink'&&x.fromNodeId===null&&x.toNodeId===null&&x.kind===null&&x.strength===null&&
   typeof x.linkId==='string'&&x.linkId.startsWith('sha256:'),'Invalid retraction');
}
export async function replayDependencies(events,scope,nodes=null){
 check(scopeOK(scope)&&Array.isArray(events)&&events.length<=DEPENDENCY_CAP,'Invalid scope or event bound');
 let prev=null;const active=new Map();
 for(const [i,e] of [...events].sort((a,b)=>a.sequence-b.sequence).entries()){
  validEvent(e,scope,nodes);
  check(e.sequence===i+1&&e.previousDigest===prev,'Broken event ancestry');
  const {id,...body}=e;check(id===await sha(body),'Tampered dependency declaration');
  if(e.action==='link'){
   check(![...active.values()].some(x=>x.fromNodeId===e.fromNodeId&&x.toNodeId===e.toNodeId&&x.kind===e.kind),'Repeated active link');
   active.set(e.id,e);
  }else{check(active.has(e.linkId),'Retraction of missing link');active.delete(e.linkId);}
  prev=e.id;
 }
 return {active:[...active.values()],head:prev,count:events.length};
}
export async function appendDependency(events,scope,input,{at=new Date().toISOString(),knownNodes=null}={}){
 const prior=await replayDependencies(events,scope,knownNodes);
 check(prior.count<DEPENDENCY_CAP,'Dependency event bound reached');
 const linked=input.action!=='unlink';
 const body={schema:DEPENDENCY_SCHEMA,scope,sequence:events.length+1,previousDigest:prior.head,at,
 action:linked?'link':'unlink',reason:input.reason,
 fromNodeId:linked?input.fromNodeId:null,toNodeId:linked?input.toNodeId:null,
 kind:linked?(input.kind??'depends_on'):null,strength:linked?(input.strength??'medium'):null,
 linkId:linked?null:input.linkId,operatorDeclared:true,worldTruthCertified:false,
 automaticObservationChanges:0,automaticPeerContacts:0};
 const event={id:await sha(body),...body};
 await replayDependencies([...events,event],scope,knownNodes);
 return {events:[...events,event],event};
}
export function correlatedDelta({nodes,temporalProjection,temporalRecords,links,now=Date.now(),maxHops=MAX_HOPS}){
 check(nodes instanceof Map&&Array.isArray(temporalProjection?.records)&&Array.isArray(temporalRecords)&&Array.isArray(links)&&
 Number.isFinite(now)&&now>=0&&Number.isInteger(maxHops)&&maxHops>=1&&maxHops<=MAX_HOPS&&nodes.size<=2000&&links.length<=DEPENDENCY_CAP,'Invalid projection');
 const byId=new Map(temporalProjection.records.map(x=>[x.nodeId,x]));
 const latest=new Map();
 for(const e of temporalRecords.filter(x=>x.action==='check').sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id)))latest.set(e.nodeId,e);
 const outgoing=new Map();
 for(const l of links){
  check(byId.has(l.fromNodeId)&&byId.has(l.toNodeId)&&Object.hasOwn(weights,l.strength)&&['shared_context','depends_on'].includes(l.kind),'Invalid active link');
  const dirs=[[l.fromNodeId,l.toNodeId]];
  if(l.kind==='shared_context')dirs.push([l.toNodeId,l.fromNodeId]);
  for(const [from,to] of dirs){if(!outgoing.has(from))outgoing.set(from,[]);outgoing.get(from).push({to,w:weights[l.strength],id:l.id});}
 }
 const shocks=[...latest].filter(([id,e])=>e.outcome==='changed'&&byId.get(id)?.status==='RECHECK_REPORTED_CHANGE')
  .map(([nodeId,e])=>({nodeId,at:e.at,receiptId:e.id})).sort((a,b)=>a.nodeId.localeCompare(b.nodeId));
 const flagged=new Map();
 for(const shock of shocks){
  check(Date.parse(shock.at)<=now+60000,'Future change event');
  const queue=[{id:shock.nodeId,weight:1,path:[shock.nodeId],links:[],hops:0}];
  const best=new Map();
  while(queue.length){
   const x=queue.shift();if(x.hops>=maxHops)continue;
   for(const edge of outgoing.get(x.id)||[]){
    if(x.path.includes(edge.to)||byId.get(edge.to)?.profile==='invariant')continue;
    const checked=latest.get(edge.to);
    if(checked?.outcome==='unchanged'&&Date.parse(checked.at)>=Date.parse(shock.at))continue;
    const weight=x.weight*edge.w,hops=x.hops+1,key=edge.to+'|'+hops;
    if((best.get(key)??-1)>=weight)continue;best.set(key,weight);
    const next={nodeId:edge.to,pressure:+weight.toFixed(6),shockNodeId:shock.nodeId,
      shockReceiptId:shock.receiptId,shockAt:shock.at,path:[...x.path,edge.to],links:[...x.links,edge.id],hops};
    if(!flagged.has(edge.to)||flagged.get(edge.to).pressure<next.pressure)flagged.set(edge.to,next);
    queue.push({id:edge.to,weight,hops,path:next.path,links:next.links});
   }
  }
 }
 const affected=temporalProjection.records.map(r=>{
  const sourceShock=flagged.get(r.nodeId)||null;
  return {nodeId:r.nodeId,statement:r.statement,profile:r.profile,baselineStatus:r.status,
   baselineEstimatedChangeRisk:r.model?.pAtLeastOneChange??null,
   correlatedPressure:sourceShock?.pressure??0,sourceShock,
   triage:r.status==='RECHECK_REPORTED_CHANGE'?'DIRECT_CHANGE_REPORTED':sourceShock?'CORRELATED_RECHECK_SUGGESTED':r.status,
   changeObservedBySoftware:false,assertionFalsehoodInferred:false,automaticLedgerMutation:false};
 }).sort((a,b)=>b.correlatedPressure-a.correlatedPressure||a.nodeId.localeCompare(b.nodeId));
 return {schema:'motif.collective012.correlated-review.v1',asOf:new Date(now).toISOString(),
  shocks,affected,correlatedReviewCount:affected.filter(x=>x.sourceShock).length,
  highestPressureIsNotProbability:true,operatorDeclaredLinksOnly:true,
  automaticObservationChanges:0,automaticPeerContacts:0,worldTruthCertified:false};
}
export function affectedThreadPaths(threads,nodes,ledgerHead,projection){
 const affected=new Set(projection.affected.filter(x=>x.sourceShock||x.triage==='DIRECT_CHANGE_REPORTED').map(x=>x.nodeId));
 return [...threads.values()].filter(t=>t.status!=='archived').map(t=>{
  const report=evaluateThread(t,nodes,ledgerHead);
  const sourceEvidenceIds=report.evidenceIds.filter(id=>affected.has(id));
  return {threadId:t.id,title:t.title,sourceEvidenceIds,
   note:'This path relies on sources needing recheck; that does not refute it.'};
 }).filter(x=>x.sourceEvidenceIds.length);
}
