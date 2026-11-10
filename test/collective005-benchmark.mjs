
/** Frozen synthetic toy histories. Evaluates recipient exposure until a hidden
 * answer-holder is contacted, NOT actual peer knowledge discovery or P2P.
 */
import {rankPeers} from '../apps/collective/routing.mjs';
function rng(seed){let x=seed|0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/2**32;};}
function shuffle(items,random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function source(issuer,sourceId,from,to){return {kind:'source',content:{originIssuer:issuer,originalNodeId:sourceId,statement:{from,to,polarity:'supports'}}};}
function trial(seed,regime){
 const random=rng(seed*271828+1);
 const participants=Array.from({length:6},(_,i)=>({session:'session-'+i,issuer:'node-'+i,approved:true,connected:true}));
 const hiddenHolder=participants[Math.floor(random()*6)].issuer;
 const decoy=participants.find(p=>p.issuer!==hiddenHolder).issuer;
 const nodes=new Map([['local',{kind:'claim',content:{from:'A',to:'B',polarity:'supports'}}]]);
 for(let i=0;i<6;i++){
  const issuer=participants[i].issuer;
  const related=regime==='warm'?issuer===hiddenHolder:regime==='misleading'?issuer===decoy:false;
  nodes.set('prior-'+i,source(issuer,'previous-'+seed+'-'+i,related?'B':'unrelated-'+seed+'-'+i,related?'X':'remote-'+seed+'-'+i));
 }
 // The holder is NEVER passed to rankPeers: only historical voluntary cards.
 const ordered=rankPeers({nodes,peers:participants,from:'A',to:'D'}).map(p=>p.issuer);
 const randomOrder=shuffle(participants,random).map(p=>p.issuer);
 return {first:+(ordered[0]===hiddenHolder),randomFirst:+(randomOrder[0]===hiddenHolder),
  routingRequests:ordered.indexOf(hiddenHolder)+1,randomRequests:randomOrder.indexOf(hiddenHolder)+1};
}
function run(count=120){
 const outcomes={};
 for(const regime of ['warm','cold','misleading']){
  const cases=Array.from({length:count},(_,i)=>trial(i+1,regime));
  const sum=k=>cases.reduce((n,c)=>n+c[k],0);
  const mean=k=>Number((sum(k)/count).toFixed(3));
  outcomes[regime]={cases:count,firstContactRouting:sum('first'),firstContactRandom:sum('randomFirst'),
   averageQuestionsUntilHelpfulPeer:{routed:mean('routingRequests'),random:mean('randomRequests'),broadcast:6,clairvoyant:1}};
 }
 return {schema:'motif.collective005.question-routing-benchmark.v1',
  setup:'six synthetic peer portfolios; hidden helpful holder revealed only during scoring',
  basis:'pre-admitted voluntary source cards; no remote inventory lookup',
  outcomes,
  limits:['Warm results assume deliberately correlated prior disclosures','Misleading history can cause first-contact failure',
   'Question recipient counts are not complete privacy metrics',
   'No live WebRTC/Android field test, general intelligence or superiority over equal-information central BFS']};
}
if(import.meta.url===new URL(process.argv[1],'file://').href)console.log(JSON.stringify(run(),null,2));
export {run};
