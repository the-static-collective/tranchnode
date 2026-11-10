/** Equal-information parallel vs sequential; synthetic algorithmic sanity check. */
import {investigateOne,scheduleInvestigations} from '../apps/collective/inquiry-engine.mjs';

const full='thread:'+ '0'.repeat(64);
const cases=[];
function caseJob(regime,i){
 const suffix=i.toString(16).padStart(64,'0');
 let nodes=[{id:'nodeA',kind:'claim',content:{from:'A',to:'B',polarity:'supports'}}],assumptions=[];
 if(regime==='bridge')nodes.push({id:'nodeD',kind:'claim',content:{from:'C',to:'D',polarity:'supports'}});
 if(regime==='hypothesis')assumptions=[{id:'assumption:'+'f'.repeat(64),from:'B',to:'C',polarity:'supports'},
   {id:'assumption:'+'e'.repeat(64),from:'C',to:'D',polarity:'supports'}];
 if(regime==='contradiction'){nodes.push({id:'nodeBC',kind:'claim',content:{from:'B',to:'C',polarity:'supports'}});
   assumptions=[{id:'assumption:'+'d'.repeat(64),from:'B',to:'C',polarity:'denies'}];}
 return {regime,thread:{id:'thread:'+suffix,revision:'sha256:'+suffix,status:'open',parent:null,
   question:{from:'A',to:'D'},assumptions},nodes,budget:12,ledgerHead:'sha256:'+'b'.repeat(64)};
}
for(const regime of ['bridge','hypothesis','contradiction'])for(let i=1;i<=24;i++)cases.push(caseJob(regime,cases.length+1));
const summary={schema:'motif.collective007.equal-information-benchmark.v1',synthetic:true,
  fixedCases:cases.length,equallyInformedSequentialBaseline:true,performanceSuperiorityClaim:false,
  comparisons:[],worldTruthCertified:false,networkRequests:0};
const sequential=cases.map(investigateOne);
const grouped=[];
for(let i=0;i<cases.length;i+=24)grouped.push(await scheduleInvestigations(cases.slice(i,i+24),{concurrency:3,executor:async j=>investigateOne(j)}));
const combined=grouped.flatMap(g=>g.results);
if(grouped.some(g=>g.maxActive!==3)||JSON.stringify(sequential)!==JSON.stringify(combined))throw Error('Equal-information result mismatch');
for(const regime of ['bridge','hypothesis','contradiction']){
 const matches=sequential.map((x,i)=>({x,c:cases[i]})).filter(pair=>pair.c.regime===regime).map(pair=>pair.x);
 summary.comparisons.push({regime,count:matches.length,meanCredits:matches.reduce((s,x)=>s+x.creditsSpent,0)/matches.length,
  candidates:matches.reduce((s,x)=>s+x.candidateQuestions.length,0),stopReasons:[...new Set(matches.map(x=>x.stop))],
  allLocal:matches.every(x=>!x.automaticPeerContact),allNonpromoting:matches.every(x=>!x.automaticFactPromotion)});
}
console.log(JSON.stringify(summary,null,2));
