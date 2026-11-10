/** COLLECTIVE-006 — bounded local learning from observed collaboration outcomes.
 * NO inference about human identity, truth, peer inventory, or causes of refusal.
 * Received alone does not count as useful. Declines are NEUTRAL about ability.
 */
import {sha} from './kernel.mjs';

const TYPES=new Set(['sent','received','admitted','declined']);
export const FEEDBACK_CAP=2000;
const MAX_CONTEXT=90;
export function validateFeedback(data){
 if(!data||!TYPES.has(data.type)||typeof data.requestId!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(data.requestId)
   ||typeof data.peerIssuer!=='string'||!/^node:[0-9a-f]{64}$/.test(data.peerIssuer)
   ||!data.question||typeof data.question.from!=='string'||typeof data.question.to!=='string'
   ||!data.question.from||!data.question.to||data.question.from.length>MAX_CONTEXT||data.question.to.length>MAX_CONTEXT
   ||!(data.threadId===null||(typeof data.threadId==='string'&&/^thread:[0-9a-f]{64}$/.test(data.threadId)))
   ||!(data.relevant===null||typeof data.relevant==='boolean')
   ||!Number.isSafeInteger(data.acceptedCount)||data.acceptedCount<0||data.acceptedCount>32)throw Error('Invalid local outcome receipt');
 if(data.type==='admitted'&&data.acceptedCount===0)throw Error('Admitted outcome requires new accepted source');
 if(data.type!=='admitted'&&(data.relevant!==null||data.acceptedCount!==0))throw Error('Received or refused is not learning success');
 return data;
}

export async function feedbackReceipt({type,requestId,peerIssuer,question,threadId=null,relevant=null,acceptedCount=0}){
 const body=validateFeedback({type,requestId,peerIssuer,question,threadId,relevant,acceptedCount});
 const event={schema:'tranch.collective006.feedback.v1',...body,recordedAt:new Date().toISOString()};
 return {id:await sha(event),...event};
}
export async function validateFeedbackLog(events){
 if(!Array.isArray(events)||events.length>FEEDBACK_CAP)throw Error('Feedback log exceeds bound');
 const ids=new Set(),perRequest=new Map();
 for(const e of events){
  if(!e||e.schema!=='tranch.collective006.feedback.v1'||!e.id||ids.has(e.id))throw Error('Invalid or repeated receipt');
  const {id,...body}=e;
  if(id!==await sha(body))throw Error('Altered feedback receipt');
  validateFeedback(e);ids.add(id);
  if(!perRequest.has(e.requestId))perRequest.set(e.requestId,[]);
  perRequest.get(e.requestId).push(e);
 }
 // A reply may never be used to reward a request that this app never sent.
 for(const group of perRequest.values()){
  const sent=group.filter(e=>e.type==='sent');
  if(sent.length!==1)throw Error('Missing or duplicated local request');
  for(const e of group)if(e.peerIssuer!==sent[0].peerIssuer||
      e.question.from!==sent[0].question.from||e.question.to!==sent[0].question.to||
      e.threadId!==sent[0].threadId)throw Error('Unbound receipt context');
  if(group.filter(e=>e.type==='admitted').length>1 || group.filter(e=>e.type==='declined').length>1
     || group.filter(e=>e.type==='received').length>1)throw Error('Duplicate outcome');
  if(group.some(e=>e.type==='admitted')&&!group.some(e=>e.type==='received'))throw Error('Cannot credit unreceived evidence');
  if(group.some(e=>e.type==='declined')&&group.some(e=>e.type==='admitted'))throw Error('Conflicting outcomes');
 }
 return events;
}

/** Receiver computes local relevance after independently verified admission.
 * We credit only a new supported path or expansion of the observed reachable frontier.
 * A contradiction is never scored as a success, and cannot become positive because
 * a hypothetical path appears in a scenario branch.
 */
export function relevanceOfAdmission({before,after,beforeFrontier,afterFrontier}){
 if(after?.status==='HOLD_CONTRADICTION')return false;
 if(before?.status!=='PATH_SUPPORTED_BY_ASSERTIONS'&&after?.status==='PATH_SUPPORTED_BY_ASSERTIONS')return true;
 if(!(beforeFrontier instanceof Set)||!(afterFrontier instanceof Set))throw Error('Frontier receipts required');
 return [...afterFrontier].some(value=>!beforeFrontier.has(value));
}

/** A shrunken posterior used only to ORDER peer suggestions, never prove expertise.
 * Relevant admitted evidence is a positive local usefulness signal. Irrelevant
 * admissions are negative signals; silence/declining remain neutral. Repeated
 * copies of the same request can't accumulate pseudo-evidence.
 */
export function peerFeedback({events,peerIssuer,from,to}){
 const outcomes=new Map();
 for(const e of [...(events||[])].sort((a,b)=>(a.recordedAt||'').localeCompare(b.recordedAt||'')||(a.id||'').localeCompare(b.id||''))){
  if(e.peerIssuer!==peerIssuer||e.question?.from!==from||e.question?.to!==to)continue;
  if(e.type==='admitted')outcomes.set(e.requestId,e.relevant);
 }
 const values=[...outcomes.values()].slice(-32),n=values.length;
 const positives=values.filter(Boolean).length;
 const posterior=(positives+1)/(n+2);
 const adjustment=n===0?0:Math.round(8*(posterior-.5));
 return {observedAdmitted:n,relevant:positives,irrelevant:n-positives,
   adjustment:Math.max(-4,Math.min(4,adjustment)),
   meaning:'local question-matched, admitted-evidence relevance (not truth or peer competence)'};
}
