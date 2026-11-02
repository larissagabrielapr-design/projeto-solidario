export type Result<T=Record<string,unknown>>={results:T[];meta:{changes:number}};
export function postgresSql(input:string):{text:string;parameters:number};
export class Statement{
 constructor(database:PostgresDatabase,sql:string,values?:unknown[]);
 bind(...values:unknown[]):Statement;
 execute(client?:unknown):Promise<Result>;
 first<T=Record<string,unknown>>():Promise<T|null>;
 all<T=Record<string,unknown>>():Promise<Result<T>>;
 run():Promise<Result>;
}
export class PostgresDatabase{
 constructor(pool:()=>unknown);
 prepare(sql:string):Statement;
 batch(statements:Statement[]):Promise<Result[]>;
}
