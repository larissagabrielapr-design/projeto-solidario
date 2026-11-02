import pg from 'pg';
let pool;
export function getPool(){if(!process.env.DATABASE_URL)throw new Error('Configure DATABASE_URL na hospedagem.');return pool||=(new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000,allowExitOnIdle:true}))}
export async function closePool(){if(pool){await pool.end();pool=undefined}}
