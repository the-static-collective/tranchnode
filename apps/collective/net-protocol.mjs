/** Invitation-scoped identity handshake, not proof of human identity. */
import {canonical,fingerprint} from './kernel.mjs';
const encoder=new TextEncoder();
export const NET_SCHEMA='tranch.collective004.v1';
function base64url(array){let s='';for(const n of new Uint8Array(array))s+=String.fromCharCode(n);return btoa(s).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
function unbase64url(value){if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value))throw Error('Malformed signature');return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));}
export function randomSecret(){const b=new Uint8Array(32);crypto.getRandomValues(b);return base64url(b);}
export function validRoom(value){return typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value);}
export function validRelayURL(value){try{const u=new URL(value);return !u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/signal'&&(u.protocol==='wss:'||(u.protocol==='ws:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)));}catch{return false;}}
export async function createHello(ident,room,selfSession,targetSession){
 if(!validRoom(room)||!selfSession||!targetSession)throw Error('Invalid handshake binding');
 const body={schema:NET_SCHEMA,kind:'hello',issuer:ident.id,publicKey:ident.publicKey,room,session:selfSession,forSession:targetSession,nonce:randomSecret()};
 const raw=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},ident.privateKey,encoder.encode(canonical(body)));
 return {...body,signature:base64url(raw)};
}
export async function verifyHello(message,room,session,target){
 if(!message||typeof message!=='object')throw Error('Missing handshake');
 const {signature,...body}=message;
 if(body.schema!==NET_SCHEMA||body.kind!=='hello'||body.room!==room||body.session!==session||body.forSession!==target||!validRoom(room)||!validRoom(body.nonce)||body.issuer!==await fingerprint(body.publicKey))throw Error('Handshake room or identity mismatch');
 const key=await crypto.subtle.importKey('jwk',body.publicKey,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,unbase64url(signature),encoder.encode(canonical(body))))throw Error('Invalid handshake signature');
 return {issuer:body.issuer,publicKey:body.publicKey};
}
export function validateQuestion(from,to){if(typeof from!=='string'||typeof to!=='string'||!from.trim()||!to.trim()||from.length>90||to.length>90)throw Error('Question endpoints must be 1–90 characters');return {from:from.trim(),to:to.trim()};}
