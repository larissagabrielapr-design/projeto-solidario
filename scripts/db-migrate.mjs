import fs from 'node:fs';
import {migrate} from '../db/migrations.mjs';
import {closePool} from '../db/pool.mjs';
if(fs.existsSync('.env')&&process.loadEnvFile)process.loadEnvFile('.env');
try{await migrate();console.log('Estrutura do banco pronta.')}catch(e){console.error('Não foi possível preparar o banco. Confira DATABASE_URL e a conexão com a hospedagem.');process.exitCode=1}finally{await closePool()}
