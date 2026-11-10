/** COLLECTIVE-015: explicit operator-controlled early-warning workbench. */
import {sha} from './kernel.mjs';
import {forecastEarlyWarning,makeEarlyReceipt} from './early-warning.mjs';
export function bindEarlyWarningUI({state,setStatus,el}){
 const $=id=>document.getElementById(id);
 let receipt=null,busy=false;
 const currentHead=()=>state.events.at(-1)?.id??null;
 const checkHead=async()=>sha(state.temporalRecords.map(r=>r.id).sort());
 const describe=n=>{const s=n.kind==='claim'?n.content:n.content.statement;
  return s.from+' → '+s.to+' ['+s.polarity+']';};
 function selectedSignals(){return [...$('warning-sources').selectedOptions].map(x=>x.value);}
 async function refresh(){
  const latest=await state.store.getEarlyWarningReceipts(state.scope);
  if(latest.length){latest.sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));receipt=latest.at(-1);}
  const target=$('warning-target'),sources=$('warning-sources'),priorTarget=target.value,priorSources=new Set(selectedSignals());
  target.replaceChildren();sources.replaceChildren();
  for(const n of state.nodes.values())if(['claim','source'].includes(n.kind)){
   const t=el('option',null,describe(n));t.value=n.id;target.append(t);
   const s=el('option',null,describe(n));s.value=n.id;s.selected=priorSources.has(n.id);sources.append(s);
  }
  if([...state.nodes.keys()].includes(priorTarget))target.value=priorTarget;
  if(!priorSources.size){let selected=0;for(const opt of sources.options){if(opt.value!==target.value&&selected<2){opt.selected=true;selected++;}}}
  $('warning-run').disabled=busy||state.nodes.size<3;
  $('warning-export').disabled=!receipt;
  const checks=state.temporalRecords.filter(r=>r.action==='check');
  $('warning-overview').textContent=checks.length+' operator-declared check reports. Choose a target relation and two to four other relations whose reports could be weak early indicators. Shared references may be correlated.';
  if(receipt){render(receipt,receipt.sourceHead!==currentHead()||receipt.temporalHead!==await checkHead());}
 }
 function render(r,stale){
  const scan=r.scan,$results=$('warning-results');$results.replaceChildren();
  $('warning-progress').textContent=(stale?'STALE RESEARCH — source assertions or checks changed. ':'')+
    scan.status.replaceAll('_',' ')+' · forecast concerns a future REPORTED CHECK, not an independently established regime change.';
  if(!scan.forecast){$results.append(el('p','muted','Insufficient data. No forecast is emitted; record dated checks and rerun.'));return;}
  const f=scan.forecast;
  if(scan.forecastNotCurrentIfOlderThanTwoBins)$results.append(el('p','warn','WARNING: The newest target check is '+scan.forecastAgeBins+' bins old. This projection is historical and should not be used as a current-world prediction.'));
  const card=el('article','regime-card');card.append(el('strong',null,'Possible next check for '+(state.nodes.get(scan.targetNode)?describe(state.nodes.get(scan.targetNode)):'(missing target)')));
  card.append(el('p','muted','Combined model: '+(100*f.model).toFixed(1)+'% · target-only EWMA: '+(100*f.ewma).toFixed(1)+'%. Chosen policy: '+f.selectedPolicy.replaceAll('_',' ')+'.'));
  card.append(el('p','muted','Distinct weak indicators: '+scan.weakSignalCount+' (not necessarily independent). '+(f.cooccurrence?'Multiple positive weak signals in the same decision window.':'No positive co-occurrence detected.')));
  card.append(el('p',f.alertSuggested?'warn':'muted',f.alertSuggested?'RECHECK SUGGESTED — multiple weak signals; not evidence of a confirmed event.':'No combined-model alert suggested. A low score does not prove safety.'));
  if(scan.evaluation){const e=scan.evaluation;
   card.append(el('p','muted','Chronological Brier, lower better: combined '+e.modelBrier.toFixed(3)+', EWMA '+e.ewmaBrier.toFixed(3)+', constant '+e.constantBrier.toFixed(3)+', '+e.checkedTargets+' resolved future checked bins.'));
   if(e.modelImprovementVsEWMA<=0)card.append(el('p','warn','Combined signals were no better than the simpler target-only forecast on recent checked bins. Prefer simpler baseline.'));
  }else card.append(el('p','warn','No adequate held-out evidence for calibration. No reliable new warning claimed.'));
  if(f.cusum)card.append(el('p','muted','Classical target-only CUSUM diagnostic: '+(f.cusum.reviewAlarm?'review threshold reached':'no threshold crossing')+' (not a probability).'));
  if(scan.overlappingDeclaredReferencePairs.length)card.append(el('p','warn',scan.overlappingDeclaredReferencePairs.length+' indicator pair(s) share check references. Repeated sources do not constitute independent confirmation.'));
  card.append(el('small','muted','Experimental model. Hypothesis selection across many source combinations can produce false discoveries.  The application does not verify claimed source independence, detect causal regime transitions, or contact anyone. Sparse checking can create apparent patterns.'));
  const prepare=el('button','secondary','PREPARE TARGET RECHECK — NO CONTACT');prepare.type='button';prepare.disabled=stale;
  prepare.onclick=()=>{$('temporal-node').value=scan.targetNode;$('temporal-node').dispatchEvent(new Event('change'));
   $('temporal-action').value='check';$('temporal-action').dispatchEvent(new Event('change'));
   $('temporal-horizon').scrollIntoView({behavior:'smooth',block:'start'});
   setStatus('Target review prepared locally. No network request or fact change occurred.');};
  card.append(prepare);$results.append(card);
 }
 async function run(){if(busy)return;busy=true;$('warning-run').disabled=true;
  try{
   const sourceNodes=selectedSignals(),targetNode=$('warning-target').value;
   const records=await state.store.getTemporalRecords(state.scope),now=Date.now();
   const scan=forecastEarlyWarning({records,targetNode,sourceNodes,binDays:Number($('warning-bin').value),
    leadBins:Number($('warning-lead').value),gapBins:Number($('warning-gap').value),now});
   receipt=await makeEarlyReceipt(state.scope,{scan,sourceHead:currentHead(),temporalHead:await sha(records.map(r=>r.id).sort())});
   await state.store.recordEarlyWarningReceipt(receipt,state.scope);
   render(receipt,false);setStatus('Weak-signal analysis completed locally. No claim of real-world transition was made.');
  }catch(e){setStatus('Early-warning research held: '+e.message,true);}
  finally{busy=false;$('warning-run').disabled=state.nodes.size<3;}
 }
 $('warning-run').onclick=run;
 $('warning-export').onclick=()=>{if(!receipt)return;
  const a=el('a'),url=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'}));
  a.download='motif-early-warning-research.json';a.href=url;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);};
 return {refresh};
}
