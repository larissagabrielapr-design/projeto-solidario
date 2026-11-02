import fs from 'node:fs';
import {importBackup} from '../db/import-backup.mjs';
import {closePool} from '../db/pool.mjs';
if(fs.existsSync('.env')&&process.loadEnvFile)process.loadEnvFile('.env');
try{
 const filename=process.argv[2];if(!filename)throw new Error('Informe o caminho do arquivo de backup.');if(fs.statSync(filename).size>20*1024*1024)throw new Error('Arquivo acima do limite de 20 MiB.');
 const result=await importBackup(JSON.parse(fs.readFileSync(filename,'utf8')));
 console.log(result.alreadyImported?'Este backup já foi importado. Os dados atuais foram preservados.':`Importação concluída: ${result.families} famílias e ${result.accounts} contas. Senhas e permissões preservadas.`);
}catch(e){console.error(e.message?.startsWith('O banco')||e.message?.includes('backup')||e.message?.includes('Arquivo')||e.message?.startsWith('Informe')?e.message:'A importação falhou. Confira o arquivo e a conexão; nenhum dado parcial foi mantido.');process.exitCode=1}finally{await closePool()}
