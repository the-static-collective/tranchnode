/** Browser worker: one budgeted, deterministic thought thread per request. */
import {investigateOne} from './inquiry-engine.mjs';
self.addEventListener('message',event=>{
 const {id,job}=event.data||{};
 try{self.postMessage({id,ok:true,result:investigateOne(job)});}
 catch(error){self.postMessage({id,ok:false,error:String(error?.message||error)});}
});
