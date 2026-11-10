import {adaptivePolicy} from './adaptive-strategy.mjs';
self.onmessage=e=>{try{self.postMessage({ok:true,result:adaptivePolicy(e.data)});}catch(error){self.postMessage({ok:false,error:error.message});}};
