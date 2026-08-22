# Módulo de Confirmação do Dia

## 1. Objetivo

O módulo de Confirmação do Dia é responsável por registrar o que realmente aconteceu com os funcionários que estavam alocados para trabalhar em determinada data e sede.

A tela deve permitir que o responsável confirme individualmente ou em lote se cada funcionário:

- Trabalhou
- Cancelou
- Faltou

A partir dessas informações, o sistema deve:

- Identificar necessidades de substituição
- Identificar vagas que precisam voltar a ficar disponíveis
- Impedir a geração de pagamento para funcionários que não trabalharam
- Identificar funcionários elegíveis para pagamento
- Manter o histórico da alocação original
- Permitir que o dia seja encerrado/conferido

O módulo de confirmação NÃO deve apagar ou substituir a alocação original.

---

# 2. Conceito principal

A alocação responde:
> Quem deveria trabalhar?

A confirmação responde:
> Quem realmente trabalhou?

O pagamento responde:
> Quem precisa receber?

Fluxo:

```text
ALLOCAÇÃO
    ↓
Quem deveria trabalhar?
    ↓
CONFIRMAÇÃO
    ↓
Quem realmente trabalhou?
    ↓
PAGAMENTO
    ↓
Quem precisa receber?
```

## 3. Usuários

A tela será utilizada principalmente pelo usuário do tipo:
RESPONSAVEL

O administrador poderá visualizar e operar o módulo de acordo com suas permissões.

O responsável somente poderá confirmar funcionários e vagas que estejam dentro do seu escopo de acesso.

O backend deve validar as permissões.

O frontend nunca deve ser responsável por determinar quais dados o usuário pode acessar.

## 4. Fluxo principal
O fluxo da tela deve ser:

Responsável
    ↓
Seleciona um dia
    ↓
Visualiza as sedes e vagas da sede funcionários alocados
    ↓
Confirma a situação de cada funcionário
    ↓
Sistema identifica pendências
    ↓
Sistema identifica necessidade de substituição
    ↓
Sistema identifica funcionários elegíveis para pagamento
    ↓
Responsável confirma o dia

## 5. Estrutura da tela

A tela deve seguir uma hierarquia semelhante à tela de Alocação.
CONFIRMAÇÃO DO DIA
← 20/08/2026 →

Sedes com atividades no dia:

[ Toyohashi ]
[ Komaki ]
[ Nagoya ]

Após selecionar a sede:

TOYOHASHI

Resumo:

Manpower
Necessários: 10
Alocados: 10
Trabalharam: 9
Pendentes: 1
Substituições: 1

Forklift
Necessários: 1
Alocados: 1
Trabalharam: 1
Pendentes: 0
Substituições: 0

Abaixo deve aparecer a lista de funcionários.

A lista de funcionario deve ser todos os funcionarios que foram alocados naquele sede, independente se o responsável tem acesso a ele ou não (PRECISA DEFINIR ISSO, perguntar para os stakeholders se faz sentido ou o responsavel que tem acesso ao funcionario tem que ir até a tela de confirmação).

As sedes que aparecem deve ser apenas as sedes que o responsável é responsável por, não deverá aparecer para o responsável confirmar trabalho na sede de outro responsável.

## 6. Seleção de data
A primeira etapa da tela deve ser a seleção do dia.
O usuário deve conseguir navegar entre os dias.
Exemplo:
← 19/08/2026    20/08/2026    21/08/2026 →
O sistema deve destacar os dias que possuem atividades/alocações.
Não é necessário mostrar dias sem dados relevantes.

## 7. Seleção de sede
Após selecionar o dia, mostrar somente as sedes que possuem vagas/alocações para aquele dia e que o usuário possui permissão para visualizar.
Exemplo:
20/08/2026

Sedes:

Toyohashi
10 funcionários alocados

Komaki
8 funcionários alocados

Nagoya
12 funcionários alocados
O usuário seleciona uma sede para abrir a confirmação.

## 8. Vagas
Após selecionar a sede, mostrar todas as vagas existentes naquela sede para o dia.
Exemplo:
TOYOHASHI

MANPOWER

Necessários: 10
Alocados: 10
Trabalharam: 9
Pendentes: 1

FORKLIFT

Necessários: 1
Alocados: 1
Trabalharam: 1
Pendentes: 0

Se houver várias vagas/tipos, todas devem aparecer.

