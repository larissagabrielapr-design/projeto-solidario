import { env, ensureAdmin } from '../../db/runtime';
import { headers } from 'next/headers';
import { getChatGPTUser, type ChatGPTUser } from '../chatgpt-auth';
import { demand, type State, type Member } from './domain';
import { randomToken, tokenHash } from './password-crypto';
export type AppIdentity=ChatGPTUser&{provider:'password'|'chatgpt';credentialId?:string};
export type Credential={id:string;email:string;name:string;principal:string;password_hash:string;salt:string;version:number;blocked:number;created_at:string};
export const COOKIE=process.env.NODE_ENV!=='production'?'solidario_session_dev':'__Host-solidario_session_v2';
const LEGACY_COOKIE=process.env.NODE_ENV!=='production'?null:'__Host-solidario_session';
export function getTokens(cookie:string|null){
 const parts=(cookie||'').split(';').map(v=>v.trim());const tokens:string[]=[];
 for(const name of [COOKIE,LEGACY_COOKIE].filter(Boolean))for(const part of parts){if(part.startsWith(name+'=')){const value=part.slice(name!.length+1);if(/^[\w-]{43}$/.test(value)&&!tokens.includes(value))tokens.push(value);if(tokens.length===4)return tokens}}
 return tokens;
}
export function getToken(cookie:string|null){return getTokens(cookie)[0]||null}
export function sessionCookie(token:string,remove=false){return `${COOKIE}=${remove?'':token}; Path=/; HttpOnly; Max-Age=${remove?0:28800}; ${process.env.NODE_ENV!=='production'?'SameSite=Lax':'SameSite=None; Secure; Partitioned'}`}
export function expiredSessionCookies(){return [sessionCookie('',true),...(LEGACY_COOKIE?[`${LEGACY_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`]:[])]}
export async function nativeIdentity(cookie:string|null):Promise<AppIdentity|null>{
 if(!env.DB)return null;
 for(const token of getTokens(cookie)){
 const row=await env.DB.prepare('SELECT c.id, c.email, c.name, c.principal FROM auth_sessions s JOIN auth_credentials c ON c.id=s.credential_id AND c.version=s.version WHERE s.token_hash=? AND s.expires_at>? AND c.blocked=0').bind(await tokenHash(token),Date.now()).first<{id:string;email:string;name:string;principal:string}>();
 if(row)return {userId:row.principal,email:row.email,displayName:row.name,fullName:row.name,provider:'password',credentialId:row.id};
 }
 return null;
}
export async function getApplicationUser():Promise<AppIdentity|null>{
 const h=await headers();const native=await nativeIdentity(h.get('cookie'));if(native)return native;
 const platform=await getChatGPTUser();if(!platform)return null;
 // Keep the original access until its owner configures a password. After that,
 // an expired or logged-out password session must return to the login screen.
 const configured=await env.DB?.prepare('SELECT id FROM auth_credentials WHERE principal=?').bind(platform.userId).first();
 return configured?null:{...platform,provider:'chatgpt'};
}
export async function loadProject():Promise<State|null>{await ensureAdmin();demand(env.DB,'Banco de dados indisponível.',503);const row=await env.DB.prepare('SELECT payload FROM project_state WHERE id=1').first<{payload:string}>();return row?JSON.parse(row.payload):null}
export function findMember(s:State|null,identity:AppIdentity):Member|undefined{return s?.members.find(m=>m.userId===identity.userId)||(identity.provider==='chatgpt'?s?.members.find(m=>!m.userId&&m.email===identity.email.toLowerCase()):undefined)}
export async function approvedAdmin(){const identity=await getApplicationUser();demand(identity,'Entre para continuar.',401);const member=findMember(await loadProject(),identity);demand(member?.active&&member.role==='admin','Acesso exclusivo da administração principal.',403);return {identity,member}}
export async function createSession(c:Pick<Credential,'id'|'version'>){demand(env.DB,'Banco de dados indisponível.',503);const token=randomToken();await env.DB.prepare('INSERT INTO auth_sessions (token_hash,credential_id,version,expires_at) VALUES (?,?,?,?)').bind(await tokenHash(token),c.id,c.version,Date.now()+8*60*60*1000).run();return token}
export async function registrationList(s:State){demand(env.DB,'Banco de dados indisponível.',503);const r=await env.DB.prepare('SELECT id,email,name,principal,blocked,created_at FROM auth_credentials WHERE blocked=0 ORDER BY created_at DESC').all<Pick<Credential,'id'|'email'|'name'|'principal'|'blocked'|'created_at'>>();return r.results.filter(c=>!s.members.some(m=>m.userId===c.principal)).map(c=>({id:c.id,email:c.email,name:c.name,userId:c.principal,createdAt:c.created_at}))}
