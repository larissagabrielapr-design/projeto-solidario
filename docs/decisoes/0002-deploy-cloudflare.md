# Publicação no Cloudflare

Data: 2026-11-01. Estado: aprovada pelo usuário ao solicitar deploy em produção antes de configurar as variáveis.

OpenNext adapta o Next.js existente para Workers; a versão Next.js 16.4.3 atende à dependência do adaptador instalado. DB passa a usar o binding D1 real nas requisições de produção. Nenhum dado local é transferido. O bootstrap de produção usa secrets da Cloudflare, exige senha de pelo menos 12 caracteres e só cria o primeiro administrador em banco vazio. O build remove arquivos e valores .env locais do artefato.

R2 remoto aguarda habilitação na conta; o bucket local segue disponível para desenvolvimento. O deploy atual não depende de arquivos.

Validação: build de produção e tipos, testes de regras/migração e verificação de acesso no runtime Workers. Para reverter uma publicação, usar o histórico de versões do Worker; não remover o D1 nem sobrescrever dados.
