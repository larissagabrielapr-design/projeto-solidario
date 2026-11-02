# Instruções do projeto IBPV Solidário

- Objetivo: deploy limpo no Cloudflare Workers, preservando o desenvolvimento com `npm run dev`.
- Leia `docs/README.md`, os padrões e as decisões antes de alterar o projeto.
- Pergunte ao usuário antes de decisões grandes: trocar framework ou adaptador de execução, banco/provedor, autenticação, modelo de dados, regras de negócio, identidade visual, novas dependências estruturais ou serviços com custo. Apresente recomendação, alternativas e impacto; aguarde a resposta antes de implementar.
- Ajustes pequenos e reversíveis dentro do escopo aprovado podem ser feitos diretamente.
- Registre decisões aprovadas em `docs/decisoes/`; propostas devem permanecer explicitamente pendentes.
- Use npm e `package-lock.json` como referência de instalação. Não introduza outros lockfiles.
- Nunca registre credenciais, dados reais de famílias ou backups no Git ou na documentação.
- Preserve permissões e regras de negócio. Não crie senha padrão. O bootstrap autorizado usa ADMIN_EMAIL/ADMIN_PASS em banco vazio; em produção exige secrets Cloudflare. Credenciais de bootstrap por ambiente não têm regras de formato/tamanho (decisão 0003); cadastros públicos mantêm suas validações. Nunca sobrescreva contas existentes.
- Valide alterações com os comandos relevantes: `npm test` para regras/dados e `npm run build` para aplicação. Informe limitações reais da validação.
- Deploy só está pronto após teste no runtime do Workers. Build local do Next.js sozinho não comprova compatibilidade.
- Não publique nem migre dados reais sem autorização explícita.
- Este `AGENTS.md` é a fonte de instruções para agentes; mantenha padrões e decisões em `docs/`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
