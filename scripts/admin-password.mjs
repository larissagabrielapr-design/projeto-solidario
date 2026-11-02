import fs from 'node:fs';
import readline from 'node:readline';
import {Writable} from 'node:stream';
import {randomBytes,scrypt} from 'node:crypto';
import {getPool,closePool} from '../db/pool.mjs';
if(fs.existsSync('.env')&&process.loadEnvFile)process.loadEnvFile('.env');
async function askHidden(prompt){process.stdout.write(prompt);const output=new Writable({write(_chunk,_encoding,done){done()}});const rl=readline.createInterface({input:process.stdin,output,terminal:true});const answer=await new Promise(resolve=>rl.question('',value=>resolve(value)));rl.close();process.stdout.write('\n');return answer}
try{
 const email=String(process.argv[2]||'').trim().toLowerCase();if(!email)throw new Error('Informe o e-mail da administradora, sem a senha nos argumentos.');
 const pool=getPool();const stateRow=await pool.query('SELECT payload FROM project_state WHERE id=1');const state=JSON.parse(stateRow.rows[0]?.payload||'null');const member=state?.members.find(m=>m.email===email&&m.role==='admin'&&m.active);if(!member)throw new Error('Conta administrativa não encontrada.');
 const credential=await pool.query('SELECT id,version FROM auth_credentials WHERE email=$1 AND principal=$2',[email,member.userId]);if(!credential.rows.length)throw new Error('Conta administrativa não encontrada.');
 if(!process.stdin.isTTY)throw new Error('Execute em um terminal interativo para não expor a senha.');const password=await askHidden('Nova senha (mínimo 7 caracteres): ');const confirm=await askHidden('Confirme a nova senha: ');if(password!==confirm||password.length<7||password.length>128)throw new Error('As senhas precisam conferir e ter de 7 a 128 caracteres.');
 const salt=randomBytes(32).toString('base64url');const hash=await new Promise((resolve,reject)=>scrypt(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024},(e,key)=>e?reject(e):resolve(key.toString('hex'))));
 const client=await pool.connect();try{await client.query('BEGIN');const c=credential.rows[0];const result=await client.query('UPDATE auth_credentials SET password_hash=$1,salt=$2,version=version+1 WHERE id=$3 AND version=$4',[hash,salt,c.id,c.version]);if(result.rowCount!==1)throw new Error('Conta alterada durante a operação.');await client.query('DELETE FROM auth_sessions WHERE credential_id=$1',[c.id]);await client.query('COMMIT')}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()};console.log('Senha administrativa atualizada. Sessões anteriores encerradas.');
}catch(e){console.error(e.message);process.exitCode=1}finally{await closePool()}
