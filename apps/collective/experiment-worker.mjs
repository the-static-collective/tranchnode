import {planExperiments} from './experiment-planner.mjs';
self.onmessage=e=>{
 try{const result=planExperiments(e.data.job);self.postMessage({ok:true,result});}
 catch(error){self.postMessage({ok:false,error:error.message});}
};
