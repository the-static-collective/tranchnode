/** COLLECTIVE-012 — local review of possible shared-world changes. */
import {appendDependency,replayDependencies,correlatedDelta,affectedThreadPaths} from './dependency-delta.mjs';
export function bindDependencyUI({state,setStatus,el}){
 const $=id=>document.getElementById(id);let events=[],current=null;
 const label=n=>{const s=n.kind==='claim'?n.content:n.content.statement;return s.from+' → '+s.to+' ['+s.polarity+']';};
 function selector(id){const select=$(id),chosen=select.value;select.replaceChildren();
  for(const n of state.nodes.values()){if(!['claim','source'].includes(n.kind))continue;
    const o=el('option',null,label(n).slice(0,110));o.value=n.id;select.append(o);}
  if([...select.options].some(o=>o.value===chosen))select.value=chosen;
 }
 async function refresh(){
  events=await state.store.getDependencyEvents(state.scope,state.nodes);
  const active=(await replayDependencies(events,state.scope,state.nodes)).active;
  if(!state.temporalProjection)return;
  current=correlatedDelta({nodes:state.nodes,temporalProjection:state.temporalProjection,
   temporalRecords:state.temporalRecords,links:active});
  state.correlatedProjection=current;
  selector('dependency-from');selector('dependency-to');
  $('dependency-overview').textContent=current.shocks.length+' reported change(s); '+current.correlatedReviewCount+
    ' related statement(s) need review. No fact is automatically changed.';
  const links=$('dependency-links');links.replaceChildren();
  for(const l of active){
   const box=el('div','dependency-item');box.append(el('span',null,
    label(state.nodes.get(l.fromNodeId))+' → '+label(state.nodes.get(l.toNodeId))+' · '+l.kind+' · '+l.strength));
   const button=el('button','secondary','RETRACT LINK');
   button.onclick=async()=>{try{const next=await appendDependency(events,state.scope,{
     action:'unlink',linkId:l.id,reason:'Operator retracted a prior link'},{knownNodes:state.nodes});
     await state.store.recordDependencyEvent(next.event,state.scope,state.nodes);
     await refresh();setStatus('Possible dependency retracted; source evidence unchanged.');
    }catch(e){setStatus(e.message,true);}};
   box.append(button);links.append(box);
  }
  if(!active.length)links.append(el('p','muted','No declared dependencies. Links are not inferred from similar names.'));
  const reviews=$('dependency-review-list');reviews.replaceChildren();
  for(const r of current.affected.filter(x=>x.sourceShock||x.triage==='DIRECT_CHANGE_REPORTED').slice(0,24)){
   const box=el('div','dependency-item');box.append(el('strong',null,label(state.nodes.get(r.nodeId))),
    el('p','muted',r.triage+' · review weight '+r.correlatedPressure.toFixed(2)+' (NOT probability)'));
   if(r.sourceShock)box.append(el('small','muted','From reported change '+r.sourceShock.shockReceiptId.slice(-12)+' via '+r.sourceShock.hops+' link(s)'));
   const prepare=el('button','secondary','PREPARE INDEPENDENT RECHECK');
   prepare.onclick=()=>{$('temporal-node').value=r.nodeId;$('temporal-node').dispatchEvent(new Event('change'));
    $('temporal-action').value='check';$('temporal-action').dispatchEvent(new Event('change'));
    $('temporal-horizon').scrollIntoView({block:'start',behavior:'smooth'});
    setStatus('Recheck form prepared. Nothing was verified or transmitted.');};
   box.append(prepare);reviews.append(box);
  }
  if(!reviews.children.length)reviews.append(el('p','muted','No correlated recheck suggestions at present.'));
  const affected=affectedThreadPaths(state.threads,state.nodes,state.events.at(-1)?.id??null,current);
  $('dependency-threads').textContent=affected.length+' active What-If path(s) include flagged recorded statements.';
  $('dependency-add').disabled=!state.nodes.size;
 }
 $('dependency-form').onsubmit=async e=>{
  e.preventDefault();try{
   const next=await appendDependency(events,state.scope,{fromNodeId:$('dependency-from').value,
    toNodeId:$('dependency-to').value,kind:$('dependency-kind').value,
    strength:$('dependency-strength').value,reason:$('dependency-reason').value.trim()},{knownNodes:state.nodes});
   await state.store.recordDependencyEvent(next.event,state.scope,state.nodes);
   $('dependency-reason').value='';await refresh();setStatus('Possible relationship recorded, not a fact.');
  }catch(error){setStatus(error.message,true);}
 };
 $('dependency-export').onclick=()=>{
  if(!current)return;const data={...current,dependencyEvents:events,researchOnly:true};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a=el('a');a.href=url;a.download='motif-shared-change-review.json';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),15000);
 };
 return {refresh};
}
