# Alterações por pull request

A branch `master` dos oito repositórios Inteliagent está protegida no GitHub, incluindo o repositório de infraestrutura. A proteção também se aplica aos administradores.

## Fluxo

1. Crie uma branch a partir de `master` e faça as alterações nela.
2. Envie a branch e abra um pull request com destino a `master`.
3. Aguarde o check obrigatório `verify`, fornecido pelo GitHub Actions. A branch também deve estar atualizada com a `master`.
4. Faça o merge somente após a aprovação do check. Cada merge dispara novamente o CI pelo evento `push` na `master`.

Push direto, force push e exclusão da `master` estão bloqueados. A regra exige PR e verificações aprovadas; não exige aprovação humana adicional de outro colaborador.

## CI/CD

Todos os projetos executam o workflow CI para pull requests e para atualizações da `master`, sem filtro por arquivos. O aplicativo também executa o build Android após o merge e em tags versionadas. Os secrets de assinatura não são entregues aos jobs de pull requests.

O servidor mantém sua verificação a cada 30 minutos e implanta somente o commit atual da `master` aprovado pelo CI. A publicação de releases Android continua vinculada às tags versionadas.

As proteções de branch são configurações do GitHub. Copiar os workflows para outro repositório não configura automaticamente suas proteções.

## Submódulos

Alterações de código devem ser propostas no repositório do serviço por PR. Depois do merge, atualize a referência do submódulo neste repositório em outro PR, para manter o clone completo reproduzível.
