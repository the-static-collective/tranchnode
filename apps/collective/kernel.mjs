/**
 * COLLECTIVE-003 — browser-native, offline-first TranchNode-compatible subset.
 * Research prototype: NOT the full canonical TranchNode kernel.
 * Uses WebCrypto P-256 for holder-key provenance; no claim of verified human identity.
 */
export const SCHEMA = "motif.collective003.bundle.v1";
export const NODE_TYPES = new Set(["source","observation","claim","inference","proposal","tension","witness","harvest"]);

export function canonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value) && Number.isSafeInteger(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const keys = Object.keys(value).sort();
    if (keys.some(k => value[k] === undefined)) throw new Error("Undefined data");
    return "{" + keys.map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
  }
  throw new Error("Invalid or unsafe JSON value");
}
function bytes(s) { return new TextEncoder().encode(s); }
function hex(buf) { return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join(""); }
function b64(buf) {
  let s = ""; for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function unb64(s) {
  if (typeof s !== "string" || !/^[A-Za-z0-9_-]+$/.test(s)) throw new Error("Malformed signature");
  const raw = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4-s.length%4)%4));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
export async function sha(data) { return "sha256:" + hex(await crypto.subtle.digest("SHA-256", bytes(typeof data === "string" ? data : canonical(data)))); }
export async function identity() {
  const pair = await crypto.subtle.generateKey({name:"ECDSA", namedCurve:"P-256"}, false, ["sign","verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const id = "node:" + (await sha({kty:jwk.kty,crv:jwk.crv,x:jwk.x,y:jwk.y})).slice(7);
  return {id, publicKey:jwk, privateKey:pair.privateKey};
}
export async function fingerprint(jwk) {
  if (!jwk || jwk.kty !== "EC" || jwk.crv !== "P-256" || typeof jwk.x !== "string" || typeof jwk.y !== "string")
    throw new Error("Unsupported public key");
  return "node:" + (await sha({kty:jwk.kty,crv:jwk.crv,x:jwk.x,y:jwk.y})).slice(7);
}
export function statement(from, to, polarity) {
  const ok = v => typeof v === "string" && v.length > 0 && v.length <= 90 && !/[\u0000-\u001f]/.test(v);
  if (!ok(from) || !ok(to) || !["supports","denies"].includes(polarity))
    throw new Error("Edges need short nonempty labels and supports/denies");
  if (from === to) throw new Error("Use two different graph positions");
  return {from, to, polarity};
}
export async function makeNode(scopeId, authorId, kind, content, time = new Date().toISOString()) {
  if (!NODE_TYPES.has(kind) || !scopeId || !authorId) throw new Error("Invalid node metadata");
  const body = {kind, content, scopeId, authorId, createdAt:time, epistemicState:kind === "inference" ? "inferred":"asserted"};
  return {id:await sha(body), ...body};
}
export async function append(events, scopeId, actorId, node) {
  if (node.scopeId !== scopeId || node.authorId !== actorId) throw new Error("Out-of-scope operation");
  const prior = await replay(events,scopeId);
  if (prior.nodes.has(node.id)) throw new Error("Existing immutable node");
  const body = {scopeId, sequence:events.length+1, previousEventId:events.length ? events[events.length-1].id:null,
      actorId, acceptedAt:new Date().toISOString(), operation:{type:"create_node",node}};
  const event = {id:await sha(body), ...body};
  return [...events,event];
}
export async function replay(events, scopeId) {
  if (!Array.isArray(events) || events.length > 20000) throw new Error("Invalid or excessive ledger");
  const nodes = new Map();
  let previous = null;
  for (let i=0; i<events.length; i++) {
    const e=events[i];
    if (!e || e.scopeId!==scopeId || e.sequence!==i+1 || e.previousEventId!==previous
      || !(e.acceptedAt && !Number.isNaN(Date.parse(e.acceptedAt)))
      || !e.operation || e.operation.type!=="create_node") throw new Error("Invalid event or sequence");
    const {id,...body}=e;
    if (id!==await sha(body)) throw new Error("Tampered event");
    const n=e.operation.node;
    if (!n || !NODE_TYPES.has(n.kind) || n.scopeId!==scopeId || n.authorId!==e.actorId
        || !n.createdAt || !n.epistemicState) throw new Error("Invalid node or crossed scope");
    const {id:nodeId,...nodeBody}=n;
    if (nodeId!==await sha(nodeBody) || nodes.has(nodeId)) throw new Error("Node identity collision or alteration");
    nodes.set(nodeId,n); previous=id;
  }
  return {nodes, head:previous};
}
export async function makeBundle(ident, localNodes, allowedIds) {
  if (!ident?.privateKey || !ident?.publicKey || ident.id!==await fingerprint(ident.publicKey))
    throw new Error("Local identity invalid");
  const claims = [];
  for (const id of allowedIds) {
    const n=localNodes.get(id);
    if (!n || n.kind!=="claim" || n.authorId!==ident.id) throw new Error("Only own claims may be exported");
    claims.push({sourceNodeId:n.id, statement:statement(n.content.from,n.content.to,n.content.polarity)});
  }
  if (!claims.length || claims.length>32) throw new Error("Select 1–32 own claims");
  const payload={schema:SCHEMA, issuer:ident.id, originScope:"local:"+ident.id,
    createdAt:new Date().toISOString(), disclosure:"any-holder-of-file", claims};
  const signature=b64(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},ident.privateKey,bytes(canonical(payload))));
  return {payload, publicKey:ident.publicKey, signature};
}
export async function verifyBundle(bundle) {
  if (!bundle || !bundle.payload || !bundle.publicKey || !bundle.signature) throw new Error("Incomplete packet");
  if (canonical(bundle).length>65536) throw new Error("Packet exceeds 64 KB");
  const p=bundle.payload;
  if (p.schema!==SCHEMA || p.issuer!==await fingerprint(bundle.publicKey)
       || p.originScope!=="local:"+p.issuer || p.disclosure!=="any-holder-of-file"
       || !Array.isArray(p.claims) || p.claims.length<1 || p.claims.length>32
       || typeof p.createdAt!=="string" || Number.isNaN(Date.parse(p.createdAt))) throw new Error("Invalid packet metadata");
  const ids=new Set();
  for (const c of p.claims) {
    if (!c || typeof c.sourceNodeId!=="string" || !c.sourceNodeId.startsWith("sha256:") || ids.has(c.sourceNodeId)) throw new Error("Bad or duplicate source ID");
    if (canonical(statement(c.statement?.from,c.statement?.to,c.statement?.polarity))!==canonical(c.statement)) throw new Error("Bad statement");
    ids.add(c.sourceNodeId);
  }
  const key=await crypto.subtle.importKey("jwk",bundle.publicKey,{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
  const valid=await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},key,unb64(bundle.signature),bytes(canonical(p)));
  if (!valid) throw new Error("Invalid signature");
  return {issuer:p.issuer, packetId:await sha(bundle), claims:p.claims, issuedAt:p.createdAt};
}
export async function receive(events, scopeId, actorId, bundle) {
  const received=await verifyBundle(bundle);
  let next=events;
  const prior=await replay(next,scopeId);
  if ([...prior.nodes.values()].some(n=>n.kind==="source" && n.content.packetId===received.packetId))
    return {events:next,accepted:0,duplicate:true};
  for (const claim of received.claims) {
    const node=await makeNode(scopeId,actorId,"source",{
      packetId:received.packetId, originIssuer:received.issuer, originalNodeId:claim.sourceNodeId,
      originalScope:bundle.payload.originScope, statement:claim.statement,
      envelope:bundle, provenance:"signature-valid-key-not-human-verified"
    });
    next=await append(next,scopeId,actorId,node);
  }
  return {events:next,accepted:received.claims.length,duplicate:false};
}
/** Inference is based on people's *assertions*, not on established world facts. */
export function route(nodes,start,goal) {
  if (!start || !goal) throw new Error("Enter start and destination");
  if (start===goal) return {status:"TRIVIAL",path:[start],evidenceIds:[],tensions:[]};
  const sides=new Map();
  for (const n of nodes.values()) {
    const s=n.kind==="claim" ? n.content : n.kind==="source" ? n.content.statement : null;
    if (!s) continue;
    const k=JSON.stringify([s.from,s.to]);
    if (!sides.has(k)) sides.set(k,{a:s.from,b:s.to,supports:[],denies:[]});
    sides.get(k)[s.polarity].push(n.id);
  }
  const tensions=[...sides.values()].filter(x=>x.supports.length && x.denies.length)
    .map(x=>({from:x.a,to:x.b,supporting:x.supports,contesting:x.denies}));
  if (tensions.length) return {status:"HOLD_CONTRADICTION",path:[],evidenceIds:[],tensions};
  const adjacency=new Map();
  for (const x of sides.values()) if (x.supports.length) {
    if (!adjacency.has(x.a)) adjacency.set(x.a,[]);
    adjacency.get(x.a).push([x.b,x.supports.slice().sort()[0]]);
  }
  const queue=[[start,[start],[]]],visited=new Set([start]);
  for (let i=0;i<queue.length;i++) {
    const [at,path,evidence]=queue[i];
    for (const [next,id] of (adjacency.get(at)||[]).sort((a,b)=>a[0].localeCompare(b[0]))) {
      if (visited.has(next)) continue;
      const p=[...path,next],ev=[...evidence,id];
      if (next===goal) return {status:"PATH_SUPPORTED_BY_ASSERTIONS",path:p,evidenceIds:ev,tensions:[]};
      visited.add(next);queue.push([next,p,ev]);
    }
  }
  return {status:"UNKNOWN_INSUFFICIENT_EVIDENCE",path:[],evidenceIds:[],tensions:[]};
}
export async function answerPacket(events,scopeId,start,goal) {
  const {nodes,head}=await replay(events,scopeId);
  const result=route(nodes,start,goal);
  const evidence=result.evidenceIds.map(id=>nodes.get(id));
  return {schema:"motif.collective003.answer.v1", question:{start,goal},result,
    sourceEvidence:evidence, ledgerHead:head, localScope:scopeId,
    verification:"replayed-local-hashes-and-import-signatures-at-admission",
    realWorldFactCertified:false, automaticallyAdopted:false};
}
