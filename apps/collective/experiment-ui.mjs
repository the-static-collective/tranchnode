/** COLLECTIVE-008: opt-in research strategy, never a transmission or fact promotion. */
import {auditImportedSources} from './kernel.mjs';
import {reportFreshness} from './inquiry-receipts.mjs';
import {PLANNER_SCHEMA} from './experiment-planner.mjs';
import {makePlanReceipt,planFreshness} from './experiment-receipts.mjs';

function work(job){return new Promise((resolve,reject)=>{
 if(typeof Worker==='undefined')return reject(Error('A module Web Worker is required.'));
 const worker=new Worker(new URL('./experiment-worker.mjs',import.meta.url),{type:'module'});
 let done=false;const timer=setTimeout(()=>finish(Error('Planner worker exceeded 8-second limit')),8000);
 function finish(err,result){if(done)return;done=true;clearTimeout(timer);worker.terminate();err?reject(err):resolve(result);}
 worker.onmessage=e=>e.data?.ok?finish(null,e.data.result):finish(Error(e.data?.error||'Planner rejected inputs'));
 worker.onerror=e=>finish(Error(e.message||'Planner worker failed'));
 try{worker.postMessage({job});}catch(e){finish(e);}
});}
export function bindExperimentUI({state,setStatus,el}){
 const $=id=>document.getElementById(id);
 let busy=false,plans=[],research=[],current=null;
 const say=(m,bad=false)=>setStatus(m,bad);
 const head=()=>state.events.at(-1)?.id??null;
 function download(payload){const a=el('a'),url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  a.href=url;a.download='motif-next-experiment-receipt.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),14000);}
 function freshJobs(){
  const jobs=[];
  for(const t of [...(state.threads?.values()||[])].sort((a,b)=>a.id.localeCompare(b.id))){
   if(t.status!=='open')continue;
   const candidates=research.filter(x=>x.result.threadId===t.id&&reportFreshness(x,t,head())==='CURRENT_SNAPSHOT')
    .sort((a,b)=>b.at.localeCompare(a.at)||a.id.localeCompare(b.id));
   const item=candidates[0];if(!item)continue;
   jobs.push({threadId:t.id,threadRevision:t.revision,receiptId:item.id,ledgerHead:head(),status:t.status,
    question:t.question,assumptions:[...t.assumptions.values()].map(a=>({...a})),candidateQuestions:item.result.candidateQuestions.map(x=>({from:x.from,to:x.to,kind:x.kind}))});
  }
  return jobs;
 }
 function display(receipt){
  $('experiment-candidates').replaceChildren();
  if(!receipt){$('experiment-candidates').append(el('p','muted','Investigate open threads first, then choose RUN NEXT-QUESTION PLANNER.'));return;}
  const plan=receipt.plan;
  const fresh=planFreshness(plan,state.threads,research,head());
  $('experiment-status').textContent=fresh.replaceAll('_',' ')+' · '+plan.evaluatedCandidateCount+' inspected · '+plan.creditsSpent+'/'+plan.budget+' local probe credits · '+plan.unevaluatedCandidateCount+' untested';
  if(!plan.candidates.length){$('experiment-candidates').append(el('p','muted','No current candidate met this frozen budget. Increase credits or investigate additional branches.'));return;}
  for(const [i,c] of plan.candidates.slice(0,8).entries()){
   const card=el('article','experiment-card');
   card.append(el('strong',null,(i===0?'RECOMMENDED · ':'ALTERNATIVE · ')+c.from+' → '+c.to));
   card.append(el('p','muted','Discriminates '+c.decisionThreadCount+'/'+c.sourceThreadCount+' nominating branches · '+c.conditionalPathSplitCount+' path splits · '+c.probeCreditsSpent+' simulated route calls'));
   card.append(el('small','muted','Two-outcome upper bound: '+c.jointInformationUpperBoundBits+' bit; assuming equal yes/no probability. No real probability measured.'));
   const box=el('details','experiment-details');const summary=el('summary',null,'Inspect what could change in each branch');box.append(summary);
   for(const impact of c.impacts){const t=state.threads.get(impact.threadId);
    const line=el('p','muted',(t?.title||impact.threadId.slice(-9))+' · if support: '+impact.ifSupports.status+' · if denial: '+impact.ifDenies.status);
    box.append(line);
   }
   card.append(box);
   const action=el('button','secondary','PREPARE QUESTION — NO TRANSMISSION');action.type='button';action.disabled=fresh!=='CURRENT_SNAPSHOT';
   action.onclick=()=>{$('question-from').value=c.from;$('question-to').value=c.to;
    state.networkQuestionThreadId=c.impacts.length===1?c.impacts[0].threadId:null;
    $('network').scrollIntoView({behavior:'smooth',block:'start'});
    say('Question prepared from '+c.sourceThreadCount+' branches. No evidence or message was transmitted. Choose recipient and ask separately.');};
   card.append(action);$('experiment-candidates').append(card);
  }
 }
 async function refresh(){
  research=await state.store.getInquiryRuns(state.scope);
  plans=await state.store.getExperimentPlans(state.scope);
  const jobs=freshJobs();
  current=plans.sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id)).at(-1)||null;
  $('experiment-run').disabled=busy||!jobs.length;
  $('experiment-export').disabled=!current;
  $('experiment-count').textContent=jobs.length+' current thread(s) ready';
  display(current);
 }
 async function run(){
  if(busy)return;busy=true;$('experiment-run').disabled=true;
  try{
   await auditImportedSources(state.nodes);
   research=await state.store.getInquiryRuns(state.scope);
   const jobs=freshJobs();if(!jobs.length)throw Error('Run the bounded investigations first; no current candidate receipts.');
   const nodes=[...state.nodes.values()].filter(x=>['claim','source'].includes(x.kind)).map(n=>({
      id:n.id,kind:n.kind,content:n.kind==='source'?{statement:n.content.statement}:n.content}));
   const probeCredits=Number($('experiment-budget').value);
   $('experiment-progress').textContent='Simulating conditional answers locally…';
   const plan=await work({jobs,nodes,ledgerHead:head(),probeCredits});
   if(plan.schema!==PLANNER_SCHEMA)throw Error('Unexpected planner output');
   const receipt=await makePlanReceipt(state.scope,plan);
   await state.store.recordExperimentPlan(receipt,state.scope);
   $('experiment-progress').textContent='Ranked '+plan.evaluatedCandidateCount+' candidate questions; '+plan.creditsSpent+' route calls. No external action.';
   say('Planning finished. Compare competing what-ifs; select a question deliberately.');
  }catch(e){$('experiment-progress').textContent='Planner held: '+e.message;say(e.message,true);}
  finally{busy=false;await refresh();}
 }
 $('experiment-run').onclick=run;
 $('experiment-export').onclick=()=>{if(current)download(current);};
 return {refresh,run};
}