`Pendentes` aqui é "vagas ainda não preenchidas" — `max(0, Necessários -
Trabalharam)`, nunca negativo (decisão revertida: não é mais "quantos ainda
estão aguardando confirmação"; esse conceito continua existindo, mas vira
o banner ⚠ da seção 17/27, calculado sobre todos os tipos juntos, não por
tipo). `Trabalharam` soma quem confirmou como TRABALHOU e quem confirmou
como SUBSTITUIU (seção 13.1) — os dois contam como trabalho de verdade.

## 9. Lista de funcionários
A lista deve apresentar todos os funcionários que possuem uma alocação para aquela sede/data dentro do escopo do usuário.
Exemplo:
MANPOWER

João Silva       0800000000
Pedro Santos     0800000001
Carlos Oliveira  0800000002

FORKLIFT

Marcos Silva     0800000003

A lista deve mostrar claramente o tipo de trabalho da alocação.

## 10. Situação do funcionário
Cada funcionário deve possuir uma situação de confirmação.
Estados:
- PENDENTE
- TRABALHOU
- CANCELOU
- FALTOU
- SUBSTITUIU (seção 13.1 — decisão revertida: FALTOU pode ser marcado como urgente, seção 13; quando alguém cobre essa vaga, marca-se SUBSTITUIU nele, não TRABALHOU)

Estado inicial:
PENDENTE

## 11. Funcionário que trabalhou
Quando o funcionário realmente trabalhou:
João Silva

Status:
✓ TRABALHOU

Esse funcionário passa a ser elegível para geração de pagamento.

O sistema não deve gerar o pagamento automaticamente apenas porque o funcionário trabalhou.

A confirmação deve gerar a informação necessária para que o pagamento seja posteriormente criado/processado.

## 12. Funcionário que cancelou
Quando o funcionário cancelar:
Pedro Santos

Status:
CANCELOU

O sistema deve:
- Registrar o cancelamento
- Manter a alocação original
- Não gerar pagamento
- Identificar se a vaga precisa de substituição
- Atualizar os indicadores da vaga
- A alocação original NÃO deve ser apagada.

## 13. Funcionário que faltou
Quando o funcionário estava alocado, mas não compareceu:
Carlos Oliveira

Status:
FALTOU

O sistema deve:
Registrar a falta

Manter a alocação original
Não gerar pagamento
Identificar necessidade de substituição
Atualizar os indicadores da vaga

## 13.1. Funcionário que substituiu (SUBSTITUIU)
Quando um funcionário cobre uma vaga que estava com FALTOU marcado como urgente (SUBSTITUICAO_NECESSARIA):
Pedro Tanaka

Status:
SUBSTITUIU

O sistema deve:
- Tratar como trabalho normal — mesma elegibilidade de pagamento que TRABALHOU (seção 11)
- Contar em "Trabalharam" no resumo por tipo (seção 8), igual TRABALHOU
- Abater 1 da contagem de "substituições necessárias" daquele tipo, na mesma sede/dia — nunca deixar a contagem passar de zero
- Manter o registro original de quem faltou intacto (nunca sobrescrever — seção 30/35)
- Mostrar rótulo/cor próprios na tela, diferentes de um "Trabalhou" comum, pra deixar claro que essa pessoa cobriu uma urgência

Exemplo:
MANPOWER
Necessários: 10
Trabalharam: 9
⚠ 1 substituição necessária

Depois de marcar o substituto como SUBSTITUIU:
MANPOWER
Necessários: 10
Trabalharam: 10
(nenhuma substituição necessária pendente)

O funcionário que faltou originalmente continua no histórico como FALTOU/SUBSTITUICAO_NECESSARIA — SUBSTITUIU é um registro novo, numa alocação diferente (a do substituto), não uma edição do registro original.

## 14. Cores dos estados
A interface deve utilizar diferenciação visual clara.
Sugestão:
- PENDENTE    → azul
- TRABALHOU   → verde
- SUBSTITUIU  → roxo
- CANCELOU    → amarelo
- FALTOU      → vermelho

As cores devem ser utilizadas de maneira consistente em todo o módulo.

## 15. Confirmação rápida (removida)
A ação "Todos trabalharam" existiu nas primeiras versões da tela, mas foi removida — decisão revertida — por não fazer mais sentido no fluxo real de uso. A confirmação passou a ser sempre individual (seção 16).

## 16. Confirmação individual
O usuário também deve conseguir alterar a situação individualmente.
Exemplo:
João Silva

[ Trabalhou ▼ ]
Opções:
- Trabalhou
- Cancelou
- Faltou
Ao selecionar uma opção, a alteração deve ser validada pelo backend.

## 17. Situação pendente
Enquanto um funcionário ainda não tiver sua situação confirmada:
João Silva

