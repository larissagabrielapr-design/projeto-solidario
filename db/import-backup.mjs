import {validateBackup} from '../app/lib/backup-format.mjs';
import {migrate} from './migrations.mjs';
import {getPool} from './pool.mjs';
export async function importBackup(raw,pool=getPool()){
 const backup=validateBackup(raw);await migrate(pool);const client=await pool.connect();
 try{
  await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(826314218)');
  const prior=await client.query('SELECT checksum FROM migration_imports WHERE checksum=$1',[backup.checksum]);
  if(prior.rows.length){await client.query('COMMIT');return {alreadyImported:true}}
  const existing=await client.query('SELECT (SELECT count(*) FROM project_state)+(SELECT count(*) FROM auth_credentials) AS total');if(Number(existing.rows[0].total)!==0)throw new Error('O banco já contém dados. A importação só pode ocorrer em um banco vazio.');
  const row=backup.projectState;await client.query('INSERT INTO project_state(id,revision,payload) VALUES($1,$2,$3)',[row.id,row.revision,row.payload]);
  for(const c of backup.credentials)await client.query('INSERT INTO auth_credentials(id,email,name,principal,password_hash,salt,version,blocked,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[c.id,c.email,c.name,c.principal,c.password_hash,c.salt,c.version,c.blocked,c.created_at]);
  await client.query('INSERT INTO migration_imports(checksum,imported_at) VALUES($1,$2)',[backup.checksum,new Date().toISOString()]);await client.query('COMMIT');
  return {alreadyImported:false,families:backup.state.families.length,accounts:backup.credentials.length};
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}
