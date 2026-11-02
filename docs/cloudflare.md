# Deploy Cloudflare Workers

Publicação autorizada pelo responsável em 01/11/2026. O adaptador OpenNext foi adotado para manter Next.js. Next.js atualizado para 16.4.3 por requisito do adaptador.

## Comandos

```sh
npm ci
npm run build:cloudflare
npm run deploy
```

A configuração está em `wrangler.jsonc`. O binding DB usa D1 de produção, separado do Miniflare local. R2 permanece pendente: a API informou que é necessário habilitá-lo no painel Cloudflare. Não há upload de arquivos ativo.

O build remove `.env` do pacote gerado e limpa as variáveis locais compiladas. Configure segredos apenas no painel do Worker:

- ADMIN_EMAIL: e-mail do administrador inicial.
- ADMIN_PASS: senha privada sem restrição de tamanho no bootstrap.
- PUBLIC_ORIGIN: origem HTTPS exata do site, sem caminho (opcional; recomendado).

Após salvar e publicar os secrets, abra `/acesso` para criar o primeiro administrador em um banco vazio. Entre pela tela com essas credenciais. O bootstrap nunca sobrescreve um projeto existente. Se PUBLIC_ORIGIN estiver configurado, ele precisa corresponder à URL usada para login.

Nenhuma credencial local é publicada. O token Cloudflare foi usado apenas no processo de publicação, não foi salvo no repositório.

`npm run dev` continua usando D1/R2 locais. Ferramentas de importação PostgreSQL são legadas e não transferem dados automaticamente para D1.

## Publicação verificada

URL: https://ibpv-solidario.larissagabrielapr.workers.dev

Versão: 91a9e9db-2598-4d91-8f5b-8580a97834c1. Verificado HTTP 200 na tela de acesso, sessão anônima sem autorização e HTTP 401 para login inválido. Nenhum administrador remoto foi criado; configure os secrets antes do primeiro uso.
