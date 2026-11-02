import { writeFile, readFile, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
// Production receives secrets from Cloudflare bindings, never from local .env files.
const file = '.open-next/cloudflare/next-env.mjs';
await readFile(file);
await writeFile(file, 'export const production = {};\nexport const development = {};\nexport const test = {};\n');
async function clean(dir) {
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const target=path.join(dir,entry.name);
  if(entry.isDirectory())await clean(target);
  else if(entry.name==='.env'||entry.name.startsWith('.env.'))await unlink(target);
 }
}
await clean('.open-next');
console.log('Worker preparado sem variáveis dos arquivos .env locais.');
