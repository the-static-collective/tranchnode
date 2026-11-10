import {answerPacket, append, makeBundle, makeNode, receive, replay, route, statement, verifyBundle} from "./kernel.mjs";
import {openStore} from "./store.mjs";
import {bindThreads} from './thread-ui.mjs';
import {bindInquiries} from './inquiry-ui.mjs';
import {bindExperimentUI} from './experiment-ui.mjs';
import {feedbackReceipt,validateFeedbackLog,relevanceOfAdmission} from './feedback.mjs';
import {localFrontier} from './routing.mjs';
import {bindNetwork} from "./network-ui.mjs";

const $=id=>document.getElementById(id);
const state={store:null,ident:null,scope:null,events:[],nodes:new Map(),staged:null,stagedNetwork:null,lastAnswer:null,
 threadEvents:[],threads:new Map(),threadUI:null,inquiryUI:null,experimentUI:null,threadReports:[],networkQuestionThreadId:null,feedback:[]};
let feedbackQueue=Promise.resolve();
function recordFeedback(data){
 feedbackQueue=feedbackQueue.then(async()=>{const event=await feedbackReceipt(data);await state.store.recordFeedback(event);
  state.feedback=await state.store.getFeedback();}).catch(e=>{setStatus('Research feedback held: '+e.message,true);});
 return feedbackQueue;
}
const short=id=>id?.replace(/^node:|^sha256:/,"").slice(0,12)||"—";
function el(tag,cls,text) {const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function setStatus(message,error=false) {$("status").textContent=message;$("status").className=error?"status bad":"status";}
async function refresh() {
  state.events=await state.store.getEvents();
  state.nodes=(await replay(state.events,state.scope)).nodes;
  if(state.threadUI)await state.threadUI.refresh();
  if(state.inquiryUI)await state.inquiryUI.refresh();
  if(state.experimentUI)await state.experimentUI.refresh();
  $("claim-list").replaceChildren();
  const own=[...state.nodes.values()].filter(n=>n.kind==="claim"&&n.authorId===state.ident.id);
  const received=[...state.nodes.values()].filter(n=>n.kind==="source");
  $("stat-local").textContent=String(own.length);
  $("stat-remote").textContent=String(received.length);
  $("stat-events").textContent=String(state.events.length);
  for(const n of own) {
    const row=el("label","claim-row");
    const box=el("input");box.type="checkbox";box.className="share-pick";box.value=n.id;
    const span=el("span","claim-text",n.content.from+" → "+n.content.to+" ["+n.content.polarity+"]");
    row.append(box,span,el("small","muted",short(n.id)));$("claim-list").append(row);
  }
  if(!own.length)$("claim-list").append(el("p","muted","No local assertions yet. Create one to start."));
  $("source-list").replaceChildren();
  for(const n of received){
    const c=n.content;
    $("source-list").append(el("div","source-row",c.statement.from+" → "+c.statement.to+" ["+c.statement.polarity+"]  ·  "+short(c.originIssuer)));
  }
  if(!received.length)$("source-list").append(el("p","muted","No received testimony yet."));
  $("log").replaceChildren();
  state.events.slice(-8).reverse().forEach(e=>{
    const n=e.operation.node;
    $("log").append(el("li",null,"#"+e.sequence+" · "+n.kind+" · "+short(n.id)));
  });
}
async function addClaim(event){
  event.preventDefault();
  try {
    const s=statement($("from").value.trim(),$("to").value.trim(),$("polarity").value);
    const node=await makeNode(state.scope,state.ident.id,"claim",s);
    const next=await append(state.events,state.scope,state.ident.id,node);
    await state.store.commit(state.events,next,state.scope);
    $("from").value="";$("to").value="";
    await refresh();setStatus("Assertion saved locally. No information was transmitted.");
  } catch(e) {setStatus(e.message,true);}
}
function download(data,filename){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const a=el("a");const url=URL.createObjectURL(blob);a.href=url;a.download=filename;
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
}
async function share(){
  try{
    const ids=[...document.querySelectorAll(".share-pick:checked")].map(e=>e.value);
    const bundle=await makeBundle(state.ident,state.nodes,ids);
    $("out-preview").textContent="Ready to share "+ids.length+" selected assertion(s). This file can be read by anyone who receives it.";
    download(bundle,"tranch-testimony-"+Date.now()+".json");
    setStatus("Signed evidence bundle created. Share the downloaded file deliberately.");
  }catch(e){setStatus(e.message,true);}
}
async function preview() {
  try{
    let raw=$("inbox").value.trim();
    if(!raw)throw new Error("Paste a received bundle or select its file first.");
    if(raw.length>65536)throw new Error("File too large for the trial.");
    const packet=JSON.parse(raw);
    const receipt=await verifyBundle(packet);
    if(receipt.issuer===state.ident.id) throw new Error("This bundle was signed by this same node.");
    state.staged=packet;
    $("in-preview").replaceChildren(
      el("p","ok","Cryptographic signature valid."),
      el("p",null,"Signing-key fingerprint: "+receipt.issuer),
      el("p","muted","This does NOT establish a person's identity or prove the assertions are true."),
      el("p",null,receipt.claims.length+" assertion(s) to admit as attributed source testimony.")
    );
    const list=el("ul","staged-list");
    receipt.claims.forEach(c=>list.append(el("li",null,c.statement.from+" → "+c.statement.to+" ["+c.statement.polarity+"]")));
    $("in-preview").append(list);
    $("admit").disabled=false;
    setStatus("Packet verified. Review source statements before admitting.");
  }catch(e){state.staged=null;state.stagedNetwork=null;$("admit").disabled=true;$("in-preview").textContent="";setStatus("Packet refused: "+e.message,true);}
}
async function admit(){
  try{
    if(!state.staged)throw new Error("No verified bundle staged");
    const context=state.stagedNetwork;
    const before=context?route(state.nodes,context.question.from,context.question.to):null;
    const beforeFrontier=context?localFrontier(state.nodes,context.question.from):null;
    const result=await receive(state.events,state.scope,state.ident.id,state.staged);
    if(result.accepted) await state.store.commit(state.events,result.events,state.scope);
    state.staged=null;state.stagedNetwork=null;$("admit").disabled=true;$("inbox").value="";$("in-preview").textContent="";
    await refresh();
    if(context&&result.accepted){
      const after=route(state.nodes,context.question.from,context.question.to);
      const relevant=relevanceOfAdmission({before,after,beforeFrontier,afterFrontier:localFrontier(state.nodes,context.question.from)});
      await recordFeedback({type:'admitted',requestId:context.requestId,peerIssuer:context.issuer,
        question:context.question,threadId:context.threadId,relevant,acceptedCount:result.accepted});
    }
    setStatus(result.duplicate?"Already imported; not counted twice.":"Admitted "+result.accepted+" signed source assertion(s). Only locally observed relevance can inform routing; statements remain unverified.");
  }catch(e){setStatus(e.message,true);}
}
async function investigate(event) {
  event.preventDefault();
  try{
    const start=$("question-from").value.trim(),goal=$("question-to").value.trim();
    const answer=await answerPacket(state.events,state.scope,start,goal);
    state.lastAnswer=answer;
    $("answer").replaceChildren();
    const result=answer.result;
    $("answer").append(el("strong","verdict",result.status.replaceAll("_"," ")));
    if(result.path.length)$("answer").append(el("p","path",result.path.join(" → ")));
    if(result.evidenceIds.length)$("answer").append(el("p","muted","Supporting source IDs: "+result.evidenceIds.map(short).join(" · ")));
    if(result.tensions.length)result.tensions.forEach(t=>$("answer").append(el("p","warn",
       "Unresolved contradiction: "+t.from+" → "+t.to+"; evidence on both sides retained.")));
    $("answer").append(el("p","muted","Conditional on recorded assertions; not an independently verified real-world fact."));
    $("download-answer").disabled=false;
  }catch(e){setStatus(e.message,true);}
}
async function start(){
  if(!window.isSecureContext)throw new Error("Use HTTPS or localhost; identity signing requires a secure context.");
  state.store=await openStore();state.ident=await state.store.getIdentity();
  state.scope="local:"+state.ident.id;
  $("node-id").textContent=state.ident.id;
  $("fingerprint").textContent=short(state.ident.id);
  $("claim-form").addEventListener("submit",addClaim);
  $("share").addEventListener("click",share);
  $("preview").addEventListener("click",preview);
  $("admit").addEventListener("click",admit);
  $("inbox").addEventListener("input",()=>{state.staged=null;state.stagedNetwork=null;$("admit").disabled=true;});
  $("packet-file").addEventListener("change",async e=>{
    const file=e.target.files?.[0];if(!file)return;
    if(file.size>65536){setStatus("The selected file exceeds 64 KB.",true);return;}
    $("inbox").value=await file.text();state.staged=null;state.stagedNetwork=null;$("admit").disabled=true;
  });
  $("question-form").addEventListener("submit",investigate);
  $("download-answer").addEventListener("click",()=>{
    if(state.lastAnswer)download(state.lastAnswer,"tranch-answer-proof-"+Date.now()+".json");
  });
  $("copy-id").addEventListener("click",async()=>{
    try{await navigator.clipboard.writeText(state.ident.id);setStatus("Signing key fingerprint copied.");}
    catch(e){setStatus("Clipboard unavailable; select the fingerprint to copy manually.",true);}
  });
  state.feedback=await validateFeedbackLog(await state.store.getFeedback());
  state.threadUI=bindThreads({state,setStatus,el});
  await refresh();
  bindNetwork({state,refresh,setStatus,el,recordFeedback});
  state.inquiryUI=bindInquiries({state,setStatus,el});
  state.experimentUI=bindExperimentUI({state,setStatus,el});
  await state.inquiryUI.refresh();
  await state.experimentUI.refresh();
  $("boot").hidden=true;$("workspace").hidden=false;
  setStatus("Local-first node ready. Your private signing key stays in this browser's storage.");
  if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
start().catch(e=>{$("boot").textContent="Unable to initialize local node: "+e.message;setStatus("App initialization failed.",true);});
