/** COLLECTIVE-006 — bounded, independently persisted WHAT-IF inquiry branches.
 * Scenario assumptions are NOT TranchNode observations or accepted source claims.
 * They live in an independently hashed, append-only research-event store.
 */
import {sha,canonical,route,statement} from './kernel.mjs';

export const THREAD_CAP=24;
export const ASSUMPTION_CAP=16;
export const THREAD_EVENT_CAP=128;
const validLabel=x=>typeof x==='string'&&x.trim()===x&&x.length>0&&x.length<=90&&!/[\u0000-\u001f]/.test(x);
const tid=x=>typeof x==='string'&&/^thread:[0-9a-f]{64}$/.test(x);
const isObject=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const ensure=(condition,message)=>{if(!condition)throw Error(message);};

function validateAssumption(a){
 ensure(isObject(a)&&typeof a.id==='string'&&/^assumption:[0-9a-f]{64}$/.test(a.id),'Invalid assumption identity');
 const expected=statement(a.from,a.to,a.polarity);
 ensure(canonical(expected)===canonical({from:a.from,to:a.to,polarity:a.polarity}),'Invalid assumption');
 return a;
}

/** One immutable research event at a time, scoped to one thread and one local node. */
export async function appendThreadEvent(events,{threadId,scopeId,actorId,op}){
 ensure(tid(threadId)&&typeof scopeId==='string'&&scopeId.startsWith('local:node:')&&
        actorId===scopeId.slice('local:'.length),'Invalid thread identity/scope');
 const previous=events.filter(e=>e.threadId===threadId).sort((a,b)=>a.seq-b.seq);
 ensure(previous.length<THREAD_EVENT_CAP,'Thread event cap reached');
 const body={threadId,scopeId,actorId,seq:previous.length+1,previousDigest:previous.at(-1)?.digest??null,
   at:new Date().toISOString(),op};
 const digest=await sha(body);
 const event={slot:threadId+':'+body.seq,digest,...body};
 await replayThreads([...events,event],scopeId);
 return [...events,event];
}

function apply(state,e){
 const op=e.op;
 ensure(isObject(op)&&typeof op.type==='string','Bad thread operation');
 if(op.type==='create'){
  ensure(!state&&isObject(op.question)&&validLabel(op.question.from)&&validLabel(op.question.to)
    &&op.question.from!==op.question.to&&validLabel(op.title)&&op.title.length<=90,
    'Invalid thread creation');
  const parent=op.parent;
  ensure(parent===null||(isObject(parent)&&tid(parent.id)&&typeof parent.digest==='string'&&parent.digest.startsWith('sha256:')),'Invalid fork ancestry');
  ensure(Array.isArray(op.inherited)&&op.inherited.length<=ASSUMPTION_CAP,'Too many inherited assumptions');
  const assumptions=new Map();
  for(const a of op.inherited){validateAssumption(a);ensure(!assumptions.has(a.id),'Repeated inherited assumption');assumptions.set(a.id,a);}
  ensure(op.baseLedgerHead===null||typeof op.baseLedgerHead==='string','Invalid ledger base');
  return {id:e.threadId,scopeId:e.scopeId,ownerId:e.actorId,title:op.title,question:op.question,
    parent,baseLedgerHead:op.baseLedgerHead,assumptions,status:'open',revision:e.digest,events:1};
 }
 ensure(state&&state.status!=='archived','Missing or archived thread');
 if(op.type==='assume'){
  const a=validateAssumption(op.assumption);
  ensure(state.assumptions.size<ASSUMPTION_CAP&&!state.assumptions.has(a.id),'Duplicate or excessive assumption');
  state.assumptions.set(a.id,a);
 }else if(op.type==='retract'){
  ensure(typeof op.assumptionId==='string'&&state.assumptions.has(op.assumptionId),'Unknown assumption retraction');
  state.assumptions.delete(op.assumptionId);
 }else if(op.type==='mark'){
  ensure(['open','held','archived'].includes(op.status),'Invalid thread state');
  state.status=op.status;
 }else throw Error('Unsupported thread operation');
 state.revision=e.digest;state.events++;
 return state;
}

