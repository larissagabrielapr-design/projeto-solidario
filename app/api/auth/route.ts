import { env } from '../../../db/runtime';
import { getChatGPTUser } from '../../chatgpt-auth';
import { AppError,demand } from '../../lib/domain';
import { approvedAdmin,createSession,expiredSessionCookies,findMember,getApplicationUser,getTokens,loadProject,nativeIdentity,sessionCookie,type Credential } from '../../lib/app-auth';
import { hashPassword,normalizeEmail,randomToken,readSmallJson,requireSameOrigin,tokenHash,validateName,validatePassword,verifyPassword } from '../../lib/password-crypto';
export const dynamic='force-dynamic';
const json=(value:unknown,status=200,cookie?:string|string[])=>{const headers=new Headers({'Cache-Control':'no-store','Referrer-Policy':'no-referrer','Vary':'Cookie'});for(const c of cookie?(Array.isArray(cookie)?cookie:[cookie]):[])headers.append('Set-Cookie',c);return Response.json(value,{status,headers})};
export async function GET(req:Request){try{const user=await nativeIdentity(req.headers.get('cookie'));const member=user?findMember(await loadProject(),user):null;return json({authenticated:!!user,pending:!!user&&!member,authorized:!!member?.active})}catch{return json({error:'Não foi possível verificar a sessão.'},503)}}
async function limit(req:Request,action:string,email=''){
 const db=env.DB!;const time=Date.now();const span=15*60*1000;const window=Math.floor(time/span);const ip=req.headers.get('cf-connecting-ip')||'unknown';
 const keys=[{name:await tokenHash(`ip:${ip}:${action}:${window}`),max:action==='register'?10:40}];if(email)keys.push({name:await tokenHash(`email:${email}:${action}:${window}`),max:action==='login'?8:5});
 for(const key of keys){const r=await db.prepare('INSERT INTO auth_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=auth_limits.hits+1 RETURNING hits').bind(key.name,(window+1)*span).first<{hits:number}>();demand(r&&r.hits<=key.max,'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',429)}
 await db.batch([db.prepare('DELETE FROM auth_limits WHERE expires_at<?').bind(time),db.prepare('DELETE FROM auth_sessions WHERE expires_at<?').bind(time),db.prepare('DELETE FROM auth_reset_tokens WHERE expires_at<?').bind(time)]);
}
export async function POST(req:Request){try{
 requireSameOrigin(req);demand(env.DB,'Banco de dados indisponível.',503);const db=env.DB;const p=await readSmallJson(req);const action=String(p.action||'');
 if(action==='logout'){const tokens=getTokens(req.headers.get('cookie'));if(tokens.length)await db.batch(await Promise.all(tokens.map(async token=>db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await tokenHash(token)))));return json({ok:true},200,expiredSessionCookies())}
 if(action==='login'){
  const email=String(p.email??'').trim().toLowerCase(),password=String(p.password??'');await limit(req,action,email);
  const c=await db.prepare('SELECT * FROM auth_credentials WHERE email=?').bind(email).first<Credential>();
  if(!c?.principal.startsWith('env-password:'))normalizeEmail(p.email);
  // Derive a dummy hash for missing accounts to avoid a fast account-existence check.
  const salt=c?.salt||'solidario-nonexistent-account-salt';const expected=c?.password_hash||'0'.repeat(128);
  const valid=await verifyPassword(password,salt,expected,c?.principal.startsWith('env-password:'));demand(c&&valid&&!c.blocked,'E-mail ou senha incorretos.',401);
  const s=await loadProject(),member=s?.members.find(m=>m.userId===c.principal);demand(!member||member.active,'Seu acesso está desativado. Procure a administração.',403);
  const token=await createSession(c);return json({ok:true,pending:!member},200,sessionCookie(token));
 }
 if(action==='register'){
  const email=normalizeEmail(p.email),name=validateName(p.name),password=validatePassword(p.password);await limit(req,action,email);
  const s=await loadProject();demand(s,'A administração precisa iniciar o projeto antes dos cadastros.',503);
  demand(!s.members.some(m=>m.userId&&m.email===email),'Este e-mail já tem um acesso autorizado. Use a configuração de senha da sua conta existente.',409);
  const existing=await db.prepare('SELECT id FROM auth_credentials WHERE email=?').bind(email).first();demand(!existing,'Este e-mail já possui cadastro. Entre na conta ou peça uma redefinição de senha.',409);
  const hashed=await hashPassword(password);const id=crypto.randomUUID();
  try{await db.prepare('INSERT INTO auth_credentials (id,email,name,principal,password_hash,salt,version,blocked,created_at) VALUES (?,?,?,?,?,?,1,0,?)').bind(id,email,name,'password:'+id,hashed.passwordHash,hashed.salt,new Date().toISOString()).run()}catch(e){if(String(e).includes('UNIQUE'))throw new AppError('Este e-mail já possui cadastro.',409);throw e}
  const token=await createSession({id,version:1});return json({ok:true,pending:true,message:'Cadastro realizado! Aguarde a autorização do administrador para acessar o sistema.'},201,sessionCookie(token));
 }
 if(action==='setup-password'){
  const platform=await getChatGPTUser();demand(platform,'Use o acesso atual da sua conta para definir a primeira senha.',401);
  const s=await loadProject();const member=s?.members.find(m=>m.userId===platform.userId&&m.email===platform.email.toLowerCase());
  demand(member?.active,'Sua conta precisa estar autorizada antes de definir a senha.',403);
  await limit(req,action,platform.email);const password=validatePassword(p.password),hashed=await hashPassword(password);
  const old=await db.prepare('SELECT * FROM auth_credentials WHERE email=?').bind(platform.email.toLowerCase()).first<Credential>();
  demand(!old||old.principal===member.userId,'Este cadastro precisa ser verificado pela administração.',409);
  const id=old?.id||crypto.randomUUID(),version=(old?.version||0)+1;
  const changed=await db.batch([db.prepare('INSERT INTO auth_credentials (id,email,name,principal,password_hash,salt,version,blocked,created_at) VALUES (?,?,?,?,?,?,?,0,?) ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash,salt=excluded.salt,version=auth_credentials.version+1 RETURNING id,version').bind(id,member.email,member.name,member.userId,hashed.passwordHash,hashed.salt,version,new Date().toISOString()),db.prepare('DELETE FROM auth_sessions WHERE credential_id=(SELECT id FROM auth_credentials WHERE email=?)').bind(member.email)]);
  const saved=changed[0].results[0] as {id:string;version:number};
  const token=await createSession(saved);return json({ok:true,pending:false},200,sessionCookie(token));
 }
 if(action==='change-password'){
  const user=await getApplicationUser();demand(user?.provider==='password'&&user.credentialId,'Entre com e-mail e senha para alterar sua senha.',401);await limit(req,action,user.email);
  const c=await db.prepare('SELECT * FROM auth_credentials WHERE id=? AND blocked=0').bind(user.credentialId).first<Credential>();demand(c,'Conta indisponível.',403);
  demand(await verifyPassword(String(p.currentPassword||''),c.salt,c.password_hash),'Senha atual incorreta.',401);
  const hashed=await hashPassword(validatePassword(p.password));const result=await db.prepare('UPDATE auth_credentials SET password_hash=?,salt=?,version=version+1 WHERE id=? AND version=?').bind(hashed.passwordHash,hashed.salt,c.id,c.version).run();demand(result.meta.changes,'A conta foi alterada. Entre novamente.',409);
  await db.prepare('DELETE FROM auth_sessions WHERE credential_id=?').bind(c.id).run();const token=await createSession({id:c.id,version:c.version+1});return json({ok:true},200,sessionCookie(token));
 }
 if(action==='reset-link'){
  await approvedAdmin();await limit(req,action);const c=await db.prepare('SELECT * FROM auth_credentials WHERE id=? AND blocked=0').bind(String(p.id||'')).first<Credential>();demand(c,'Conta não encontrada.',404);
  const token=randomToken();await db.batch([db.prepare('DELETE FROM auth_reset_tokens WHERE credential_id=?').bind(c.id),db.prepare('INSERT INTO auth_reset_tokens (token_hash,credential_id,expires_at,claim) VALUES (?,?,?,NULL)').bind(await tokenHash(token),c.id,Date.now()+15*60*1000)]);
  return json({ok:true,path:'/acesso?redefinir='+encodeURIComponent(token),email:c.email});
 }
 if(action==='reset-password'){
  await limit(req,action);const token=String(p.token||'');demand(/^[\w-]{43}$/.test(token),'Link inválido ou expirado.',400);const hash=await tokenHash(token);
  const c=await db.prepare('SELECT c.* FROM auth_reset_tokens r JOIN auth_credentials c ON c.id=r.credential_id WHERE r.token_hash=? AND r.claim IS NULL AND r.expires_at>? AND c.blocked=0').bind(hash,Date.now()).first<Credential>();demand(c,'Link inválido, expirado ou já utilizado. Peça um novo à administração.',400);
  const hashed=await hashPassword(validatePassword(p.password)),claim=crypto.randomUUID();
  const results=await db.batch([db.prepare('UPDATE auth_reset_tokens SET claim=? WHERE token_hash=? AND claim IS NULL AND expires_at>?').bind(claim,hash,Date.now()),db.prepare('UPDATE auth_credentials SET password_hash=?,salt=?,version=version+1 WHERE id=? AND version=? AND EXISTS(SELECT 1 FROM auth_reset_tokens WHERE token_hash=? AND claim=?)').bind(hashed.passwordHash,hashed.salt,c.id,c.version,hash,claim),db.prepare('DELETE FROM auth_sessions WHERE credential_id=? AND EXISTS(SELECT 1 FROM auth_reset_tokens WHERE token_hash=? AND claim=?)').bind(c.id,hash,claim)]);
  demand(results[0].meta.changes&&results[1].meta.changes,'Link já utilizado ou conta alterada. Peça um novo link à administração.',409);return json({ok:true},200,expiredSessionCookies());
 }
 if(action==='reject-registration'){
  const {member}=await approvedAdmin();await limit(req,action);const c=await db.prepare('SELECT id,principal FROM auth_credentials WHERE id=?').bind(String(p.id||'')).first<{id:string;principal:string}>();demand(c,'Cadastro não encontrado.',404);
  const s=await loadProject();demand(!s?.members.some(m=>m.userId===c.principal),'Para uma conta aprovada, use Editar acesso e desative-a.');demand(c.principal!==member.userId,'Sua própria conta não pode ser bloqueada.');
  await db.batch([db.prepare('UPDATE auth_credentials SET blocked=1,version=version+1 WHERE id=?').bind(c.id),db.prepare('DELETE FROM auth_sessions WHERE credential_id=?').bind(c.id)]);return json({ok:true});
 }
 throw new AppError('Operação desconhecida.',404);
 }catch(e){if(e instanceof AppError)return json({error:e.message},e.status);console.error('auth-api-failure');return json({error:'Não foi possível concluir. Tente novamente.'},500)}}
