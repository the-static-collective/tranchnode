import test from "node:test";
import assert from "node:assert/strict";
import {answerPacket, append, canonical, fingerprint, identity, makeBundle, makeNode,
        receive, replay, route, sha, statement, verifyBundle} from "../apps/collective/kernel.mjs";

async function setup() {
  const ident=await identity();
  const scope="local:"+ident.id;
  return {ident,scope,events:[]};
}
async function add(state,a,b,polarity="supports"){
  const node=await makeNode(state.scope,state.ident.id,"claim",statement(a,b,polarity));
  state.events=await append(state.events,state.scope,state.ident.id,node);
  return node.id;
}
async function exchange(receiver,sender,ids){
  const bundle=await makeBundle(sender.ident,(await replay(sender.events,sender.scope)).nodes,ids);
  const outcome=await receive(receiver.events,receiver.scope,receiver.ident.id,bundle);
  receiver.events=outcome.events;
  return {outcome,bundle};
}

test("independent keys and private scopes; explicit signed sources enable a path",async()=>{
  const a=await setup(),b=await setup(),c=await setup();
  assert.notEqual(a.ident.id,b.ident.id);
  assert.equal(a.ident.id,await fingerprint(a.ident.publicKey));
  await add(a,"A","B");
  const bid=await add(b,"B","C"),cid=await add(c,"C","D");
  const isolated=await answerPacket(a.events,a.scope,"A","D");
  assert.equal(isolated.result.status,"UNKNOWN_INSUFFICIENT_EVIDENCE");
  await exchange(a,b,[bid]);await exchange(a,c,[cid]);
  const answer=await answerPacket(a.events,a.scope,"A","D");
  assert.equal(answer.result.status,"PATH_SUPPORTED_BY_ASSERTIONS");
  assert.deepEqual(answer.result.path,["A","B","C","D"]);
  assert.equal(answer.result.evidenceIds.length,3);
  assert.equal(answer.sourceEvidence.length,3);
  assert.equal(answer.realWorldFactCertified,false);
  const imported=[...(await replay(a.events,a.scope)).nodes.values()].filter(n=>n.kind==="source");
  assert.equal(imported.length,2);
  assert(imported.every(n=>n.scopeId===a.scope && n.content.originalScope!==a.scope));
  assert(imported.every(n=>n.content.provenance==="signature-valid-key-not-human-verified"));
});

test("a selected share doesn't silently disclose other statements",async()=>{
  const a=await setup(),b=await setup();
  const allowed=await add(b,"B","C");
  await add(b,"private-1","private-2");
  const {bundle,outcome}=await exchange(a,b,[allowed]);
  assert.equal(bundle.payload.claims.length,1);
  assert.equal(outcome.accepted,1);
  assert.equal(bundle.payload.claims[0].statement.from,"B");
  assert.equal((await replay(a.events,a.scope)).nodes.size,1);
});

test("a signer cannot claim a foreign node as their own share",async()=>{
  const a=await setup(),b=await setup();
  const id=await add(b,"B","C");
  await exchange(a,b,[id]);
  const received=[...(await replay(a.events,a.scope)).nodes.keys()][0];
  await assert.rejects(makeBundle(a.ident,(await replay(a.events,a.scope)).nodes,[received]),/Only own claims/);
});

test("a single undisclosed edge remains unknown, not false",async()=>{
  const a=await setup(),b=await setup(),c=await setup();
  await add(a,"A","B");const mid=await add(b,"B","C");await add(c,"C","D");
  await exchange(a,b,[mid]);
  assert.equal((await answerPacket(a.events,a.scope,"A","D")).result.status,"UNKNOWN_INSUFFICIENT_EVIDENCE");
});

test("signed contradiction is kept as tension, not defeated by vote",async()=>{
  const a=await setup(),b=await setup(),c=await setup();
  await add(a,"A","B");
  const supports=await add(b,"B","C");
  const denies=await add(c,"B","C","denies");
  await exchange(a,b,[supports]);await exchange(a,c,[denies]);
  const answer=await answerPacket(a.events,a.scope,"A","C");
  assert.equal(answer.result.status,"HOLD_CONTRADICTION");
  assert.equal(answer.result.tensions.length,1);
  assert.equal(answer.result.tensions[0].supporting.length,1);
  assert.equal(answer.result.tensions[0].contesting.length,1);
});

test("tampering with a signed payload or substituting a public key fails",async()=>{
  const a=await setup(),b=await setup();
  const id=await add(b,"B","C");
  const bundle=await makeBundle(b.ident,(await replay(b.events,b.scope)).nodes,[id]);
  await verifyBundle(bundle);
  const tampered=structuredClone(bundle);
  tampered.payload.claims[0].statement.to="SECRET";
  await assert.rejects(verifyBundle(tampered),/Invalid signature/);
  const other=structuredClone(bundle);
  other.publicKey=a.ident.publicKey;
  await assert.rejects(verifyBundle(other),/Invalid packet metadata/);
});

test("duplicate packet import is idempotent and does not multiply ancestry",async()=>{
  const a=await setup(),b=await setup(),id=await add(b,"B","C");
  const {bundle}=await exchange(a,b,[id]);const count=a.events.length;
  const again=await receive(a.events,a.scope,a.ident.id,bundle);
  assert.equal(again.duplicate,true);assert.equal(again.accepted,0);
  assert.equal(again.events.length,count);
});

test("ledger re-entry catches tampering, broken sequence and wrong scopes",async()=>{
  const a=await setup();await add(a,"A","B");
  const tampered=structuredClone(a.events);
  tampered[0].operation.node.content.to="Z";
  await assert.rejects(replay(tampered,a.scope),/Tampered event/);
  await assert.rejects(replay(a.events,"other-scope"),/Invalid event or sequence/);
  const reordered=structuredClone(a.events);reordered[0].sequence=2;
  await assert.rejects(replay(reordered,a.scope),/Invalid event or sequence/);
});

test("canonical JSON rejects unsafe precision and deliberate JSON confusion",async()=>{
  assert.throws(()=>canonical({number:Number.MAX_SAFE_INTEGER+2}),/Invalid or unsafe/);
  assert.throws(()=>canonical({bad:undefined}),/Undefined/);
  assert.equal(await sha({a:1,b:2}),await sha({b:2,a:1}));
});

test("re-entry refuses a fully rehashed ledger containing forged signed content",async()=>{
  const a=await setup(),b=await setup();
  const id=await add(b,"B","C");
  await exchange(a,b,[id]);
  const forged=structuredClone(a.events);
  const n=forged[0].operation.node;
  n.content.envelope.payload.claims[0].statement.to="FALSE";
  const {id:discardNodeId,...nodeBody}=n;
  n.id=await sha(nodeBody);
  const {id:discardEventId,...eventBody}=forged[0];
  forged[0].id=await sha(eventBody);
  await replay(forged,a.scope);
  await assert.rejects(answerPacket(forged,a.scope,"B","C"),/Invalid signature/);
});

test("no supported conclusion does not fabricate a claim",async()=>{
  const a=await setup();
  await add(a,"A","B");
  const graph=(await replay(a.events,a.scope)).nodes;
  assert.equal(route(graph,"A","Z").status,"UNKNOWN_INSUFFICIENT_EVIDENCE");
  assert.equal(route(graph,"A","A").status,"TRIVIAL");
});
