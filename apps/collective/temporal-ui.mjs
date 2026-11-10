/** COLLECTIVE-011 — human-reviewed, local-only aging dashboard. */
import {TEMPORAL_PROFILES,temporalReceipt,temporalProjection,strategyTimeReview} from './temporal.mjs';
export function bindTemporalUI({state,setStatus,el}){
 const $=id=>document.getElementById(id);
 let projection=null,busy=false;
 const describe=r=>r.statement?.from+' → '+r.statement?.to+' ['+r.statement?.polarity+']';
 function summarize(r){
  if(!r.model)return 'No verified-time anchor. A received file is not an independent check.';
  const pct=(100*r.model.pAtLeastOneChange).toFixed(1);
  return `${r.model.ageDays} days since ${r.anchorKind==='OPERATOR_ATTESTED_RECHECK'?'declared unchanged check':'local assertion'} · modeled probability of ≥1 relevant change ${pct}%. NOT probability the assertion is false.`;
 }
 async function refresh(){
  state.temporalRecords=await state.store.getTemporalRecords(state.scope);
  projection=temporalProjection(state.nodes,state.temporalRecords,{now:Date.now()});
  state.temporalProjection=projection;
  const list=$('temporal-list');list.replaceChildren();
  $('temporal-count').textContent=String(projection.records.length);
  const review=strategyTimeReview(projection);
  $('temporal-overview').textContent=`${review.affectedNodeIds.length} item(s) need temporal review; ${projection.unknownCount} have no recheck anchor. Rates are illustrative, not measured. Time alone does not prove a claim false.`;
  const selector=$('temporal-node'),prior=selector.value;selector.replaceChildren();
  for(const r of projection.records){
   const opt=el('option',null,describe(r).slice(0,100));opt.value=r.nodeId;selector.append(opt);
   const card=el('article','temporal-card');card.append(el('strong',null,describe(r)));
   card.append(el('p','muted',r.status.replaceAll('_',' ')+' · volatility: '+r.profile));
   card.append(el('p','muted',summarize(r)));
   list.append(card);
  }
  selector.disabled=projection.records.length===0;
  if(projection.records.some(x=>x.nodeId===prior))selector.value=prior;
  $('temporal-submit').disabled=busy||!projection.records.length;
  $('temporal-export').disabled=projection.records.length===0;
  $('temporal-profile').replaceChildren();
  for(const [name,c] of Object.entries(TEMPORAL_PROFILES)){
   const o=el('option',null,`${name.toUpperCase()} — ${c.description}`);o.value=name;$('temporal-profile').append(o);
  }
  const chosen=projection.records.find(x=>x.nodeId===selector.value);
  if(chosen)$('temporal-profile').value=chosen.profile;
 }
 $('temporal-node').onchange=()=>{
  const r=projection?.records.find(x=>x.nodeId===$('temporal-node').value);
  if(r)$('temporal-profile').value=r.profile;
 };
 $('temporal-action').onchange=()=>{
  const isCheck=$('temporal-action').value==='check';
  $('temporal-check-controls').hidden=!isCheck;
  $('temporal-check-reference').required=isCheck;
 };
 $('temporal-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;busy=true;
  try{
   const action=$('temporal-action').value,profile=$('temporal-profile').value;
   const input={nodeId:$('temporal-node').value,profile,action,
    reason:$('temporal-reason').value.trim(),
    outcome:action==='check'?$('temporal-check-result').value:null,
    sourceReference:action==='check'?$('temporal-check-reference').value.trim():null};
   const receipt=await temporalReceipt(state.scope,input);
   await state.store.recordTemporalRecord(receipt,state.scope,state.nodes);
   $('temporal-reason').value='';$('temporal-check-reference').value='';
   await refresh();
   if(state.adaptiveUI)await state.adaptiveUI.refresh();
   if(state.dependencyUI)await state.dependencyUI.refresh();
   setStatus(action==='check'?'Operator-declared recheck recorded. Source assertion unchanged; separately update evidence if the world changed.':'Volatility class updated. This does not reset the age clock or certify truth.');
  }catch(e){setStatus('Temporal annotation held: '+e.message,true);}
  finally{busy=false;$('temporal-submit').disabled=!projection?.records?.length;}
 });
 $('temporal-export').onclick=()=>{
  if(!projection)return;
  const exportData={...projection,localResearchOnly:true,originalAcceptedLedgerUnchanged:true};
  const a=el('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(exportData,null,2)],{type:'application/json'}));
  a.download='motif-temporal-horizon-sensitive.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),15000);
 };
 // Time can advance even if no data changes. No network or external actions.
 const timer=setInterval(()=>{if(!document.hidden&&state.nodes?.size)refresh().then(()=>state.dependencyUI?.refresh()).then(()=>state.adaptiveUI?.refresh()).catch(e=>setStatus(e.message,true));},60000);
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 $('temporal-action').dispatchEvent(new Event('change'));
 return {refresh};
}
