import {identity, replay} from "./kernel.mjs";
import {replayThreads} from "./threads.mjs";
import {validateFeedbackLog} from "./feedback.mjs";
import {replayInquiryReceipts,MAX_RUNS,MAX_ALLOCATION} from "./inquiry-receipts.mjs";
import {replayPlanReceipts,MAX_PLAN_RECEIPTS} from "./experiment-receipts.mjs";
import {replayAdaptiveReceipts,MAX_ADAPTIVE_RECEIPTS} from "./adaptive-receipts.mjs";
import {auditResolutionReceipts,MAX_RESOLUTIONS} from "./calibration.mjs";
import {auditTemporalReceipts,MAX_TEMPORAL_EVENTS} from "./temporal.mjs";
import {replayDependencies,DEPENDENCY_CAP} from "./dependency-delta.mjs";
import {auditTrajectoryReceipts,TRAJECTORY_RUN_CAP} from "./trajectories.mjs";
import {auditRegimeReceipts,REGIME_RUN_CAP} from "./regime-forecast.mjs";

const DB_NAME="tranch-collective-003";
const VERSION=10;

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
    if (!db.objectStoreNames.contains("adaptive_plans")) db.createObjectStore("adaptive_plans",{keyPath:"id"});
    if (!db.objectStoreNames.contains("resolution_checks")) db.createObjectStore("resolution_checks",{keyPath:"id"});
    if (!db.objectStoreNames.contains("temporal_annotations")) db.createObjectStore("temporal_annotations",{keyPath:"id"});
    if (!db.objectStoreNames.contains("dependency_events")) db.createObjectStore("dependency_events",{keyPath:"sequence"});
    if (!db.objectStoreNames.contains("trajectory_scans")) db.createObjectStore("trajectory_scans",{keyPath:"id"});
    if (!db.objectStoreNames.contains("regime_scans")) db.createObjectStore("regime_scans",{keyPath:"id"});
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
  async function getAdaptivePlans(scope){
    const records=await request(db.transaction('adaptive_plans','readonly').objectStore('adaptive_plans').getAll());
    await replayAdaptiveReceipts(records,scope);return records;
  }
  async function recordAdaptivePlan(receipt,scope){
    const records=await getAdaptivePlans(scope);
    if(records.length>=MAX_ADAPTIVE_RECEIPTS)throw Error('Adaptive research history cap reached; nothing silently deleted');
    await replayAdaptiveReceipts([...records,receipt],scope);
    const tx=db.transaction('adaptive_plans','readwrite');
    tx.objectStore('adaptive_plans').add(receipt);await finished(tx);return receipt.id;
  }
  async function getResolutionReceipts(scope){
    const records=await request(db.transaction('resolution_checks','readonly').objectStore('resolution_checks').getAll());
    await auditResolutionReceipts(records,scope);return records.sort((a,b)=>a.at.localeCompare(b.at)||a.caseId.localeCompare(b.caseId));
  }
  async function recordResolutionReceipt(receipt,scope){
    const records=await getResolutionReceipts(scope);
    if(records.length>=MAX_RESOLUTIONS)throw Error('Resolution history is full; do not erase original checks');
    await auditResolutionReceipts([...records,receipt],scope);
    const tx=db.transaction('resolution_checks','readwrite');tx.objectStore('resolution_checks').add(receipt);
    await finished(tx);return receipt.id;
  }
  async function getTemporalRecords(scope){
    const records=await request(db.transaction('temporal_annotations','readonly').objectStore('temporal_annotations').getAll());
    await auditTemporalReceipts(records,scope);return records;
  }
  async function recordTemporalRecord(receipt,scope,nodes){
    const current=await getTemporalRecords(scope);
    if(current.length>=MAX_TEMPORAL_EVENTS)throw Error('Temporal annotation history at capacity');
    await auditTemporalReceipts([...current,receipt],scope,nodes);
    const tx=db.transaction('temporal_annotations','readwrite');tx.objectStore('temporal_annotations').add(receipt);
    await finished(tx);return receipt.id;
  }
  async function getDependencyEvents(scope,nodes=null){
    const records=await request(db.transaction('dependency_events','readonly').objectStore('dependency_events').getAll());
    await replayDependencies(records,scope,nodes);return records;
  }
  async function recordDependencyEvent(event,scope,nodes){
    const old=await getDependencyEvents(scope,nodes);
    if(old.length>=DEPENDENCY_CAP)throw Error('Dependency event cap reached');
    await replayDependencies([...old,event],scope,nodes);
    const tx=db.transaction('dependency_events','readwrite');
    tx.objectStore('dependency_events').add(event);await finished(tx);return event.id;
  }
  async function getTrajectoryReceipts(scope){
    const rows=await request(db.transaction('trajectory_scans','readonly').objectStore('trajectory_scans').getAll());
    await auditTrajectoryReceipts(rows,scope);return rows;
  }
  async function recordTrajectoryReceipt(receipt,scope){
    const rows=await getTrajectoryReceipts(scope);
    if(rows.length>=TRAJECTORY_RUN_CAP)throw Error('Trajectory research history at capacity');
    await auditTrajectoryReceipts([...rows,receipt],scope);
    const tx=db.transaction('trajectory_scans','readwrite');
    tx.objectStore('trajectory_scans').add(receipt);await finished(tx);return receipt.id;
  }
  async function getRegimeReceipts(scope){
    const rows=await request(db.transaction('regime_scans','readonly').objectStore('regime_scans').getAll());
    await auditRegimeReceipts(rows,scope);return rows;
  }
  async function recordRegimeReceipt(record,scope){
    const previous=await getRegimeReceipts(scope);
    if(previous.length>=REGIME_RUN_CAP)throw Error('Regime history at capacity; no automatic deletion');
    await auditRegimeReceipts([...previous,record],scope);
    const tx=db.transaction('regime_scans','readwrite');tx.objectStore('regime_scans').add(record);
    await finished(tx);return record.id;
  }
  return {db,getIdentity,getEvents,commit,getThreadEvents,commitThreads,getFeedback,recordFeedback,
      getTemporalRecords,recordTemporalRecord,getDependencyEvents,recordDependencyEvent,getTrajectoryReceipts,recordTrajectoryReceipt,getRegimeReceipts,recordRegimeReceipt,
      getInquiryRuns,recordInquiryRun,getInquiryBudgets,setInquiryBudget,
      getExperimentPlans,recordExperimentPlan,getAdaptivePlans,recordAdaptivePlan,
      getResolutionReceipts,recordResolutionReceipt};
}
