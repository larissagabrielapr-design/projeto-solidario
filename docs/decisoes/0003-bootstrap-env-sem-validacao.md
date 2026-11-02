# Credenciais administrativas por ambiente

Data: 2026-11-02. Estado: aprovada pelo usuário.

O usuário solicitou remover as validações de e-mail e senha fornecidos por ambiente, publicar no GitHub e fazer deploy no Cloudflare Workers.

O bootstrap local e por secrets do Worker não exige formato de e-mail nem tamanho mínimo/máximo de senha. Ambos os valores devem estar configurados; não existe senha padrão. O identificador é normalizado com trim e letras minúsculas para busca consistente. Novas contas de bootstrap recebem principal env-password: para permitir login sem aplicar as políticas de cadastro. Não há mudança de esquema.

Cadastros públicos e definição/redefinição de senhas mantêm as políticas anteriores. O login permite transportar os valores do bootstrap; o servidor aplica a exceção apenas a contas marcadas pelo bootstrap. Limites de requisição e de tentativas continuam ativos. Hash scrypt e sessões permanecem iguais.

O bootstrap continua exclusivo de banco vazio: não troca senhas nem promove ou sobrescreve contas existentes. Credenciais não são enviadas ao GitHub nem incorporadas ao pacote do Worker. Secrets existentes não são alterados por este deploy.

Validação: testes de bootstrap, login, políticas públicas e preservação de contas, build e verificação HTTP no Workers. Reversão pelo histórico de versões do Worker; não excluir nem restaurar D1 automaticamente.
