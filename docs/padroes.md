# Padrões de desenvolvimento

- Next.js App Router em `app/`; D1 local via Miniflare em `db/`; rotinas administrativas em `scripts/`. PostgreSQL é compatibilidade legada.
- npm como gerenciador; instalação reproduzível com `npm ci` e `package-lock.json` versionado.
- Desenvolvimento: `npm run dev`. Produção Node: `npm run build` e `npm start`.
- Variáveis locais em `.env`, nunca versionadas; exemplos sem credenciais em `.env.example`.
- Login, autorização e validação de dados devem ser conferidos no servidor.
- Preserve o histórico e as permissões existentes. Mudanças de esquema precisam de migração e plano de recuperação.
- Documente comandos e variáveis novos junto da alteração. Execute verificações proporcionais ao impacto.
