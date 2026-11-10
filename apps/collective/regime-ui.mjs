/** COLLECTIVE-014: market-inspired temporal regime dashboard. Manual-only actions. */
import {sha} from './kernel.mjs';
import {scanRegimes,makeRegimeReceipt} from './regime-forecast.mjs';
import {auditTemporalReceipts} from './temporal.mjs';
export function bindRegimeUI({state,setStatus,el}){
 const $=id=>document.getElementById(id);let receipt=null,busy=false;
 const describe=n=>{if(!n)return '(missing source)';const s=n.kind==='claim'?n.content:n.content.statement;return s.from+' → '+s.to+' ['+s.polarity+']';};
 const currentHead=()=>state.events.at(-1)?.id??null;
 const checkHead=async()=>sha([...state.temporalRecords].map(r=>r.id).sort());
 function show(r,stale){
  const result=r?.result,list=$('regime-results');list.replaceChildren();
  if(!result){$('regime-progress').textContent='Nothing investigated yet. Click to evaluate dated manual checks.';return;}
  $('regime-progress').textContent=(stale?'STALE RECORD: rerun before use. ':'')+
   result.results.length+' relations · '+result.binDays+'-day bins · '+result.gapBins+'-bin training gap. Forecasts concern recheck reports.';
  for(const row of result.results){
   const card=el('article','regime-card');
   card.append(el('strong',null,describe(state.nodes.get(row.nodeId))));
   card.append(el('p','muted',row.status.replaceAll('_',' ')+' · '+row.checkedBins+' observed time bins, '+row.unobservedBins+' unobserved, '+row.exactEchoesDropped+' exact-reference echoes removed.'));
   if(row.evaluation){
    card.append(el('p','muted','Chronological Brier, lower better: adaptive '+row.evaluation.adaptiveBrier.toFixed(3)+
       ' versus expanding historical '+row.evaluation.baselineBrier.toFixed(3)+' on '+row.evaluation.observations+' held-out checks.'));
    if(row.evaluation.improvement<0)card.append(el('p','warn','Adaptive model failed to outperform baseline.'));
   }else card.append(el('p','muted','Insufficient history to evaluate a future forecast.'));
   if(row.nextCheckForecast)card.append(el('p','muted','Model estimate for a changed report at the NEXT CHECK: '+
    (row.nextCheckForecast.adaptive*100).toFixed(1)+'%. Not a chance the real-world claim is false.'));
   card.append(el('p','muted','Reported-rate momentum: '+row.features.rateMomentum.replaceAll('_',' ')+
    ' · acceleration '+(row.features.acceleration??'unknown')+' · variance ratio '+(row.features.varianceRatio??'unknown')));
   if(row.features.cycle)card.append(el('p','warn','Exploratory cycle at '+row.features.cycle.lagBins*result.binDays+
    ' days (not holdout verified; multiple-lag search).'));
   if(row.warnings.length)card.append(el('p','warn','Review candidates, NOT verified changes: '+row.warnings.join(' · ')));
   const btn=el('button','secondary','PREPARE MANUAL RECHECK');btn.disabled=stale;
   btn.onclick=()=>{if(!state.nodes.has(row.nodeId))return;
    $('temporal-node').value=row.nodeId;$('temporal-node').dispatchEvent(new Event('change'));
    $('temporal-action').value='check';$('temporal-action').dispatchEvent(new Event('change'));
    $('temporal-horizon').scrollIntoView({behavior:'smooth',block:'start'});
    setStatus('Manual recheck prepared. No observation, contact, or assertion made.');};
   card.append(btn);list.append(card);
  }
 }
 async function refresh(){
  if(!receipt){const saved=await state.store.getRegimeReceipts(state.scope);
   if(saved.length){saved.sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));receipt=saved.at(-1);}}
  $('regime-run').disabled=busy||!state.nodes.size;$('regime-export').disabled=!receipt;
  $('regime-overview').textContent=state.temporalRecords.filter(x=>x.action==='check').length+
    ' manually declared rechecks. Missing does NOT mean unchanged; check time is not event onset.';
  if(receipt)show(receipt,receipt.temporalHead!==await checkHead()||receipt.sourceHead!==currentHead());
 }
 async function run(){
  if(busy)return;busy=true;$('regime-run').disabled=true;
  try{
   const records=await state.store.getTemporalRecords(state.scope);
   await auditTemporalReceipts(records,state.scope,state.nodes);
   const result=scanRegimes({records,nodes:state.nodes,now:Date.now(),
     binDays:Number($('regime-bin').value),gapBins:Number($('regime-gap').value)});
   receipt=await makeRegimeReceipt(state.scope,{result,sourceHead:currentHead(),temporalHead:await checkHead()});
   await state.store.recordRegimeReceipt(receipt,state.scope);show(receipt,false);
   setStatus('Market-inspired change-pattern scan stored locally. No external requests or fact promotion.');
  }catch(error){setStatus('Regime scan held: '+error.message,true);}
  finally{busy=false;await refresh();}
 }
 $('regime-run').onclick=run;
 $('regime-export').onclick=()=>{if(!receipt)return;
  const a=el('a'),url=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'}));
  a.href=url;a.download='motif-regime-research.json';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),15000);
 };
 return {refresh};
}
