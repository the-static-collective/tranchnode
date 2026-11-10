/** COLLECTIVE-007: explicit foreground worker runs, independently metered what-if threads. */
import {auditImportedSources} from './kernel.mjs';
import {compareThreads,INQUIRY_VERSION,MAX_GRAPH_NODES,scheduleInvestigations} from './inquiry-engine.mjs';
import {DEFAULT_ALLOCATION,makeInquiryReceipt,remainingBudget,reportFreshness} from './inquiry-receipts.mjs';

function runWorker(job){
 return new Promise((resolve,reject)=>{
  if(typeof Worker==='undefined'){reject(Error('Web Workers unavailable. No investigation was run.'));return;}
  let finished=false;
  const worker=new Worker(new URL('./inquiry-worker.mjs',import.meta.url),{type:'module'});
  const timer=setTimeout(()=>close(Error('Investigation worker exceeded 4-second limit')),4000);
  function close(err,result){
   if(finished)return;finished=true;clearTimeout(timer);worker.terminate();
   if(err)reject(err);else resolve(result);
  }
  worker.onmessage=e=>{
   if(e.data?.ok)close(null,e.data.result);
   else close(Error(e.data?.error||'Worker refused task'));
  };
  worker.onerror=e=>close(Error('Investigation worker failed: '+e.message));
  try{worker.postMessage({id:job.thread.id,job});}catch(e){close(e);}
 });
}
export function bindInquiries({state,setStatus,el}){
 const $=id=>document.getElementById(id);
 let busy=false,receipts=[],budgets=new Map();
 const shorten=id=>(id||'').slice(-8);
 const head=()=>state.events.at(-1)?.id??null;
 const notify=(m,bad=false)=>setStatus(m,bad);
 function nodesSnapshot(){
  const out=[...state.nodes.values()].filter(n=>n.kind==='claim'||n.kind==='source').map(n=>({
   id:n.id,kind:n.kind,content:n.kind==='source'?{statement:n.content.statement}:n.content
  }));
  if(out.length>MAX_GRAPH_NODES)throw Error('Graph exceeds '+MAX_GRAPH_NODES+' local assertions. Narrow the field before investigating.');
  return out;
 }
 async function refresh(){
  receipts=await state.store.getInquiryRuns(state.scope);
  budgets=new Map((await state.store.getInquiryBudgets()).map(x=>[x.threadId,x.allocation]));
  const threads=[...(state.threads?.values()||[])].sort((a,b)=>a.title.localeCompare(b.title));
  $('inquiry-thread-summary').replaceChildren();
  const recent=[];
  for(const t of threads){
   const quota=budgets.get(t.id)??DEFAULT_ALLOCATION;
   const left=remainingBudget(quota,receipts,t.id);
   const own=receipts.filter(r=>r.result.threadId===t.id).sort((a,b)=>a.at.localeCompare(b.at));
   const latest=own.at(-1);
   const row=el('div','investigation-row');
   const title=el('strong',null,t.title+' · '+t.status);
   row.append(title,el('small','muted','Budget: '+left+'/'+quota+' unused credits · '+own.length+' recorded run(s)'));
   if(latest){
    const status=reportFreshness(latest,t,head());
    row.append(el('small',status==='CURRENT_SNAPSHOT'?'ok':'warn',latest.result.stop.replaceAll('_',' ')+' · '+status.replaceAll('_',' ')+' · '+latest.result.creditsSpent+' spent'));
    recent.push({thread:t,receipt:latest,current:status==='CURRENT_SNAPSHOT'});
   }
   const field=el('label','inquiry-allowance');field.append(el('span',null,'TOTAL ALLOCATED INFERENCE CREDITS'));
   const input=el('input');input.type='number';input.min='2';input.max='256';input.step='1';input.value=String(quota);input.disabled=busy;
   input.setAttribute('aria-label','Total inference credits for '+t.title);
   input.onchange=async()=>{try{
    const amount=Number(input.value);
    if(!Number.isSafeInteger(amount)||amount<2||amount>256)throw Error('Total budget must be 2–256 credits');
    const spent=quota-left;if(amount<spent)throw Error('Cannot allocate fewer credits than the '+spent+' already spent');
    await state.store.setInquiryBudget(t.id,amount);await refresh();notify('Independent inference budget updated for '+t.title+'.');
   }catch(e){notify(e.message,true);input.value=String(quota);}};
   field.append(input);row.append(field);
   $('inquiry-thread-summary').append(row);
  }
  if(!threads.length)$('inquiry-thread-summary').append(el('p','muted','Create one or more What-If threads above before investigating.'));
  $('inquiry-results').replaceChildren();
  for(const entry of recent){
   const {thread,receipt,current}=entry,r=receipt.result;
   const row=el('article','inquiry-result');
   row.append(el('strong',null,thread.title),el('p',current?'CURRENT SNAPSHOT':'STALE SNAPSHOT — re-investigate before using suggestions'));
   row.append(el('p','muted','Observed: '+r.observedStatus+' · Scenario: '+r.scenarioStatus+' · Stop: '+r.stop));
   row.append(el('small','muted','Budget '+r.creditsSpent+'/'+r.budget+' · '+r.creditsRemaining+' unspent this run · research only'));
   if(r.necessityProbes.length)row.append(el('p','muted','Assumption ablations: '+r.necessityProbes.map(x=>shorten(x.assumptionId)+': '+(x.requiredForThisPath?'pivotal for current path/status':'not pivotal in this bounded check')).join('; ')));
   for(const candidate of r.candidateQuestions.slice(0,6)){
    const line=el('div','inquiry-candidate');
    line.append(el('span',null,candidate.from+' → '+candidate.to+' · '+candidate.kind.replaceAll('_',' ')));
    const action=el('button','secondary','PREPARE QUESTION');action.type='button';action.disabled=!current;
    action.title='Copy question endpoints into peer routing. Does not contact a peer or expose hypotheses.';
    action.onclick=()=>{
     $('question-from').value=candidate.from;$('question-to').value=candidate.to;
     state.networkQuestionThreadId=thread.id;
     $('network').scrollIntoView({block:'start',behavior:'smooth'});
     notify('Potential counterexample question prepared; nothing has been transmitted. Explicit peer selection required.');
    };
    line.append(action);row.append(line);
   }
   $('inquiry-results').append(row);
  }
  const links=compareThreads(recent.filter(x=>x.current).map(x=>x.receipt.result));
  $('inquiry-cross-links').replaceChildren();
  for(const relation of links.related){
   const a=state.threads.get(relation.a),b=state.threads.get(relation.b);
   $('inquiry-cross-links').append(el('p','muted',(a?.title||shorten(relation.a))+' ↔ '+(b?.title||shorten(relation.b))+' · '+relation.kind.replaceAll('_',' ')+' · '+relation.interpretation));
  }
  if(!links.related.length)$('inquiry-cross-links').append(el('p','muted','No current cross-thread echoes. Similar questions are proposals, not additional evidence.'));
  $('inquiry-run').disabled=busy||!threads.some(t=>t.status==='open'&&remainingBudget(budgets.get(t.id)??DEFAULT_ALLOCATION,receipts,t.id)>=2);
  $('inquiry-export').disabled=!recent.length;
 }
 async function investigate(){
  if(busy)return;
  busy=true;$('inquiry-run').disabled=true;
  try{
   await auditImportedSources(state.nodes);
   const snapshot=nodesSnapshot(),ledgerHead=head(),jobs=[];
   for(const t of [...state.threads.values()].filter(t=>t.status==='open').sort((a,b)=>a.id.localeCompare(b.id))){
    const allocation=budgets.get(t.id)??DEFAULT_ALLOCATION,left=remainingBudget(allocation,receipts,t.id);
    if(left<2)continue;
    const budget=Math.min(left,24),previous=receipts.find(r=>
      r.result.threadId===t.id&&r.result.threadRevision===t.revision
      &&r.result.ledgerHead===ledgerHead);
    if(previous)continue; // avoid spending credits twice for the identical frozen snapshot.
    jobs.push({thread:{id:t.id,revision:t.revision,status:t.status,parent:t.parent,
      question:t.question,assumptions:[...t.assumptions.values()].map(x=>({...x}))},nodes:snapshot,budget,ledgerHead});
   }
   if(!jobs.length){notify('No untested, budgeted open thread. Change its assumptions, admit new evidence, or allocate more credits.');return;}
   $('inquiry-progress').textContent='Running '+jobs.length+' independent worker(s), up to three simultaneously. No network requests.';
   const outcome=await scheduleInvestigations(jobs,{concurrency:3,executor:runWorker});
   for(const result of outcome.results){
    if(result.schema!==INQUIRY_VERSION)throw Error('Unexpected worker result');
    const receipt=await makeInquiryReceipt(state.scope,result);
    await state.store.recordInquiryRun(receipt,state.scope);
   }
   $('inquiry-progress').textContent=outcome.results.length+' worker report(s) recorded, peak concurrency '+outcome.maxActive+'.';
   notify('Bounded investigations completed. Candidates remain research questions; no peer was contacted.');
  }catch(e){$('inquiry-progress').textContent='Investigation held: '+e.message;notify(e.message,true);}
  finally{busy=false;await refresh();if(state.experimentUI)await state.experimentUI.refresh();}
 }
 $('inquiry-run').onclick=investigate;
 $('inquiry-export').onclick=()=>{
  const output={schema:'motif.collective007.export.v1',scope:state.scope,
    researchOnly:true,worldTruthCertified:false,automaticPeerContacts:0,receipts};
  const blob=new Blob([JSON.stringify(output,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
  const a=el('a');a.href=url;a.download='motif-budgeted-what-if-research.json';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),12000);
  notify('Local research receipts exported. The file may reveal private hypothetical questions; share carefully.');
 };
 return {refresh,investigate};
}
