
/** COLLECTIVE-005. Local-only, consent-bounded question routing.
 * Past disclosures are hints, not verified knowledge or future permissions.
 */
import {validateQuestion} from './net-protocol.mjs';

export function localFrontier(nodes,start){
 if(!(nodes instanceof Map)||typeof start!=='string'||!start.trim()||start.length>90)throw Error('Invalid local evidence or start');
 const links=new Map();
 for(const node of nodes.values()){
  if(node?.kind!=='claim'&&node?.kind!=='source')continue;
  const s=node.kind==='claim'?node.content:node.content?.statement;
  if(!s||typeof s.from!=='string'||typeof s.to!=='string'||!['supports','denies'].includes(s.polarity))continue;
  const key=JSON.stringify([s.from,s.to]);
  if(!links.has(key))links.set(key,{from:s.from,to:s.to,yes:false,no:false});
  links.get(key)[s.polarity==='supports'?'yes':'no']=true;
 }
 const graph=new Map();
 for(const e of links.values())if(e.yes&&!e.no){
  if(!graph.has(e.from))graph.set(e.from,[]);
  graph.get(e.from).push(e.to);
 }
 const reached=new Set([start]), queue=[start];
 for(let i=0;i<queue.length&&reached.size<2000;i++){
  for(const v of graph.get(queue[i])||[])if(!reached.has(v)&&reached.size<2000){
   reached.add(v);queue.push(v);
  }
 }
 return reached;
}
export function rankPeers({nodes,peers,from,to}){
 const q=validateQuestion(from,to);
 if(!(nodes instanceof Map)||!Array.isArray(peers))throw Error('Local source and peer snapshots required');
 const reached=localFrontier(nodes,q.from), prior=new Map();
 for(const n of nodes.values()){
  if(n?.kind!=='source')continue;
  const c=n.content,s=c?.statement;
  if(typeof c?.originIssuer!=='string'||typeof c?.originalNodeId!=='string'||!s||
     typeof s.from!=='string'||typeof s.to!=='string'||!['supports','denies'].includes(s.polarity))continue;
  if(!prior.has(c.originIssuer))prior.set(c.originIssuer,new Map());
  prior.get(c.originIssuer).set(c.originIssuer+'\u0000'+c.originalNodeId,s);
 }
 const ranked=[];
 for(const p of peers){
  if(!p?.approved||!p?.connected||typeof p.issuer!=='string'||typeof p.session!=='string')continue;
  let score=0;const reasons=new Set(),seen=prior.get(p.issuer)||new Map();
  for(const s of seen.values()){
   if(s.polarity!=='supports')continue;
   if(reached.has(s.from)){score+=4;reasons.add('Previously shared a link near your reachable frontier');}
   if(s.to===q.to){score+=3;reasons.add('Previously shared a link arriving at the destination');}
   if(s.from===q.to){score++;reasons.add('Previously shared a link leaving the destination');}
  }
  ranked.push({session:p.session,issuer:p.issuer,score:Math.min(score,40),
   priorSourceCount:seen.size,reason:reasons.size?[...reasons].join('; '):
    'Unknown relevance: no historical links to the question'});
 }
 ranked.sort((a,b)=>b.score-a.score||a.issuer.localeCompare(b.issuer)||a.session.localeCompare(b.session));
 return ranked;
}
export function nextSuggestedPeer(ranked,alreadyAsked=[]){
 const prior=new Set(alreadyAsked);
 return ranked.find(p=>!prior.has(p.session))||null;
}