PENDENTE
O sistema deve deixar claro que ainda existe uma confirmação pendente.

Exemplo:
⚠ 3 funcionários aguardando confirmação

## 18. Substituição
Quando um funcionário for marcado como:
CANCELOU

ou:
FALTOU

o sistema deve identificar a necessidade de substituição.

Exemplo:
MANPOWER

Necessários: 10
Alocados: 10
Trabalharam: 9

⚠ 1 SUBSTITUIÇÃO NECESSÁRIA
A substituição não deve apagar a alocação original.

## 19. Alocação original e substituição
Exemplo:
João foi originalmente alocado:

Vaga: V001
Funcionário: João
Tipo: Manpower
Status da alocação: ATIVA

No dia:
João → FALTOU

O sistema mantém:
Alocação original
João
FALTOU

Depois, caso Pedro seja colocado como substituto:
Nova alocação
Pedro
SUBSTITUTO

O histórico deve permitir identificar:
João → funcionário originalmente alocado
Pedro → funcionário substituto

## 20. Vaga com necessidade de substituição
Uma vaga deve ser considerada com necessidade de substituição quando:
Quantidade necessária
>
Quantidade de funcionários confirmados como trabalhando
Exemplo:
Necessários: 10
Trabalharam: 9

Resultado:

1 substituição necessária

## 21. Vaga sem necessidade de substituição
Exemplo:
Necessários: 10
Trabalharam: 10

Resultado:

✓ Vaga completa
✓ Nenhuma substituição necessária

## 22. Cancelamento e disponibilidade da vaga
Quando um funcionário cancelar ou faltar, a quantidade necessária da vaga não deve ser alterada.

Exemplo:
Necessários: 10
Alocados: 10
Trabalharam: 9

A vaga continua sendo uma vaga de 10 pessoas.
O sistema deve identificar:
1 substituição necessária
A criação da substituição será realizada pelo fluxo de alocação.
Não alterar o histórico da vaga original.

## 23. Pagamento
Somente funcionários confirmados como:
TRABALHOU

podem se tornar elegíveis para pagamento.

Fluxo:
Alocação
    ↓
Confirmação
    ↓
TRABALHOU
    ↓
Elegível para pagamento
    ↓
Pagamento
Funcionários:
CANCELOU
ou:
FALTOU
não devem gerar pagamento.

## 24. Valor do pagamento
O valor do pagamento deve ser determinado a partir das informações da alocação e da tabela de valores vigente.

Fluxo:
Alocação
    ↓
Funcionário
    ↓
Tipo de trabalho
    ↓
Tabela de Valores
    ↓
Valor
    ↓
Pagamento

O valor utilizado no pagamento deve ser registrado para preservar o histórico.
Alterações futuras na tabela de valores não devem alterar pagamentos já gerados.

## 25. Status de confirmação do dia
A confirmação de uma sede/dia deve possuir um estado.
Estados sugeridos:
- PENDENTE
- EM_CONFERENCIA
- COM_PENDENCIA
- CONFERIDO
- PENDENTE

Ainda não iniciou a conferência.
EM_CONFERENCIA
O responsável começou a confirmar funcionários.

COM_PENDENCIA
Existem situações que precisam de ação.
Exemplos:
- Funcionário faltou
- Funcionário cancelou
- Existe necessidade de substituição

CONFERIDO
Todos os funcionários foram processados e não existem pendências de confirmação.

## 26. Resumo da confirmação
A tela deve apresentar um resumo.
Exemplo:
TOYOHASHI
20/08/2026

Total alocados: 11

✓ Trabalharam: 9
⚠ Cancelaram: 1
✕ Faltaram: 1
⏳ Pendentes: 0

⚠ Substituições necessárias: 2

Pagamentos elegíveis: 9

## 27. Pendências
A tela deve destacar claramente as pendências.

Exemplo:
PENDÊNCIAS

⚠ Pedro Santos cancelou
   → Necessita substituição

✕ Carlos Oliveira faltou
   → Necessita substituição

O usuário deve conseguir identificar rapidamente o que precisa ser resolvido.

## 28. Atualização individual da confirmação
O responsável pode alterar a situação de cada funcionário individualmente a qualquer momento.

Exemplos:
Antes do dia:
Funcionário:
João Silva
25/08/2026
Toyohashi

Status:
PENDENTE
João liga:
"Não vou conseguir ir"

Responsável altera:
Status:
CANCELOU

Sistema:
- libera a vaga
- marca necessidade de substituição
- mantém histórico
- Novos estados da confirmação
- Eu adicionaria uma diferença entre "ainda não conferido" e "cancelamento antecipado".

