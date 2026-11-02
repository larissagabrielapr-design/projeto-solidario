# Projeto IBPV Solidário

Aplicação para organizar ações solidárias da IBPV: cadastro de famílias, arrecadações, estoque de cestas, retiradas, histórico e equipe com perfis de acesso.

Usa Next.js, React e TypeScript. No desenvolvimento, o banco D1 e o armazenamento R2 são simulados pelo Miniflare, com dados persistidos no computador. A produção usa Cloudflare Workers com OpenNext e D1. O R2 remoto aguarda habilitação na conta Cloudflare.

## Requisitos

- Node.js 22.13 ou superior e npm.
- Internet para instalar as dependências na primeira execução.
- Não precisa de Docker, PostgreSQL ou conta Cloudflare para rodar localmente.

## Como rodar

Na pasta do projeto:

```sh
npm ci
```

Copie `.env.example` para `.env`. No PowerShell:

```powershell
Copy-Item .env.example .env
```

Para criar o primeiro administrador, preencha no `.env`:

```dotenv
ADMIN_EMAIL=seu-email@exemplo.com
ADMIN_PASS="escolha uma senha privada"
```

As credenciais de bootstrap por ambiente não têm validação de formato ou tamanho; ambos os valores devem estar preenchidos. Os nomes `admin_email` e `admin_pass` também são aceitos; prefira a forma maiúscula. Não envie o `.env` ao Git.

Inicie tudo com:

```sh
npm run dev
```

O terminal mostra os links. Aguarde `Ready` e a confirmação de D1/R2:

| Endereço | Uso |
| --- | --- |
| http://localhost:3000 | Aplicação |
| http://localhost:3000/acesso | Login |
| http://127.0.0.1:8787 | Painel Miniflare com botões para abrir a aplicação e consultar D1/R2 |
| http://127.0.0.1:8787/status | Estado dos recursos locais em JSON |

Entre com o e-mail e a senha definidos no `.env`. A conta administrativa permite gerenciar equipe, aprovar cadastros e ajustar permissões pelos fluxos existentes.

O administrador é criado somente na primeira inicialização de um banco local vazio. A senha fica protegida com scrypt no banco. Alterar as variáveis depois não troca a senha nem promove contas existentes. Não há login automático nem senha padrão. Em produção, o bootstrap usa secrets do Worker, sem ler o .env local.

Use `Ctrl + C` para encerrar. Reinicie após alterar as variáveis do `.env`. Se uma porta estiver ocupada, encerre a instância anterior.

## Dados e arquivos locais

O esquema inicial está em `db/d1/0001_initial.sql` e é aplicado automaticamente. D1 e R2 persistem em `.wrangler/state/`, ignorada pelo Git. Reiniciar não apaga os dados. Excluir essa pasta elimina banco e arquivos locais: só faça isso se quiser descartar o ambiente de desenvolvimento.

O binding R2 `FILES` está preparado para funcionalidades futuras. Não há upload público implementado. O painel de debug escuta apenas em `127.0.0.1` e é exclusivo de desenvolvimento.

## Verificações

```sh
npm run test:local
npm test
npm run build
```

`test:local` verifica esquema e rollback D1, além de escrita/leitura/exclusão R2. `npm test` mantém os testes legados de migração PostgreSQL e regras da aplicação. O build Next.js verifica a aplicação, mas não comprova compatibilidade com Workers.

## Deploy no Cloudflare

O destino escolhido é Workers com D1 e, quando necessário, R2. O adaptador OpenNext e o binding D1 de produção estão configurados em `wrangler.jsonc`. Use `npm run deploy` para compilar e publicar. `npm start` é o servidor Node do Next.js, não um deploy Cloudflare.

Configure ADMIN_EMAIL e ADMIN_PASS como secrets do Worker (senha privada de produção) e abra `/acesso` para iniciar o banco vazio. PUBLIC_ORIGIN pode conter a origem HTTPS exata do site. Consulte `docs/cloudflare.md`. Rotinas PostgreSQL existentes em `scripts/` são legadas e não importam dados automaticamente no D1.

## Organização

- `app/`: páginas, API, autenticação e regras de negócio.
- `db/`: acesso aos dados, esquema D1 e compatibilidade PostgreSQL.
- `scripts/`: inicialização, painel local, testes e ferramentas legadas.
- `docs/`: padrões de desenvolvimento, design e decisões.
- `AGENTS.md`: instruções para agentes; decisões grandes precisam de confirmação prévia.

Consulte [a documentação](docs/README.md) e [a preparação Cloudflare](docs/cloudflare.md). Nunca versionar credenciais, backups ou dados reais das famílias.
