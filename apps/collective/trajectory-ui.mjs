import {sha} from './kernel.mjs';
import {discoverTrajectories,fitTrajectory,trajectoryRechecks,makeTrajectoryReceipt,validateTrajectorySource} from './trajectories.mjs';
export function bindTrajectoryUI({state,setStatus,el}){
 const $=id=>document.getElementById(id);
 let current=null,receipt=null,busy=false;
 const label=n=>{if(!n)return 'Unknown source';const x=n.kind==='claim'?n.content:n.content.statement;return x.from+' → '+x.to+' ['+x.polarity+']';};
 const fingerprint=()=>sha(state.temporalRecords.map(x=>x.id).sort());
 function draw(result,stale=false){
  const list=$('trajectory-results');list.replaceChildren();
  $('trajectory-progress').textContent=stale?'History changed. Re-run trajectory scan.':
   result.scannedDirectedPairs+' comparisons · '+result.provisionalCount+' provisional predictive associations (not causation).';
  const alerts=stale?[]:trajectoryRechecks({discovery:result,records:state.temporalRecords});
  for(const a of alerts.slice(0,8)){
   const row=el('div','trajectory-card');row.append(el('strong',null,'RECHECK SUGGESTION: '+label(state.nodes.get(a.targetNodeId))));
   row.append(el('p','muted','Predicted review value only; target change NOT observed.'));
   const button=el('button','secondary','PREPARE RECHECK');button.onclick=()=>{
    $('temporal-node').value=a.targetNodeId;$('temporal-node').dispatchEvent(new Event('change'));
    $('temporal-action').value='check';$('temporal-action').dispatchEvent(new Event('change'));
    $('temporal-horizon').scrollIntoView({behavior:'smooth',block:'start'});
    setStatus('Check form prepared. Nothing checked or transmitted.');
   };row.append(button);list.append(row);
  }
  for(const r of result.results.slice(0,12)){
   const row=el('article','trajectory-card');
   row.append(el('strong',null,label(state.nodes.get(r.triggerNodeId))+' ⇢ '+label(state.nodes.get(r.targetNodeId))));
   row.append(el('p','muted',r.status.replaceAll('_',' ')+' · '+r.trainingCount+' train · '+r.holdoutCount+' later test · '+r.matching.censored+' unobserved target reports'));
   if(r.trainedConditionalRate!==null){
    row.append(el('p','muted','Target changed-report rate after trigger change '+Math.round(100*r.trainedConditionalRate)+'% vs unchanged '+Math.round(100*r.trainedControlRate)+'%. Selected reports, NOT world probabilities.'));
    row.append(el('p','muted','Held-out Brier '+(r.heldoutBrier??'unavailable')+' vs fixed baseline '+(r.heldoutBaselineBrier??'unavailable')+' · median check-report lag '+(r.medianCheckToCheckLagDays??'unknown')+' days.'));
   }
   row.append(el('p','muted','Report order is not event order; common shocks and nonrandom checks can mislead.'));
   list.append(row);
  }
  if(!list.children.length)list.append(el('p','muted','No linked checked history. No pattern invented.'));
 }
 async function refresh(){
  for(const key of ['trajectory-from','trajectory-to']){
   const select=$(key),previous=select.value;select.replaceChildren();
   for(const n of [...state.nodes.values()].filter(x=>['claim','source'].includes(x.kind)).slice(0,24)){
    const o=el('option',null,label(n).slice(0,105));o.value=n.id;select.append(o);
   }
   if([...select.options].some(x=>x.value===previous))select.value=previous;
  }
  $('trajectory-run').disabled=busy||state.nodes.size<2;
  if(!receipt){const saved=await state.store.getTrajectoryReceipts(state.scope);if(saved.length){saved.sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));receipt=saved.at(-1);current=receipt.projection;}}
  $('trajectory-export').disabled=!current;
  $('trajectory-overview').textContent=state.temporalRecords.filter(x=>x.action==='check').length+' dated operator check reports available. References are not independently authenticated.';
  if(current)draw(current,receipt.temporalHead!==await fingerprint()||receipt.sourceHead!==(state.events.at(-1)?.id??null));
 }
 async function run(){
  if(busy)return;busy=true;
  try{
   const records=await state.store.getTemporalRecords(state.scope);
   await validateTrajectorySource(records,state.scope,state.nodes);
   const windowDays=Number($('trajectory-window').value),now=Date.now();
   let result;
   if($('trajectory-mode').value==='pair'){
    const pair=fitTrajectory({records,triggerNodeId:$('trajectory-from').value,targetNodeId:$('trajectory-to').value,windowDays,now});
    result={schema:'motif.collective013.trajectory-discovery.v1',windowDays,scannedNodes:2,
     scannedDirectedPairs:1,matchedPairs:pair.matching.matched?1:0,
     provisionalCount:pair.status==='PROVISIONAL_PREDICTIVE_ASSOCIATION'?1:0,
     results:[pair],causalGraphInferred:false,declaredDependenciesMutated:false,automaticEvidenceAdmissions:0,automaticPeerContacts:0};
   }else result=discoverTrajectories({records,nodes:state.nodes,windowDays,now});
   receipt=await makeTrajectoryReceipt(state.scope,{projection:result,sourceHead:state.events.at(-1)?.id??null,temporalHead:await fingerprint()});
   await state.store.recordTrajectoryReceipt(receipt,state.scope);
   current=result;draw(result);setStatus('Research trajectory recorded. No causal or factual promotion.');
  }catch(e){setStatus('Trajectory held: '+e.message,true);}
  finally{busy=false;await refresh();}
 }
 $('trajectory-mode').onchange=()=>{$('trajectory-pair-controls').hidden=$('trajectory-mode').value!=='pair';};
 $('trajectory-mode').dispatchEvent(new Event('change'));
 $('trajectory-run').onclick=run;
 $('trajectory-export').onclick=()=>{if(!receipt)return;const url=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'}));
  const a=el('a');a.href=url;a.download='motif-trajectories.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);};
 return {refresh};
}