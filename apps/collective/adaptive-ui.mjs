/** COLLECTIVE-009: local, explicit two-step strategy; no transmission or fact promotion. */
import {auditImportedSources} from './kernel.mjs';
import {planFreshness} from './experiment-receipts.mjs';
import {makeAdaptiveReceipt,adaptiveFreshness} from './adaptive-receipts.mjs';
import {ADAPTIVE_SCHEMA,strategyChange,MAX_HISTORY} from './adaptive-strategy.mjs';
import {calibratedProfiles} from './calibration.mjs';
import {temporalProjection,strategyTimeReview} from './temporal.mjs';
export function bindAdaptiveUI({state,setStatus,el}){
 const $=id=>document.getElementById(id);
 let plans=[],previous=null,busy=false,sourcePlans=[],research=[];
 const head=()=>state.events.at(-1)?.id??null;
 const say=(m,bad=false)=>setStatus(m,bad);
 function work(input){return new Promise((resolve,reject)=>{
  if(typeof Worker==='undefined')return reject(Error('Module Web Worker unavailable'));
  const worker=new Worker(new URL('./adaptive-worker.mjs',import.meta.url),{type:'module'});
  let ended=false;const timeout=setTimeout(()=>done(Error('Strategy worker exceeded 12 seconds')),12000);
  function done(err,value){if(ended)return;ended=true;clearTimeout(timeout);worker.terminate();err?reject(err):resolve(value);}
  worker.onmessage=e=>e.data?.ok?done(null,e.data.result):done(Error(e.data?.error||'Strategy evaluation failed'));
  worker.onerror=e=>done(Error(e.message||'Strategy worker error'));
  try{worker.postMessage(input);}catch(error){done(error);}
 });}
 function latestSourcePlan(){return sourcePlans.sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id)).reverse()
    .find(r=>planFreshness(r.plan,state.threads,research,head())==='CURRENT_SNAPSHOT')||null;}
 function jobsFrom(plan){const jobs=[];
  for(const source of plan.sourceReceipts){const t=state.threads.get(source.threadId);
   if(!t||t.revision!==source.threadRevision||t.status!=='open')throw Error('Stale What-If research; reinvestigate first');
   jobs.push({threadId:t.id,threadRevision:t.revision,receiptId:source.receiptId,
     ledgerHead:head(),status:t.status,question:t.question,
     assumptions:[...t.assumptions.values()].map(x=>({...x}))});
  }
  return jobs;
 }
 function historicalTestimony(){
  const history=[];
  // The signing key fingerprint is NOT a human identity or proof of independence.
  for(const n of state.nodes.values())if(n.kind==='source'&&n.content?.statement){
   const s=n.content.statement,at=Date.parse(n.createdAt);
   if(!Number.isFinite(at)||at>Date.now()||Date.now()-at>365*86400000)continue;
   history.push({issuer:n.content.originIssuer,from:s.from,to:s.to,
      polarity:s.polarity,accepted:true,at});
  }
  return history.slice(-MAX_HISTORY);
 }
 function download(payload){const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='motif-adaptive-strategy.json';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
 }
 function display(receipt){
  $('adaptive-candidates').replaceChildren();
  if(!receipt){$('adaptive-candidates').append(el('p','muted','First generate a current Aperture Strategy proposal above. No model was run.'));return;}
  const policy=receipt.policy;
  const sourceFresh=adaptiveFreshness(receipt,{ledgerHead:head(),threads:state.threads,sourcePlans});
  const oldCal=receipt.policy?.calibrationInput;
  const fresh=sourceFresh==='CURRENT_SNAPSHOT'&&oldCal?.enabled &&
    JSON.stringify(oldCal.resolutionIds)!==JSON.stringify(state.calibrationRecords.map(x=>x.id))
       ? 'STALE_RESOLUTION_EVIDENCE' : sourceFresh;
  $('adaptive-status').textContent=fresh.replaceAll('_',' ')+' · '+policy.status.replaceAll('_',' ')+' · '+policy.creditsSpent+'/'+policy.creditsLimit+' route probes · '+policy.questionCount+' considered';
  if(fresh!=='CURRENT_SNAPSHOT')$('adaptive-alert').textContent='Evidence or a hypothesis changed. Prior strategy is stale; run current thread investigations and planner again. No action is taken automatically.';
  else {
   const clock=state.temporalProjection;
   const review=clock?strategyTimeReview(clock):null;
   const guidance=policy.recommendation?('Candidate: '+policy.recommendation.from+' → '+policy.recommendation.to+' · estimated 2-step net gain '+policy.recommendation.estimatedTwoStepNetGain):'Abstained: modeled inquiry cost outweighs possible progress.';
   $('adaptive-alert').textContent=guidance+(review?.needsReview?' · TEMPORAL CAUTION: '+review.affectedNodeIds.length+' recorded relation(s) are unchecked, flagged changed, or aged past assumed risk threshold. Current ledger ≠ current world.':'');
  }
  if(!policy.alternatives?.length){$('adaptive-candidates').append(el('p','muted','No reachable candidate was eligible under this model.'));return;}
  for(const [i,item] of policy.alternatives.slice(0,5).entries()){
   const card=el('article','adaptive-card');
   card.append(el('strong',null,(i===0?'TWO-STEP CHOICE · ':'ALTERNATIVE · ')+item.from+' → '+item.to));
   card.append(el('p','muted','Modeled net gain '+item.expectedTwoStepGain+' · assumed inquiry cost '+item.cost+' · not externally validated'));
   const details=el('details');details.append(el('summary',null,'Show what MOTIF would do after each response'));
   for(const branch of item.contingencies){
    const next=branch.nextQuestion?branch.nextQuestion.from+' → '+branch.nextQuestion.to:'stop / seek other evidence';
    details.append(el('p','muted',branch.answer.toUpperCase()+' ('+(100*branch.assumedProbability).toFixed(1)+'% modeled): '+branch.conditionalPaths+' conditional paths; next: '+next));
   }
   card.append(details);
   const action=el('button','secondary','PREPARE — DO NOT SEND');action.type='button';
   action.disabled=fresh!=='CURRENT_SNAPSHOT'||!policy.recommendation||item.from!==policy.recommendation.from||item.to!==policy.recommendation.to;
   action.onclick=()=>{$('question-from').value=item.from;$('question-to').value=item.to;state.networkQuestionThreadId=null;
    $('network').scrollIntoView({block:'start',behavior:'smooth'});
    say('A suggested experiment is prepared. No question or testimony has been transmitted.');};
   card.append(action);$('adaptive-candidates').append(card);
  }
 }
 async function refresh(){
  plans=await state.store.getAdaptivePlans(state.scope);
  sourcePlans=await state.store.getExperimentPlans(state.scope);
  research=await state.store.getInquiryRuns(state.scope);
  state.calibrationRecords=await state.store.getResolutionReceipts(state.scope);
  previous=plans.sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id)).at(-1)||null;
  $('adaptive-run').disabled=busy||!latestSourcePlan();$('adaptive-export').disabled=!previous;
  display(previous);
 }
 async function run(){if(busy)return;busy=true;$('adaptive-run').disabled=true;
  try{
   await auditImportedSources(state.nodes);
   state.temporalRecords=await state.store.getTemporalRecords(state.scope);
   state.temporalProjection=temporalProjection(state.nodes,state.temporalRecords,{now:Date.now()});
   sourcePlans=await state.store.getExperimentPlans(state.scope);research=await state.store.getInquiryRuns(state.scope);
   const source=latestSourcePlan();if(!source)throw Error('Run current What-If inquiries and the Aperture planner first');
   const nodes=[...state.nodes.values()].filter(n=>['claim','source'].includes(n.kind)).map(n=>({
     id:n.id,kind:n.kind,content:n.kind==='source'?{statement:n.content.statement}:n.content}));
   const options={apertureWeight:Number($('adaptive-aperture').value),defaultCost:Number($('adaptive-cost').value),
      defaultSupportsProbability:Number($('adaptive-prob').value),
      defaultAnsweredProbability:Number($('adaptive-answerable').value),credits:Number($('adaptive-credits').value)};
   $('adaptive-progress').textContent='Simulating two-step responses and possible follow-up experiments locally…';
   const useChecks=$('adaptive-use-checks').checked;
   const resolutionSnapshot=useChecks?await state.store.getResolutionReceipts(state.scope):[];
   const checks=useChecks?calibratedProfiles(source.plan,resolutionSnapshot,{
      tag:$('adaptive-calibration-tag').value.trim()||'general',now:Date.now()}):null;
   if(useChecks&&!checks.fit.eligible)throw Error('Cannot enable checked-outcome model: fewer than 8 independent declared groups in the selected family.');
   const result=await work({jobs:jobsFrom(source.plan),nodes,ledgerHead:head(),experimentPlan:source.plan,
     history:historicalTestimony(),options,profiles:checks?.profiles??{}});
   result.calibrationInput={enabled:useChecks,tag:checks?.fit.tag??null,
     declaredGroups:checks?.fit.declaredIndependentGroups??0,
     note:useChecks?'User-supplied reference checks; independence NOT verified by software':'Uncalibrated default testimony assumptions',
     resolutionIds:resolutionSnapshot.map(x=>x.id)};
   if(useChecks&&JSON.stringify((await state.store.getResolutionReceipts(state.scope)).map(x=>x.id))!==JSON.stringify(result.calibrationInput.resolutionIds))
     throw Error('New resolution checks arrived while strategy was running; rerun to prevent stale training assumptions');
   if(result.schema!==ADAPTIVE_SCHEMA)throw Error('Unexpected adaptive strategy result');
   const presentEvents=await state.store.getEvents();
   if((presentEvents.at(-1)?.id??null)!==result.ledgerHead)throw Error('New evidence arrived during strategy run; recompute against the current ledger');
   const receipt=await makeAdaptiveReceipt(state.scope,result,source.id);
   const old=previous?.policy;
   await state.store.recordAdaptivePlan(receipt,state.scope);
   const change=old?strategyChange(old,result):null;
   $('adaptive-progress').textContent='Complete. '+result.creditsSpent+' simulated route probes; no peer contacted, no facts promoted.';
   if(change?.changed)say('PIVOT: a new evidence snapshot changed the suggested first experiment. Compare both receipts.');
   else say('Two-step strategy prepared locally; select and send any question separately.');
  }catch(e){$('adaptive-progress').textContent='Strategy held: '+e.message;say(e.message,true);}
  finally{busy=false;await refresh();}
 }
 $('adaptive-run').onclick=run;
 $('adaptive-export').onclick=()=>{if(previous)download(previous);};
 return {refresh,run};
}
