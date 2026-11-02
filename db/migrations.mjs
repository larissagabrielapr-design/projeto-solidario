import {createHash} from 'node:crypto';
import {getPool} from './pool.mjs';
export const migrations=[{version:'0001_initial',sql:`
CREATE TABLE project_state(id INTEGER PRIMARY KEY,revision INTEGER NOT NULL DEFAULT 0,payload TEXT NOT NULL);
CREATE TABLE auth_credentials(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,principal TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,salt TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,blocked INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
CREATE TABLE auth_sessions(token_hash TEXT PRIMARY KEY,credential_id TEXT NOT NULL,version INTEGER NOT NULL,expires_at BIGINT NOT NULL);
CREATE INDEX auth_sessions_credential ON auth_sessions(credential_id);
CREATE INDEX auth_sessions_expiry ON auth_sessions(expires_at);
CREATE TABLE auth_limits(key TEXT PRIMARY KEY,hits INTEGER NOT NULL DEFAULT 1,expires_at BIGINT NOT NULL);
CREATE TABLE auth_reset_tokens(token_hash TEXT PRIMARY KEY,credential_id TEXT NOT NULL,expires_at BIGINT NOT NULL,claim TEXT);
CREATE TABLE migration_imports(checksum TEXT PRIMARY KEY,imported_at TEXT NOT NULL);
`}];
export async function migrate(pool=getPool()){
 const client=await pool.connect();try{
  await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(826314217)');
  await client.query('CREATE TABLE IF NOT EXISTS application_migrations(version TEXT PRIMARY KEY,checksum TEXT NOT NULL,applied_at TEXT NOT NULL)');
  for(const migration of migrations){const checksum=createHash('sha256').update(migration.sql).digest('hex');const found=await client.query('SELECT checksum FROM application_migrations WHERE version=$1',[migration.version]);if(found.rows.length){if(found.rows[0].checksum!==checksum)throw new Error('Uma migração aplicada foi alterada.');continue}await client.query(migration.sql);await client.query('INSERT INTO application_migrations(version,checksum,applied_at) VALUES($1,$2,$3)',[migration.version,checksum,new Date().toISOString()])}
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}
