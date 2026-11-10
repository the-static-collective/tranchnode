/** Node test adapter proving the browser worker module operates in a real OS worker thread. */
import {parentPort} from 'node:worker_threads';
globalThis.self={addEventListener:(name,callback)=>{
 if(name==='message')parentPort.on('message',data=>callback({data}));
},postMessage:value=>parentPort.postMessage(value)};
await import('../apps/collective/inquiry-worker.mjs');
