import { scrypt, timingSafeEqual } from 'node:crypto';
import { AppError, demand } from './domain';
const encoder=new TextEncoder();
export const SCRYPT={N:32768,r:8,p:3,maxmem:64*1024*1024};
let queue:Promise<unknown>=Promise.resolve();
function derive(password:string,salt:string):Promise<Buffer>{
 // Serialize the memory-hard operations in each Worker isolate.
 const job=queue.then(()=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,SCRYPT,(e,key)=>e?reject(e):resolve(key))));
 queue=job.catch(()=>undefined);return job;
}
export function validatePassword(value:unknown):string{const password=String(value??'');demand(password.length>=7&&password.length<=128,'Use uma senha de pelo menos 7 caracteres.');return password}
export function normalizeEmail(value:unknown):string{const email=String(value??'').trim().toLowerCase();demand(email.length<=180&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'Informe um e-mail válido.');return email}
export function validateName(value:unknown):string{const name=String(value??'').trim();demand(name.length>=2&&name.length<=100,'Informe seu nome, de 2 a 100 caracteres.');return name}
export function randomToken(){const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);return Buffer.from(bytes).toString('base64url')}
export async function tokenHash(token:string){return Buffer.from(await crypto.subtle.digest('SHA-256',encoder.encode(token))).toString('hex')}
export async function hashPassword(password:string){validatePassword(password);const salt=randomToken();return {salt,passwordHash:(await derive(password,salt)).toString('hex')}}
export async function verifyPassword(password:string,salt:string,expected:string){if(password.length>128||!/^[a-f0-9]{128}$/.test(expected))return false;const computed=await derive(password,salt);const target=Buffer.from(expected,'hex');return computed.length===target.length&&timingSafeEqual(computed,target)}
export function requireSameOrigin(req:Request){
 const actual=req.headers.get('origin'),url=new URL(req.url),configured=process.env.PUBLIC_ORIGIN?.trim();
 if(configured){demand(actual===new URL(configured).origin,'Origem não autorizada.',403);return}
 const host=(req.headers.get('x-forwarded-host')||req.headers.get('host')||url.host).split(',')[0].trim();
 const protocol=(req.headers.get('x-forwarded-proto')||url.protocol.replace(':','')).split(',')[0].trim();
 demand(/^[a-z0-9.:[\]-]+(?::[0-9]+)?$/i.test(host)&&['http','https'].includes(protocol),'Origem não autorizada.',403);
 demand(actual===url.origin||actual===`${protocol}://${host}`,'Origem não autorizada.',403);
}
export async function readSmallJson(req:Request){
 demand(Number(req.headers.get('content-length')||0)<=8192,'Solicitação muito grande.',413);
 const reader=req.body?.getReader();demand(reader,'Solicitação vazia.');let size=0;const chunks:Uint8Array[]=[];
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();throw new AppError('Solicitação muito grande.',413)}chunks.push(value)}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 try{const data=JSON.parse(new TextDecoder().decode(bytes));demand(data&&typeof data==='object'&&!Array.isArray(data),'Solicitação inválida.');return data}catch(e){if(e instanceof AppError)throw e;throw new AppError('Solicitação inválida.')}
}
