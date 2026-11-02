import { env } from '../../../db/runtime';
import { findMember, getApplicationUser, registrationList } from '../../lib/app-auth';
import { readSmallJson, requireSameOrigin } from '../../lib/password-crypto';
import { AppError, demand, mutate, startState, visibleState, type State, type Role } from '../../lib/domain';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function run(req:Request,write:boolean){
 try{
  const identity=await getApplicationUser();demand(identity,'Entre com sua conta para continuar.',401);
  const db=env.DB;demand(db,'O banco de dados está indisponível.',503);
  let input:any=null;
  if(write){requireSameOrigin(req);input=await readSmallJson(req)}
  const previewRaw=new URL(req.url).searchParams.get('profile');
  for(let attempt=0;attempt<6;attempt++){
   let row=await db.prepare('SELECT revision, payload FROM project_state WHERE id = 1').first<{revision:number;payload:string}>();
   if(!row){demand(identity.provider==='chatgpt'&&env.PROJECT_OWNER_EMAIL&&identity.email.toLowerCase()===env.PROJECT_OWNER_EMAIL.toLowerCase(),'A administradora precisa iniciar o projeto antes dos demais acessos.',403);await db.prepare('INSERT OR IGNORE INTO project_state (id, revision, payload) VALUES (1, 0, ?)').bind(JSON.stringify(startState(identity))).run();continue}
   const s:State=JSON.parse(row.payload);
   const actor=findMember(s,identity);
   demand(actor&&actor.active,'Sua conta não está autorizada ou foi desativada. Procure a administração do projeto.',403);
   const bindIdentity=!actor.userId;if(bindIdentity)actor.userId=identity.userId;
   const role:Role=actor.role==='admin'&&(previewRaw==='common'||previewRaw==='finance')?previewRaw:actor.role;
   if(write){
    let payload=input.payload||{};
    if(input.action==='registration.approve'){
     demand(role==='admin','Somente o administrador principal pode aprovar cadastros.',403);
     const c=await db.prepare('SELECT id,email,name,principal FROM auth_credentials WHERE id=? AND blocked=0').bind(String(payload.id||'')).first<{id:string;email:string;name:string;principal:string}>();
     demand(c,'Cadastro não encontrado ou recusado.',404);
     payload={role:payload.role,registration:{email:c.email,name:c.name,userId:c.principal}};
    }
    mutate(s,actor,role,String(input.action),payload);
   }
   if(write||bindIdentity){const result=await db.prepare('UPDATE project_state SET payload = ?, revision = revision + 1 WHERE id = 1 AND revision = ?').bind(JSON.stringify(s),row.revision).run();if(!result.meta.changes)continue}
   const result=visibleState(s,actor,role);
   if(role==='admin'){
    const registrations=await registrationList(s);
    const c=await db.prepare('SELECT id,principal FROM auth_credentials WHERE blocked=0').all<{id:string;principal:string}>();
    return json({...result,registrations,members:result.members.map(m=>({...m,credentialId:c.results.find(c=>c.principal===m.userId)?.id}))});
   }
   return json({...result,registrations:[]});
  }
  throw new AppError('Outro registro está sendo atualizado. Tente novamente.',409);
 }catch(e){if(e instanceof AppError)return json({error:e.message},e.status);console.error('project-api',e);return json({error:'Não foi possível concluir. Tente novamente.'},500)}
}
export async function GET(req:Request){return run(req,false)}
export async function POST(req:Request){return run(req,true)}
