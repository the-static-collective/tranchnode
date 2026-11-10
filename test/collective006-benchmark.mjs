/** Reproducible finite synthetic comparison. NOT evidence of autonomous learning.
 * The fixture designer explicitly constructs helpful peers and outcomes.
 * Compare historical 005 router vs. shrunken admitted-feedback router and random.
 */
import {rankPeers} from '../apps/collective/routing.mjs';
import {feedbackReceipt} from '../apps/collective/feedback.mjs';
const peerIds=[...Array(6)].map((_,i)=>'node:'+String(i+1).padStart(64,'0'));
const peers=peerIds.map((issuer,i)=>({issuer,session:'s'+i,approved:true,connected:true}));
function syntheticRequestId(i,k,j){return 'A'.repeat(39)+String.fromCharCode(65+i%26,65+k%26,65+j%26,65+(i+j+k)%26);}
async function record(events,issuer,question,positive,id){
 const head={requestId:id,peerIssuer:issuer,question,threadId:null};
 events.push(await feedbackReceipt({...head,type:'sent'}));
 events.push(await feedbackReceipt({...head,type:'received'}));
 events.push(await feedbackReceipt({...head,type:'admitted',relevant:positive,acceptedCount:1}));
}
function firstHit(ranked,helpful){return ranked.findIndex(p=>p.issuer===helpful)+1;}
export async function run(n=120){
 const regimes=['warm','cold','misleading','changed'];
 const results={schema:'motif.collective006.synthetic-feedback-benchmark.v1',nPerRegime:n,
   worlds:'developer-authored finite graph fixtures, no real peers or world truth',
   outcomes:{}};
 for(const regime of regimes){
  const counts={oldRouterFirst:0,adaptiveFirst:0,randomFirst:0,
   oldRouterContacts:0,adaptiveContacts:0,randomContacts:0,oracleContacts:0};
  for(let i=0;i<n;i++){
   const rightIndex=(i+2)%6,wrongIndex=(i+4)%6;
   const right=peerIds[rightIndex],wrong=peerIds[wrongIndex],question={from:'A'+i,to:'D'+i};
   const nodes=new Map();
   if(regime==='warm'||regime==='misleading'){
    const sourceOwner=regime==='warm'?right:wrong;
    nodes.set('historical',{kind:'source',content:{originIssuer:sourceOwner,originalNodeId:'old-'+i,
      statement:{from:question.from,to:'B'+i,polarity:'supports'}}});
   }
   const training=[];
   for(let j=0;j<8;j++){
    if(regime==='warm')await record(training,right,question,true,syntheticRequestId(i,1,j));
    if(regime==='misleading'){
      await record(training,wrong,question,false,syntheticRequestId(i,2,j));
      await record(training,right,question,true,syntheticRequestId(i,3,j));
    }
    if(regime==='cold')await record(training,right,question,true,syntheticRequestId(i,4,j));
    if(regime==='changed')await record(training,wrong,question,true,syntheticRequestId(i,5,j));
   }
   const old=rankPeers({nodes,peers,from:question.from,to:question.to});
   const adaptive=rankPeers({nodes,peers,from:question.from,to:question.to,feedback:training});
   // Matched uninformed control: deterministic cyclic shuffling; no privileged facts.
   const shuffled=peers.map((_,j)=>peers[(i+(i*17)%6+j*5)%6]);
   for(const [key,value] of [['oldRouterContacts',firstHit(old,right)],
     ['adaptiveContacts',firstHit(adaptive,right)],['randomContacts',firstHit(shuffled,right)]]){
     counts[key]+=value;
   }
   counts.oracleContacts+=1;
   if(old[0].issuer===right)counts.oldRouterFirst++;
   if(adaptive[0].issuer===right)counts.adaptiveFirst++;
   if(shuffled[0].issuer===right)counts.randomFirst++;
  }
  for(const k of ['oldRouterContacts','adaptiveContacts','randomContacts','oracleContacts'])counts[k]=Number((counts[k]/n).toFixed(3));
  results.outcomes[regime]=counts;
 }
 results.notes={
  warm:'Prior source owner and helpful current peer are identical by fixture design.',
  cold:'No initial source hints; feedback contains previously admitted relevance outcomes.',
  misleading:'Misleading old source owner differs from current helpful peer; prior outcomes reflect that.',
  changed:'Concept drift: past helpfulness is assigned to a now-unhelpful peer; router is not a future oracle.',
  authority:'Feedback measures locally accepted path/frontier changes, not ground-truth correctness or competence.',
  central:'Classical knowledge of the same outcomes can reproduce this heuristic; no collective intelligence superiority.'
 };
 return results;
}
if(process.argv[1]?.endsWith('collective006-benchmark.mjs')) console.log(JSON.stringify(await run(),null,2));
