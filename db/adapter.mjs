// Adapt the existing, parameterized database calls to PostgreSQL.
export function postgresSql(input){
 let sql=input.replace(/^\s*INSERT\s+OR\s+IGNORE\s+INTO\b/i,'INSERT INTO'),ignored=sql!==input;
 if(ignored)sql=sql.trim().replace(/;$/,'')+' ON CONFLICT DO NOTHING';
 let out='',quoted=null,index=0,lineComment=false,blockComment=false;
 for(let i=0;i<sql.length;i++){
  const ch=sql[i],next=sql[i+1];
  if(lineComment){out+=ch;if(ch==='\n')lineComment=false;continue}
  if(blockComment){out+=ch;if(ch==='*'&&next==='/'){out+=next;i++;blockComment=false}continue}
  if(quoted){out+=ch;if(ch===quoted){if(next===quoted){out+=next;i++}else quoted=null}continue}
  if(ch==='-'&&next==='-'){out+=ch+next;i++;lineComment=true;continue}
  if(ch==='/'&&next==='*'){out+=ch+next;i++;blockComment=true;continue}
  if(ch==="'"||ch==='"'){quoted=ch;out+=ch;continue}
  if(ch==='?'){out+='$'+(++index)}else out+=ch;
 }
 return {text:out,parameters:index};
}
export class Statement{
 constructor(database,sql,values=[]){this.database=database;this.sql=sql;this.values=values}
 bind(...values){return new Statement(this.database,this.sql,values)}
 async execute(client){const converted=postgresSql(this.sql);if(converted.parameters!==this.values.length)throw new Error('Parâmetros SQL inconsistentes.');const result=await (client||this.database.pool()).query(converted.text,this.values);return {results:result.rows,meta:{changes:result.rowCount||0}}}
 async first(){return (await this.execute()).results[0]||null}
 async all(){return this.execute()}
 async run(){return this.execute()}
}
export class PostgresDatabase{
 constructor(pool){this.pool=pool}
 prepare(sql){return new Statement(this,sql)}
 async batch(statements){if(!statements.length)return [];const client=await this.pool().connect();try{await client.query('BEGIN');const results=[];for(const statement of statements)results.push(await statement.execute(client));await client.query('COMMIT');return results}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}
}