Ficaria:
- PENDENTE
- CONFIRMADO
- FALTOU
- CANCELOU_ANTECIPADO
- CANCELOU_NO_DIA
- SUBSTITUIDO

Exemplo de fluxo:
Caso 1 - Cancelamento antecipado
Dia 25/08

Alocação:
João → Toyohashi

22/08:
João avisa que não vai

Responsável:
CANCELOU_ANTECIPADO
Resultado:
Vaga:
Necessários: 10
Alocados: 9
Faltam: 1

Status:
SUBSTITUIÇÃO NECESSÁRIA
Caso 2 - Faltou no dia
25/08

João não apareceu

Responsável:
FALTOU

Resultado:
- não gera pagamento
- registra histórico

## 28.1 Conclusão da confirmação
O responsável pode finalizar a conferência da sede/dia.

Botão:
[FINALIZAR CONFERÊNCIA]

A finalização serve para confirmar que a análise daquele dia foi concluída **e trava** a sede/dia contra novas alterações de situação (alterar individualmente, "todos trabalharam") — decisão revertida em relação ao texto original desta seção, que dizia "não impede alterações anteriores". Persistida na tabela `conferencias_dia` (`sede_id` + `data`, únicos), preenchendo `finalizado_em`/`finalizado_por`.

Somente o Administrador pode reabrir uma conferência já finalizada (`POST /confirmacoes/reabrir`), o que limpa `finalizado_em` e registra `reaberto_em`/`reaberto_por` — depois disso a sede/dia volta a aceitar alterações normalmente, até ser finalizada de novo.

Antes de finalizar:
Validar:
- Não existem funcionários em PENDENTE

Caso existam:
- Não é possível finalizar a conferência.

Existem 2 funcionários aguardando confirmação.

Porém:
O responsável pode alterar individualmente funcionários antes da finalização.

Exemplo:
Funcionários:

✓ João Silva
   PRESENTE

✓ Carlos Souza
   CANCELOU_ANTECIPADO

✓ Pedro Tanaka
   PENDENTE

O sistema permite:
Salvar alterações

mas bloqueia:
Finalizar conferência

até Pedro ter uma situação definida.

Eu também adicionaria um campo na tabela confirmacoes:
data_confirmacao TIMESTAMP

porque você vai querer saber:
Exemplo:
Carlos cancelou:

Status:
CANCELOU_ANTECIPADO

Alterado em:
22/08 14:32

Por:
Paulo

## 29. Substituições pendentes
A existência de uma substituição necessária não deve impedir necessariamente a finalização da confirmação.

Exemplo:
10 necessários
9 trabalharam
1 faltou

Conferência:
✓ Pode ser finalizada

Situação:
⚠ Substituição ainda necessária
A substituição é uma operação posterior.
A regra é:
CONFIRMAÇÃO
    ↓
Identifica necessidade
    ↓
ALERTA
    ↓
ALOCACAO DE SUBSTITUTO
## 30. Histórico
Nunca apagar informações da confirmação.
Exemplo:
João
Alocado: 20/08/2026
Situação: FALTOU
Se posteriormente houver uma alteração autorizada:
Situação anterior: FALTOU
Situação nova: TRABALHOU
O sistema deve preservar o histórico quando isso for necessário para auditoria.

## 31. Segurança
O backend deve validar:
Usuário
- Usuário autenticado
- Usuário possui permissão

Sede
- Usuário possui acesso à sede

Funcionário
- Funcionário pertence ao escopo permitido
- Funcionário possui alocação para aquela data/sede

Confirmação
- Alocação existe
- Alocação pertence à data correta
- Alocação pertence à sede correta
- Operação é válida
- Nunca confiar em IDs enviados pelo frontend para determinar permissões.

## 32. API
A implementação deve seguir a arquitetura existente.
Buscar confirmação

Exemplo:
GET /confirmacoes?data=2026-08-20&sedeId=S001
Atualizar situação de funcionário
Exemplo:
PATCH /confirmacoes/{alocacaoId}
Body:
{
  "status": "TRABALHOU"
}
ou:
{
  "status": "FALTOU"
}
ou:
{
  "status": "CANCELOU"
}
ou:
{
  "status": "SUBSTITUIU"
}

`necessitaSubstituicaoUrgente: true` no body só é considerado quando `status` é `FALTOU` (seção 13) — marca a alocação como SUBSTITUICAO_NECESSARIA em vez de FALTOU. `SUBSTITUIU` (seção 13.1) não usa esse campo.

