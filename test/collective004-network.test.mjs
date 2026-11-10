import test from 'node:test';
import assert from 'node:assert/strict';
import {identity,makeNode,append,makeBundle,verifyBundle,receive,answerPacket,replay,statement} from '../apps/collective/kernel.mjs';
import {NET_SCHEMA,randomSecret,createHello,verifyHello,validRoom,validRelayURL} from '../apps/collective/net-protocol.mjs';
import {CollectiveMesh} from '../apps/collective/network.mjs';

test('secret room tokens, local dev vs production wss relay only',()=>{
 const room=randomSecret();assert(validRoom(room));assert(!validRoom('short'));
 assert(validRelayURL('wss://example.org/signal'));
 assert(validRelayURL('ws://127.0.0.1:8765/signal'));
 assert(!validRelayURL('ws://evil.example/signal'));
 assert(!validRelayURL('https://example.org/signal'));
 assert(!validRelayURL('wss://person:pw@example.org/signal'));
});

test('independent WebCrypto identities bind the room and both session IDs',async()=>{
 const a=await identity(),b=await identity(),room=randomSecret();
 const hello=await createHello(a,room,'transport-A','transport-B');
 assert.equal((await verifyHello(hello,room,'transport-A','transport-B')).issuer,a.id);
 await assert.rejects(verifyHello(hello,randomSecret(),'transport-A','transport-B'),/mismatch/);
 await assert.rejects(verifyHello(hello,room,'transport-C','transport-B'),/mismatch/);
 const tampered=structuredClone(hello);tampered.nonce=randomSecret();
 await assert.rejects(verifyHello(tampered,room,'transport-A','transport-B'),/Invalid handshake signature/);
 const replacement=structuredClone(hello);replacement.publicKey=b.publicKey;
 await assert.rejects(verifyHello(replacement,room,'transport-A','transport-B'),/mismatch/);
});

test('authenticated, dual-approved peer can request and selectively receive evidence',async()=>{
 const a=await identity(),b=await identity(),room=randomSecret(),url='wss://test.invalid/signal';
 const ea=[],eb=[],pending=[];
 const ma=new CollectiveMesh({ident:a,room,url,onEvent:x=>ea.push(x)});
 const mb=new CollectiveMesh({ident:b,room,url,onEvent:x=>eb.push(x)});
 ma.me='session-A';mb.me='session-B';ma.addPeer('session-B');mb.addPeer('session-A');
 // Fake already established encrypted data channels; protocol security and consent remain real.
 ma.peers.get('session-B').channel={readyState:'open',send:raw=>pending.push(mb.onWire('session-A',raw))};
 mb.peers.get('session-A').channel={readyState:'open',send:raw=>pending.push(ma.onWire('session-B',raw))};
 await ma.onWire('session-B',JSON.stringify(await createHello(b,room,'session-B','session-A')));
 await mb.onWire('session-A',JSON.stringify(await createHello(a,room,'session-A','session-B')));
 assert.equal(ma.peers.get('session-B').approved,false);
 assert.throws(()=>ma.ask('A','C'),/Approve/);
 ma.approve('session-B');mb.approve('session-A');
 const local=await makeNode('local:'+a.id,a.id,'claim',statement('A','B','supports'));
 const bid=await makeNode('local:'+b.id,b.id,'claim',statement('B','C','supports'));
 const secret=await makeNode('local:'+b.id,b.id,'claim',statement('private','secret','supports'));
 let ae=await append([],'local:'+a.id,a.id,local);
 let be=await append([],'local:'+b.id,b.id,bid);be=await append(be,'local:'+b.id,b.id,secret);
 assert.equal((await answerPacket(ae,'local:'+a.id,'A','C')).result.status,'UNKNOWN_INSUFFICIENT_EVIDENCE');
 assert.equal(ma.ask('A','C'),1);
 await Promise.all(pending.splice(0));
 const inquiry=eb.find(e=>e.type==='inquiry');assert(inquiry);assert.equal(inquiry.from,'A');
 await mb.reply('session-A',inquiry.requestId,[bid.id],(await replay(be,'local:'+b.id)).nodes);
 await Promise.all(pending.splice(0));
 const evidence=ea.find(e=>e.type==='evidence');assert(evidence);assert.equal(evidence.claims.length,1);
 assert.equal(evidence.claims[0].statement.to,'C');
 assert.equal(JSON.stringify(evidence.bundle).includes('private'),false);
 const imported=await receive(ae,'local:'+a.id,a.id,evidence.bundle);ae=imported.events;
 assert.deepEqual((await answerPacket(ae,'local:'+a.id,'A','C')).result.path,['A','B','C']);
 const unsolicited={schema:NET_SCHEMA,kind:'bundle',id:randomSecret(),bundle:evidence.bundle};
 await assert.rejects(ma.onWire('session-B',JSON.stringify(unsolicited)),/Unsolicited/);
});

test('not approved peer cannot send a query or steal facts',async()=>{
 const a=await identity(),room=randomSecret(),mesh=new CollectiveMesh({ident:a,room,url:'wss://x.example/signal'});
 mesh.me='a';mesh.addPeer('b');
 mesh.peers.get('b').channel={readyState:'open',send:()=>{throw Error('should not share')}};
 assert.throws(()=>mesh.transmit('b',{kind:'ask',id:randomSecret(),from:'A',to:'B'}),/approval required/i);
 await assert.rejects(mesh.onWire('b',JSON.stringify({schema:NET_SCHEMA,kind:'ask',id:randomSecret(),from:'A',to:'B'})),/Unapproved/);
});
