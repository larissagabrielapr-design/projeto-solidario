# D1 e R2 locais com Miniflare

Data: 2026-11-01. Estado: aprovada pelo usuário.

O usuário escolheu D1 como banco e pediu Miniflare local e R2 para arquivos futuros. O desenvolvimento usa os bindings DB e FILES, persistidos em `.wrangler/state`. PostgreSQL foi mantido apenas para compatibilidade com rotinas legadas; não é requisito para desenvolvimento.

`npm run dev` inicia Next.js, inicializa o esquema D1 e oferece um painel de consulta em `127.0.0.1:8787`. O bucket permanece privado, sem fluxo de upload público.

O usuário também autorizou ADMIN_EMAIL/ADMIN_PASS no `.env` para o administrador inicial. Isso se aplica apenas ao desenvolvimento e banco vazio, com hash scrypt e sessão normal após login. Alterar o `.env` não sobrescreve contas existentes.

Validação: teste de esquema/rollback D1, escrita/leitura/exclusão R2, acesso HTTP à aplicação e painel. O adaptador Next.js para Workers e o provisionamento remoto continuam pendentes; não há deploy autorizado nesta decisão.
