# Registro de decisões

Use arquivos numerados, como `0001-adaptador-cloudflare.md`.

Cada registro deve conter: título, data, estado (proposta/aprovada/substituída), contexto, alternativas, decisão, impactos e como validar/reverter.

Uma proposta não autoriza implementação. Pergunte ao usuário antes de decisões grandes e registre a aprovação recebida.

## Direções já definidas pelo usuário

- Desenvolvimento local com Next.js e `npm run dev`, sem Docker.
- Destino de hospedagem: Cloudflare Workers.
- Consultar o usuário antes de decisões grandes.

## Pendências

- Adaptador/runtime de Next.js no Workers.
- Provisionamento e bindings D1/R2 no ambiente Cloudflare (D1 e Miniflare local já aprovados; veja `0001-d1-local.md`).
- Processo de publicação, domínio e transferência dos dados.
