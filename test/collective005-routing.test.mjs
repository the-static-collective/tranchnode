
import test from 'node:test';
import assert from 'node:assert/strict';
import {identity,makeNode,append,makeBundle,receive,replay,statement,answerPacket} from '../apps/collective/kernel.mjs';
import {rankPeers,localFrontier,nextSuggestedPeer} from '../apps/collective/routing.mjs';
import {CollectiveMesh} from '../apps/collective/network.mjs';
import {randomSecret} from '../apps/collective/net-protocol.mjs';

async function init(){const ident=await identity();return {ident,scope:'local:'+ident.id,events:[]};}
async function claim(w,a,b,polarity='supports'){
 const n=await makeNode(w.scope,w.ident.id,'claim',statement(a,b,polarity));
 w.events=await append(w.events,w.scope,w.ident.id,n);return n.id;
}
async function share(to,from,ids){
 const bundle=await makeBundle(from.ident,(await replay(from.events,from.scope)).nodes,ids);
 to.events=(await receive(to.events,to.scope,to.ident.id,bundle)).events;
}
const peers=(...ws)=>ws.map((w,i)=>({session:'session-'+i,issuer:w.ident.id,approved:true,connected:true}));

test('previous signed testimony ranks relevant node without disclosing its private holdings',async()=>{
 const a=await init(),b=await init(),c=await init();
 await claim(a,'A','B');
 const prior=await claim(b,'B','X'),hidden=await claim(b,'X','D');
 const unrelated=await claim(c,'Q','R');
 await share(a,b,[prior]);await share(a,c,[unrelated]);
 const nodes=(await replay(a.events,a.scope)).nodes;
 const ranked=rankPeers({nodes,peers:peers(b,c),from:'A',to:'D'});
 assert.equal(ranked[0].issuer,b.ident.id);
 assert(ranked[0].score>ranked[1].score);
 assert.equal(nextSuggestedPeer(ranked)?.issuer,b.ident.id);
 assert.deepEqual([...localFrontier(nodes,'A')].sort(),['A','B','X']);
 assert.equal((await answerPacket(a.events,a.scope,'A','D')).result.status,'UNKNOWN_INSUFFICIENT_EVIDENCE');
 await share(a,b,[hidden]);
 assert.deepEqual((await answerPacket(a.events,a.scope,'A','D')).result.path,['A','B','X','D']);
});

test('unknown peers remain eligible and unapproved peers stay invisible to routing',async()=>{
 const a=await init(),b=await init(),c=await init();
 const p=peers(b,c);
 const scored=rankPeers({nodes:(await replay(a.events,a.scope)).nodes,peers:p,from:'A',to:'D'});
 assert.equal(scored.length,2);assert(scored.every(x=>x.score===0));
 p[0].approved=false;p[1].connected=false;
 assert.equal(rankPeers({nodes:new Map(),peers:p,from:'A',to:'D'}).length,0);
});

test('contradictory edge cannot fabricate a connected frontier',async()=>{
 const a=await init();await claim(a,'A','B');await claim(a,'A','B','denies');await claim(a,'B','C');
 assert.deepEqual([...localFrontier((await replay(a.events,a.scope)).nodes,'A')],['A']);
});

test('source repeats do not manufacture a stronger relevance score',()=>{
 const nodes=new Map();
 for(let i=0;i<5;i++)nodes.set('copy'+i,{kind:'source',content:{originIssuer:'b',originalNodeId:'one',statement:{from:'A',to:'B',polarity:'supports'}}});
 const p=rankPeers({nodes,peers:[{issuer:'b',session:'s',approved:true,connected:true}],from:'A',to:'D'});
 assert.equal(p[0].priorSourceCount,1);assert.equal(p[0].score,4);
});

test('ranking is local, requires no network, and returns no private inventory',()=>{
 const nodes=new Map([['x',{kind:'source',content:{originIssuer:'b',originalNodeId:'1',statement:{from:'A',to:'B',polarity:'supports'}}}]]);
 const before=JSON.stringify([...nodes]);
 const p=rankPeers({nodes,peers:[{issuer:'b',session:'s',approved:true,connected:true}],from:'A',to:'C'});
 assert.equal(JSON.stringify([...nodes]),before);assert.equal(p.length,1);
 assert.equal('undisclosedFacts' in p[0],false);
 assert.equal(nextSuggestedPeer(p,['s']),null);
});

test('targeted transmission reaches exactly one approved session, and invalid peers block partial fanout',async()=>{
 const ident=await identity(),mesh=new CollectiveMesh({ident,room:randomSecret(),url:'wss://example.test/signal'});
 mesh.me='self';mesh.addPeer('b');mesh.addPeer('c');
 const sentB=[],sentC=[];
 for(const [id,out] of [['b',sentB],['c',sentC]]){
  const p=mesh.peers.get(id);p.issuer='node:'+id;p.approved=true;
  p.channel={readyState:'open',send:raw=>out.push(JSON.parse(raw))};
 }
 assert.equal(mesh.ask('A','D',{sessions:['b']}),1);
 assert.equal(sentB.length,1);assert.equal(sentC.length,0);
 assert.deepEqual([sentB[0].from,sentB[0].to],['A','D']);
 assert.throws(()=>mesh.ask('A','D',{sessions:['b','b']}),/distinct/);
 mesh.peers.get('c').approved=false;
 assert.throws(()=>mesh.ask('A','D',{sessions:['b','c']}),/not approved/);
 assert.equal(sentB.length,1);
});

test('bounded pending requests never silently exceed cap',async()=>{
 const ident=await identity(),mesh=new CollectiveMesh({ident,room:randomSecret(),url:'wss://example.test/signal'});
 mesh.me='self';mesh.addPeer('b');const p=mesh.peers.get('b');
 p.issuer='node:b';p.approved=true;const sent=[];p.channel={readyState:'open',send:raw=>sent.push(raw)};
 for(let i=0;i<32;i++)mesh.ask('A','B',{sessions:['b']});
 assert.throws(()=>mesh.ask('A','B',{sessions:['b']}),/Too many/);assert.equal(sent.length,32);
});

test('misleading history does not claim expertise; next candidate remains available',()=>{
 const nodes=new Map([['old',{kind:'source',content:{originIssuer:'wrong',originalNodeId:'one',statement:{from:'A',to:'B',polarity:'supports'}}}]]);
 const peers=[{issuer:'wrong',session:'wrong',approved:true,connected:true},{issuer:'right',session:'right',approved:true,connected:true}];
 const p=rankPeers({nodes,peers,from:'A',to:'Z'});
 assert.equal(p[0].issuer,'wrong');assert.equal(nextSuggestedPeer(p,['wrong']).issuer,'right');
});
test('frozen benchmark demonstrates warm benefit but misleading-history failure',async()=>{
 const {run}=await import('./collective005-benchmark.mjs');
 const out=run(120).outcomes;
 assert(out.warm.firstContactRouting>out.warm.firstContactRandom);
 assert(out.misleading.firstContactRouting<out.misleading.firstContactRandom);
 assert(out.cold.averageQuestionsUntilHelpfulPeer.routed>1);
});