## 33. Confirmar todos (removida)
`POST /confirmacoes/todos` existiu, mas foi removido junto com a ação "Todos trabalharam" (seção 15) — não fazia mais sentido no fluxo real de uso. A situação de cada funcionário só é alterada individualmente (`PATCH /confirmacoes/:alocacaoId`, seção 32).

## 34. Finalizar confirmação
Endpoint conceitual:
POST /confirmacoes/finalizar
Body:
{
  "sedeId": "S001",
  "data": "2026-08-20"
}
O backend deve verificar se existem funcionários pendentes antes de finalizar.

## 35. Regras importantes
Regra 1 — Não apagar alocação
A confirmação nunca deve apagar uma alocação.

Regra 2 — Confirmação representa o ocorrido
A confirmação registra o que realmente aconteceu.

Regra 3 — Faltou não significa que não estava alocado
Um funcionário pode estar:
Alocação: ATIVA
Confirmação: FALTOU

Regra 4 — Cancelou não significa apagar
O histórico deve permanecer.

Regra 5 — Somente quem trabalhou pode gerar pagamento
TRABALHOU → elegível
CANCELOU → não elegível
FALTOU → não elegível
PENDENTE → não elegível

Regra 6 — Substituição é uma nova alocação
Nunca substituir apagando a alocação original.

Regra 7 — Backend é a autoridade
Todas as regras devem ser validadas no backend.

## 36. Estados visuais
A interface deve utilizar estados visuais claros:
PENDENTE
   ↓
⚪

TRABALHOU
   ↓
🟢

CANCELOU
   ↓
🟡

FALTOU
   ↓
🔴
A implementação visual deve seguir o padrão visual já existente no projeto.

## 37. Estados de carregamento
Durante o carregamento:
Carregando confirmação...
Durante uma alteração:
Salvando...
Durante a finalização:
Finalizando confirmação...
Botões devem ser desabilitados enquanto a respectiva operação estiver em processamento para evitar requisições duplicadas.

## 38. Estado sem dados
Caso não existam alocações:
Nenhuma alocação encontrada para esta sede nesta data.

## 39. Estado de erro
Caso ocorra erro:
Não foi possível carregar a confirmação.

[Tentar novamente]

Caso ocorra erro ao salvar:
Não foi possível atualizar a situação do funcionário.

[Tentar novamente]

## 40. Responsividade
A tela deve funcionar em:
Desktop
Tablet
Celular
No celular, a lista de funcionários deve permanecer fácil de visualizar e operar por toque.

## 41. Fluxo completo
Selecionar data
      ↓
Selecionar sede
      ↓
Carregar vagas
      ↓
Carregar funcionários alocados
      ↓
Mostrar situação atual
      ↓
Confirmar individualmente
      ↓
Backend valida
      ↓
Atualiza confirmação
      ↓
Atualiza indicadores
      ↓
Identifica substituições
      ↓
Identifica pagamentos elegíveis
      ↓
Finalizar conferência

## 42. Critérios de aceite
A funcionalidade será considerada concluída quando:

Responsável consegue selecionar um dia.

Sistema mostra as sedes com alocações naquele dia.

Responsável consegue selecionar uma sede.

Sistema mostra as vagas da sede.

Sistema mostra os funcionários alocados.

Sistema mostra a situação atual de cada funcionário.

Funcionário inicia como PENDENTE.

Responsável consegue marcar funcionário como TRABALHOU.

Responsável consegue marcar funcionário como CANCELOU.

Responsável consegue marcar funcionário como FALTOU.

Sistema identifica funcionários que precisam de substituição.

Sistema não apaga a alocação original.

Sistema mantém o histórico.

Funcionários que trabalharam ficam elegíveis para pagamento.

Funcionários que cancelaram não ficam elegíveis para pagamento.

Funcionários que faltaram não ficam elegíveis para pagamento.

Sistema mostra quantidade de funcionários que trabalharam.

Sistema mostra quantidade de cancelamentos.

Sistema mostra quantidade de faltas.

Sistema mostra quantidade de pendências.

Sistema mostra quantidade de substituições necessárias.

Sistema impede finalizar enquanto existirem funcionários PENDENTE.

Sistema permite finalizar a conferência quando todos os funcionários tiverem uma situação definida.

Backend valida todas as permissões.

Backend não confia nos IDs enviados pelo frontend.

Não é possível confirmar funcionário fora do escopo do responsável.

Não é possível confirmar uma alocação inexistente.

Interface possui estados de carregamento.

Interface possui estados de erro.

Interface funciona em desktop e mobile.