import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { PostgresDatabase } from './adapter.mjs';
async function database(): Promise<PostgresDatabase> {
 if(process.env.NODE_ENV==='development')return (await import('./local.mjs')).localDatabase;
 return (getCloudflareContext().env as unknown as {DB:PostgresDatabase}).DB;
}
class Statement {
 constructor(public sql:string,public values:unknown[]=[]){}
 bind(...values:unknown[]){return new Statement(this.sql,values)}
 async resolve(){return (await database()).prepare(this.sql).bind(...this.values)}
 async first<T>(){return (await this.resolve()).first<T>()}
 async all<T>(){return (await this.resolve()).all<T>()}
 async run(){return (await this.resolve()).run()}
}
const DB={prepare:(sql:string)=>new Statement(sql),async batch(statements:Statement[]){return (await database()).batch(await Promise.all(statements.map(s=>s.resolve())))}} as unknown as PostgresDatabase;
export const env={DB,PROJECT_OWNER_EMAIL:undefined as string|undefined};
export async function ensureAdmin(){
 if(process.env.NODE_ENV==='development')return;
 const vars=getCloudflareContext().env as unknown as {ADMIN_EMAIL?:string;ADMIN_PASS?:string};
 if(vars.ADMIN_EMAIL&&vars.ADMIN_PASS){const {bootstrapAdmin}=await import('./bootstrap-admin');await bootstrapAdmin(DB,vars)}
}