/** Replay is deterministic independent of IndexedDB enumeration order. */
export async function replayThreads(events,scopeId){
 ensure(Array.isArray(events)&&events.length<=THREAD_CAP*THREAD_EVENT_CAP,'Too many thread events');
 const groups=new Map(),slots=new Set(),threads=new Map(),statesAtRevision=new Map();
 for(const e of events){
  ensure(isObject(e)&&tid(e.threadId)&&e.scopeId===scopeId&&e.actorId===scopeId.slice('local:'.length)
    &&Number.isSafeInteger(e.seq)&&e.seq>=1&&e.seq<=THREAD_EVENT_CAP
    &&e.slot===e.threadId+':'+e.seq&&typeof e.digest==='string'
    &&!slots.has(e.slot),'Bad research event identity or scope');
  slots.add(e.slot);
  if(!groups.has(e.threadId))groups.set(e.threadId,[]);
  groups.get(e.threadId).push(e);
 }
 ensure(groups.size<=THREAD_CAP,'Thread capacity reached');
 for(const [id,group] of groups){
  group.sort((a,b)=>a.seq-b.seq);let previous=null,state=null;
  for(let i=0;i<group.length;i++){
   const e=group[i];const {slot,digest,...body}=e;
   ensure(e.seq===i+1&&e.previousDigest===previous&&digest===await sha(body),'Research event integrity failure');
   state=apply(state,e);previous=digest;
   statesAtRevision.set(digest,{threadId:id,assumptions:[...state.assumptions.values()].map(x=>({...x}))});
  }
  threads.set(id,state);
 }
 // Fork ancestry is bound to a *specific* parent revision; later edits never leak across branches.
 for(const t of threads.values())if(t.parent){
  const snapshot=statesAtRevision.get(t.parent.digest);
  ensure(snapshot&&snapshot.threadId===t.parent.id&&t.parent.id!==t.id,'Invalid fork parent or revision');
  const first=groups.get(t.id).find(x=>x.seq===1);
  ensure(canonical(first.op.inherited)===canonical(snapshot.assumptions),'Fork inherited state was forged');
 }
 return threads;
}

export async function createThread(events,scopeId,title,from,to,baseLedgerHead,{parentId=null}={}){
 const threads=await replayThreads(events,scopeId);
 ensure(threads.size<THREAD_CAP,'Thread capacity reached');
 ensure(validLabel(title)&&validLabel(from)&&validLabel(to)&&from!==to,'Invalid inquiry title/endpoints');
 const parent=parentId?threads.get(parentId):null;
 ensure(!parentId||parent,'Unknown branch parent');
 const random=new Uint8Array(32);crypto.getRandomValues(random);
 const id='thread:'+(await sha({actor:scopeId,nonce:[...random]})).slice(7);
 const inherited=parent?[...parent.assumptions.values()].map(a=>({...a})):[];
 const op={type:'create',title,question:{from,to},baseLedgerHead:baseLedgerHead??null,
   parent:parent?{id:parent.id,digest:parent.revision}:null,inherited};
 const owner=scopeId.slice('local:'.length);
 return {id,events:await appendThreadEvent(events,{threadId:id,scopeId,actorId:owner,op})};
}

export async function assume(events,scopeId,threadId,from,to,polarity){
 const a=statement(from,to,polarity),random=new Uint8Array(32);crypto.getRandomValues(random);
 const id='assumption:'+(await sha({threadId,statement:a,nonce:[...random]})).slice(7);
 return appendThreadEvent(events,{threadId,scopeId,actorId:scopeId.slice('local:'.length),
   op:{type:'assume',assumption:{id,...a}}});
}
export async function retract(events,scopeId,threadId,assumptionId){
 return appendThreadEvent(events,{threadId,scopeId,actorId:scopeId.slice('local:'.length),
   op:{type:'retract',assumptionId}});
}
export async function markThread(events,scopeId,threadId,status){
 return appendThreadEvent(events,{threadId,scopeId,actorId:scopeId.slice('local:'.length),
   op:{type:'mark',status}});
}

/** The observed source Map is never mutated; hypothetical edges are marked PROPOSAL. */
export function evaluateThread(thread,nodes,ledgerHead){
 ensure(thread&&nodes instanceof Map,'Scenario and source ledger required');
 const originalSize=nodes.size;
 const observed=route(nodes,thread.question.from,thread.question.to);
 const hypothetical=new Map(nodes);
 for(const a of thread.assumptions.values()){
  hypothetical.set('hypothesis:'+a.id,{id:'hypothesis:'+a.id,kind:'claim',
    epistemicState:'inferred',scopeId:thread.scopeId,content:{from:a.from,to:a.to,polarity:a.polarity}});
 }
 const outcome=route(hypothetical,thread.question.from,thread.question.to);
 const used=outcome.evidenceIds.filter(id=>id.startsWith('hypothesis:'));
 let status=outcome.status;
 if(status==='PATH_SUPPORTED_BY_ASSERTIONS')status=used.length?'CONDITIONAL_PATH_WITH_HYPOTHESES':'SUPPORTED_BY_RECORDED_ASSERTIONS';
 ensure(nodes.size===originalSize,'Scenario mutated observations');
 return {threadId:thread.id,title:thread.title,revision:thread.revision,parent:thread.parent,
   question:thread.question,ledgerHead,createdAgainst:thread.baseLedgerHead,
   assumptionCount:thread.assumptions.size,assumptions:[...thread.assumptions.values()],
   observedStatus:observed.status,status,path:outcome.path,assumptionsUsed:used.map(id=>id.slice('hypothesis:'.length)),
   evidenceIds:outcome.evidenceIds.filter(id=>!id.startsWith('hypothesis:')),
   tensions:outcome.tensions,sourceObservationMutated:false,automaticPromotion:false,verifiedWorldTruth:false};
}
