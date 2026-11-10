import {identity, replay} from "./kernel.mjs";
import {replayThreads} from "./threads.mjs";
import {validateFeedbackLog} from "./feedback.mjs";
import {replayInquiryReceipts,MAX_RUNS,MAX_ALLOCATION} from "./inquiry-receipts.mjs";
import {replayPlanReceipts,MAX_PLAN_RECEIPTS} from "./experiment-receipts.mjs";

const DB_NAME="tranch-collective-003";
const VERSION=4;

function request(r) {return new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function finished(t) {return new Promise((resolve,reject)=>{t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||new Error("Transaction aborted"));});}
export async function openStore() {
  const open=indexedDB.open(DB_NAME,VERSION);
  open.onupgradeneeded=()=> {
    const db=open.result;
    if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
    if (!db.objectStoreNames.contains("events")) db.createObjectStore("events",{keyPath:"sequence"});
    if (!db.objectStoreNames.contains("thread_events")) db.createObjectStore("thread_events",{keyPath:"slot"});
    if (!db.objectStoreNames.contains("feedback")) db.createObjectStore("feedback",{keyPath:"id"});
    if (!db.objectStoreNames.contains("inquiry_runs")) db.createObjectStore("inquiry_runs",{keyPath:"id"});
    if (!db.objectStoreNames.contains("inquiry_budget")) db.createObjectStore("inquiry_budget",{keyPath:"threadId"});
    if (!db.objectStoreNames.contains("experiment_plans")) db.createObjectStore("experiment_plans",{keyPath:"id"});
  };
  const db=await request(open);
  async function getIdentity() {
    const existing=await request(db.transaction("meta","readonly").objectStore("meta").get("identity"));
    if (existing) return existing;
    const fresh=await identity();
    const tx=db.transaction("meta","readwrite");
    tx.objectStore("meta").put(fresh,"identity");
    await finished(tx);
    return fresh;
  }
  async function getEvents() {
    return await request(db.transaction("events","readonly").objectStore("events").getAll());
  }
  async function commit(previous,updated,scope) {
    const old=await replay(previous,scope);
    if (updated.length<previous.length) throw new Error("Cannot delete accepted events");
    for (let i=0;i<previous.length;i++) if (JSON.stringify(updated[i])!==JSON.stringify(previous[i])) throw new Error("Attempted history rewrite");
    await replay(updated,scope);
    const tx=db.transaction("events","readwrite");
    const store=tx.objectStore("events");
    // No put/overwrite: IndexedDB unique keys enforce append-only at this layer.
    for (const event of updated.slice(previous.length)) store.add(event);
    await finished(tx);
    return old.head;
  }
  async function getThreadEvents(){return await request(db.transaction("thread_events","readonly").objectStore("thread_events").getAll());}
  async function commitThreads(previous,updated,scope){
    const before=await replayThreads(previous,scope),after=await replayThreads(updated,scope);
    if(after.size<before.size||updated.length<previous.length)throw Error('Cannot erase scenario history');
    const known=new Map(previous.map(e=>[e.slot,e]));
    for(const prior of previous)if(!updated.some(e=>e.slot===prior.slot&&JSON.stringify(e)===JSON.stringify(prior)))throw Error('Rewritten scenario event');
    const novel=updated.filter(e=>!known.has(e.slot));
    const tx=db.transaction('thread_events','readwrite');
    const table=tx.objectStore('thread_events');
    for(const event of novel)table.add(event);
    await finished(tx);
    return novel.length;
  }
  async function getFeedback(){return await request(db.transaction('feedback','readonly').objectStore('feedback').getAll());}
  async function recordFeedback(event){
    const previous=await getFeedback();
    await validateFeedbackLog([...previous,event]);
    const tx=db.transaction('feedback','readwrite');
    tx.objectStore('feedback').add(event);
    await finished(tx);
    return event.id;
  }
  async function getInquiryRuns(scope){
    const runs=await request(db.transaction('inquiry_runs','readonly').objectStore('inquiry_runs').getAll());
    await replayInquiryReceipts(runs,scope);return runs;
  }
  async function recordInquiryRun(receipt,scope){
    const runs=await getInquiryRuns(scope);
    if(runs.length>=MAX_RUNS)throw Error('Local research receipt cap reached');
    await replayInquiryReceipts([...runs,receipt],scope);
    const tx=db.transaction('inquiry_runs','readwrite');tx.objectStore('inquiry_runs').add(receipt);
    await finished(tx);return receipt.id;
  }
  async function getInquiryBudgets(){return await request(db.transaction('inquiry_budget','readonly').objectStore('inquiry_budget').getAll());}
  async function setInquiryBudget(threadId,allocation){
    if(!/^thread:[0-9a-f]{64}$/.test(threadId)||!Number.isSafeInteger(allocation)
       ||allocation<2||allocation>MAX_ALLOCATION)throw Error('Invalid thread budget setting');
    const tx=db.transaction('inquiry_budget','readwrite');
    tx.objectStore('inquiry_budget').put({threadId,allocation});await finished(tx);
  }
  async function getExperimentPlans(scope){
    const records=await request(db.transaction('experiment_plans','readonly').objectStore('experiment_plans').getAll());
    await replayPlanReceipts(records,scope);
    return records;
  }
  async function recordExperimentPlan(receipt,scope){
    const records=await getExperimentPlans(scope);
    if(records.length>=MAX_PLAN_RECEIPTS)throw Error('Plan history full; no automatic pruning of research');
    await replayPlanReceipts([...records,receipt],scope);
    const tx=db.transaction('experiment_plans','readwrite');
    tx.objectStore('experiment_plans').add(receipt);
    await finished(tx);return receipt.id;
  }
  return {db,getIdentity,getEvents,commit,getThreadEvents,commitThreads,getFeedback,recordFeedback,
      getInquiryRuns,recordInquiryRun,getInquiryBudgets,setInquiryBudget,
      getExperimentPlans,recordExperimentPlan};
}
