/** COLLECTIVE-006: human-driven, persistent, parallel WHAT-IF inquiry workbench. */
import {createThread,assume,retract,markThread,replayThreads,evaluateThread} from './threads.mjs';
import {auditImportedSources,sha} from './kernel.mjs';

export function bindThreads({state,setStatus,el}){
 const $=id=>document.getElementById(id);
 let activeId=null;
 const alert=(msg,bad=false)=>setStatus(msg,bad);
 const shorten=id=>(id||'').slice(-10);
 function active(){return state.threads?.get(activeId)||null;}
 async function transact(next){
  await state.store.commitThreads(state.threadEvents,next,state.scope);
  await refresh();
 }
 async function refresh(){
  state.threadEvents=await state.store.getThreadEvents();
  state.threads=await replayThreads(state.threadEvents,state.scope);
  const select=$('thread-select'),previous=activeId;select.replaceChildren();
  const entries=[...state.threads.values()].sort((a,b)=>a.title.localeCompare(b.title));
  for(const t of entries){const option=el('option',null,t.title+' · '+t.status+' · '+t.assumptions.size+' what-if(s)');option.value=t.id;select.append(option);}
  if(!state.threads.has(previous))activeId=entries[0]?.id??null;
  if(activeId)select.value=activeId;
  select.disabled=!entries.length;
  const selected=active();
  $('thread-fork').disabled=!selected;
  $('thread-hold').disabled=!selected||selected.status==='archived';
  $('thread-archive').disabled=!selected||selected.status==='archived';
  $('thread-assume-form').querySelectorAll('input,select,button').forEach(x=>x.disabled=!selected||selected.status==='archived');
  $('thread-assumptions').replaceChildren();
  $('thread-active').textContent=selected?selected.title+' · '+selected.question.from+' → '+selected.question.to+' · '+selected.status:'No thread selected';
  if(selected){for(const a of selected.assumptions.values()){
    const row=el('div','assumption-row');row.append(el('span',null,a.from+' → '+a.to+' ['+a.polarity+']'));
    if(selected.status!=='archived'){
     const button=el('button','secondary','RETRACT');button.type='button';
     button.onclick=async()=>{try{await transact(await retract(state.threadEvents,state.scope,selected.id,a.id));alert('Hypothesis retracted by a new research event; old event remains.');}catch(e){alert(e.message,true);}};
     row.append(button);
    }
    $('thread-assumptions').append(row);
  }}
  if(!$('thread-assumptions').children.length)$('thread-assumptions').append(el('p','muted','No hypothetical assumptions in this thread.'));
  await auditImportedSources(state.nodes);
  const reports=[];
  $('thread-comparison').replaceChildren();
  for(const t of entries){
   const report=evaluateThread(t,state.nodes,state.events.at(-1)?.id??null);reports.push(report);
   const row=el('div','thread-result');row.append(el('strong',null,t.title+' · '+t.status));
   row.append(el('p','muted',t.question.from+' → '+t.question.to+' · '+report.assumptionCount+' hypothetical assumption(s)'));
   row.append(el('p','thread-verdict',report.status.replaceAll('_',' ')));
   if(report.path.length)row.append(el('p','thread-path',report.path.join(' → ')));
   if(report.tensions.length)row.append(el('p','warn',report.tensions.length+' unresolved contradiction(s); not a prediction.'));
   row.append(el('small','muted','Observed evidence alone: '+report.observedStatus.replaceAll('_',' ')));
   if(t.parent)row.append(el('small','muted','Forked from '+shorten(t.parent.id)+' at immutable revision '+shorten(t.parent.digest)));
   $('thread-comparison').append(row);
  }
  if(!entries.length)$('thread-comparison').append(el('p','muted','Create separate “what if?” inquiries; their assumptions never enter the source ledger.'));
  state.threadReports=reports;
  $('thread-count').textContent=String(entries.filter(t=>t.status!=='archived').length);
  $('thread-focus-question').disabled=!selected;
  $('thread-export').disabled=!entries.length;
 }
 async function getHead(){return state.events.at(-1)?.id??null;}
 $('thread-create-form').addEventListener('submit',async e=>{
  e.preventDefault();try{
    const result=await createThread(state.threadEvents,state.scope,$('thread-title').value.trim(),
      $('thread-from').value.trim(),$('thread-to').value.trim(),await getHead());
    await transact(result.events);activeId=result.id;await refresh();
    alert('Independent hypothetical thread opened. Local observed memory unchanged.');
  }catch(error){alert(error.message,true);}
 });
 $('thread-select').addEventListener('change',async e=>{activeId=e.target.value;await refresh();});
 $('thread-assume-form').addEventListener('submit',async e=>{
  e.preventDefault();try{
    if(!active())throw Error('Select a scenario first');
    await transact(await assume(state.threadEvents,state.scope,activeId,
      $('hyp-from').value.trim(),$('hyp-to').value.trim(),$('hyp-polarity').value));
    $('hyp-from').value='';$('hyp-to').value='';
    alert('Hypothesis added to this branch only; not entered as evidence.');
  }catch(error){alert(error.message,true);}
 });
 $('thread-fork').onclick=async()=>{try{
  const t=active();if(!t)throw Error('Select a thread to fork');
  const title=(t.title.length>70?t.title.slice(0,70):t.title)+' (fork)';
  const result=await createThread(state.threadEvents,state.scope,title,t.question.from,t.question.to,await getHead(),{parentId:t.id});
  await transact(result.events);activeId=result.id;await refresh();
  alert('Fork opened at a pinned parent revision; later changes stay separate.');
 }catch(e){alert(e.message,true);}};
 $('thread-hold').onclick=async()=>{try{const t=active();await transact(await markThread(state.threadEvents,state.scope,t.id,t.status==='held'?'open':'held'));alert('Research thread status updated without erasing its history.');}catch(e){alert(e.message,true);}};
 $('thread-archive').onclick=async()=>{try{const t=active();await transact(await markThread(state.threadEvents,state.scope,t.id,'archived'));alert('Research branch archived; history is retained.');}catch(e){alert(e.message,true);}};
 $('thread-focus-question').onclick=()=>{const t=active();if(!t)return;
  $('question-from').value=t.question.from;$('question-to').value=t.question.to;
  state.networkQuestionThreadId=t.id;
  $('network').scrollIntoView({block:'start',behavior:'smooth'});
  alert('Selected what-if question copied to network inquiry. No assumption or question sent. Choose a peer and explicitly ask.');
 };
 $('thread-export').onclick=()=>{try{
  const output={schema:'motif.collective006.threads.v1',localScope:state.scope,
    researchOnly:true,worldFactsCertified:false,autoPromoted:false,threads:state.threadReports};
  const blob=new Blob([JSON.stringify(output,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='motif-what-if-comparison.json';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),12000);
 }catch(e){alert(e.message,true);}};
 return {refresh,active};
}
