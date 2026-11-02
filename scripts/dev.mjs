import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
console.log(`
  IBPV Solidário · Desenvolvimento
  Aplicação:       http://localhost:3000
  Tela de acesso:  http://localhost:3000/acesso
  Debug Miniflare: http://127.0.0.1:8787

  Ctrl + clique nos links para abrir no navegador.
  Ctrl + C para encerrar. Aguarde a mensagem Ready antes de abrir.
  D1 + R2 locais · dados persistidos em .wrangler/state
`);
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 0; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
