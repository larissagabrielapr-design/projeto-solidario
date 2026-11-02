import {env} from '../../../db/runtime';
import {approvedAdmin} from '../../lib/app-auth';
import {AppError,demand} from '../../lib/domain';
import {createBackup,validateBackup} from '../../lib/backup-format.mjs';
export const dynamic='force-dynamic';
export async function GET(){try{
 await approvedAdmin();demand(env.DB,'Banco de dados indisponível.',503);
 const projectState=await env.DB.prepare('SELECT id,revision,payload FROM project_state WHERE id=1').first();demand(projectState,'Não há dados para exportar.',404);
 const credentials=await env.DB.prepare('SELECT id,email,name,principal,password_hash,salt,version,blocked,created_at FROM auth_credentials').all();
 const backup=createBackup(projectState,credentials.results);validateBackup(backup);
 return new Response(JSON.stringify(backup),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="projeto-ibpv-solidario-backup-${new Date().toISOString().slice(0,10)}.json"`,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
}catch(e){const status=e instanceof AppError?e.status:500;return Response.json({error:e instanceof AppError?e.message:'Não foi possível exportar o backup. Verifique se a senha da administração já está configurada.'},{status,headers:{'Cache-Control':'no-store'}})}}
