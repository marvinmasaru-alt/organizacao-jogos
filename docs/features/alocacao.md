# Tela de Alocação de Funcionário

## 1. Objetivo

A tela de Alocação de Funcionário é responsável por permitir que o responsável selecione funcionários disponíveis e os aloque em uma vaga.

A tela deve facilitar a identificação de:

- Qual vaga está sendo preenchida
- Quantas pessoas são necessárias
- Quantas pessoas já estão alocadas
- Quais funcionários estão disponíveis no dia selecionado
- Quais funcionários podem ser utilizados pelo responsável
- Quais funcionários já estão alocados para o dia selecionado
- Quais funcionários não podem ser selecionados para o dia selecionado

A alocação é uma das principais operações de alteração do sistema.

---

# 2. Usuário

A tela será utilizada principalmente pelo usuário do tipo `RESPONSAVEL`.

O administrador poderá visualizar e operar o sistema de acordo com suas permissões.

O responsável somente poderá alocar funcionários que estejam dentro do seu conjunto de funcionários permitidos.

---

# 3. Fluxo principal

O fluxo esperado é:

```text
Responsável
    ↓
Seleciona um dia
    ↓
Seleciona uma sede que tem vaga
    ↓
Visualiza detalhes das vagas disponiveis na sede
    ↓
Visualiza funcionários disponíveis
    ↓
Seleciona funcionário(s)
    ↓
Confirma alocação
    ↓
Backend valida as regras
    ↓
Alocação criada
    ↓
Tela atualizada

4. Estrutura da tela
A tela deve ser dividida em duas áreas principais:
┌──────────────────────────────────────────────────────────────┐
│ ALLOCAÇÃO DE FUNCIONÁRIO                                     │
├──────────────────────────────────────────────────────────────┤
│                        <-   Dia    ->                        │
│ Sede Toyohashi                                               │
│                                                              │
│ Manpower                                                     │
│                                                              │
│ ████████░░                                                   │
│ Necessários: 10                                              │
│ Alocados: 7                                                  │
│ Faltam: 3                                                    │
│                                                              │
│ Forklift                                                     │
│                                                              │
│ ████████░░                                                   │
│ Necessários: 10                                              │
│ Alocados: 7                                                  │
│ Faltam: 3                                                    │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ FUNCIONÁRIOS DISPONÍVEIS                                     │
│                                                              │
│ Buscar funcionário...                                        │
│                                                              │
│ ☑ João Silva          Ajudante                               │
│ ☐ Pedro Santos        Ajudante                               │
│ ☐ Carlos Oliveira     Ajudante                               │
│                                                              │
│                                      [CONFIRMAR ALOCAÇÃO]    │
└──────────────────────────────────────────────────────────────┘
```

## 5. Informações da vaga
No topo da tela deve aparecer primeiro o dia, e deixar evidenciado os dias que tem vagas disponiveis, Depois aparecer as sedes que tem vagas disponiveis e depois que se clica na sede deverá aparecer as vagas. Se houver mais de uma vaga por sede deverá aparecer as duas vagas lá

Mostrar:
Data
Nome da sede
Tipo de trabalho
Quantidade necessária
Quantidade já alocada
Quantidade restante
Status da vaga

Exemplo:
20/08/2026

Toyohashi

Ajudante

Necessários: 10
Alocados: 7
Faltam: 3

Forklift

Necessários: 1
Alocados: 0
Faltam: 1

Status: INCOMPLETA

## 6. Funcionários disponíveis

A lista de funcionários deve mostrar somente funcionários que o usuário possui autorização para utilizar.
O backend deve realizar esse filtro.
O frontend não deve buscar todos os funcionários e tentar esconder os que não pertencem ao responsável.
O backend deve retornar os funcionarios mesmo que eles ja foram alocados para aquela vaga, ou para outras vagas.

Se o funcionario ja foi alocado para outra vaga que não seja essa ele deverá estar riscado.

Se o funcionario ja foi alocado para essa vaga, mas ele cancelou deverá estar em amarelo.

Se o funcionario ja foi alocado para essa vaga, mas ele faltou deverá estar em vermelho.

Deve aparecer um check do lado esquerdo do funcionario, se ele for marcado deverá aparecer um dropdown do lado direito do funcionario para podermos escolher se é manpower ou forklift

Deverão aparecer para o responsavel apenas os funcionarios que ele cadastrou, e que estão como aprovado na situação cadastral


## 7. Dados apresentados por funcionário

Cada funcionário deve apresentar informações suficientes para o responsável identificar a pessoa.

Informações sugeridas:
Nome - telefone
Situação de disponibilidade

Exemplo:
João Silva - 080000000
Disponível

## 8. Busca de funcionário
A tela deve possuir um campo de busca.
Exemplo:
Buscar funcionário...

A busca deve permitir procurar pelo menos pelo nome.

Opcionalmente poderá permitir:
Telefone

A busca deve respeitar as permissões do usuário.

## 9. Filtros
A lista pode possuir filtros.
Filtros iniciais:
Disponibilidade
- Todos
- Disponíveis
- Já alocados
- Indisponíveis (Cancelados e Faltou)
Os filtros não podem permitir que o usuário visualize dados que ele não possui permissão para acessar.

## 10. Funcionário disponível
Um funcionário poderá ser selecionado quando:
Pertencer ao responsável.
Estiver ativo.
Não possuir conflito de alocação.
Estiver disponível para a data da vaga.

Exemplo:
João Silva
Ajudante
Disponível

## 11. Funcionário cancelou ou faltou
Caso o funcionário cancelou ou faltou ele aparece desabilitado

Exemplo:
Carlos Silva (Cancelou) - Indisponível para esta vaga

Deverá pintar de vermelho caso tenha faltado, e amarelo caso tenha cancelado

## 12. Funcionário já alocado
Se um funcionário já estiver alocado para uma vaga conflitante, ele não poderá ser selecionado.
Exemplo:
João Silva: Já alocado na vaga: V0001, Não disponível

## 13. Quantidade de funcionários
O sistema deve permitir selecionar somente a quantidade necessária.

Selecionando o funcionario com o check ele vai aparecer um dropdown na direita do funcionario para escolher o tipo.

O botão de confirmação só poderá ser habilitado se for selecionado a quantidade correta para a vaga.

Ao selecionar o funcionario deverá aparecer a direita dele o dropdown que tem "Manpower" e "Forklift".

Exemplo:
ManPower
Necessários: 10 
Alocados: 8

Forklift
Necessários: 1 
Alocados: 0

O responsável pode selecionar no máximo:
3 funcionários

Ao selecionar 3 funcionarios os botões de check que ficam a esquerda deverão ser desabilitados.

Nesse exemplo deverá ser selecionado 2 Manpower e 1 Forklift para poder habilitar o botão de confirmação de alocação.

## 14. Confirmação da alocação
Antes de criar as alocações, o sistema deve apresentar uma confirmação.

Exemplo:
CONFIRMAR ALOCAÇÃO

Vaga:
Toyohashi
20/08/2026

Ajudante

Funcionários selecionados:
✓ João Silva
✓ Pedro Santos

2 funcionários serão alocados.

Forklift

Funcionários selecionados:
✓ João Silva

1 funcionários serão alocados.

[Cancelar]     [Confirmar Alocação]

## 15. Validações no backend
Ao receber a solicitação, o backend deve validar novamente todas as regras.

Nunca confiar somente nas validações do frontend.

O backend deve verificar:

Usuário
1. Usuário autenticado
2. Usuário possui permissão

Vaga
1. Vaga existe
2. Vaga está ativa
3. Ainda existem vagas disponíveis

Funcionário
1. Funcionário existe
2. Funcionário pertence ao conjunto permitido do responsável
3. Funcionário está ativo
4. Não possui conflito
5. Está disponível

## 16. Criação da alocação
Após todas as validações:

Frontend
    ↓
POST /alocacoes
    ↓
Backend
    ↓
Valida regras
    ↓
Cria alocação
    ↓
Google Sheets
    ↓
Resposta
    ↓
Frontend

## 17. Dados da alocação
Uma alocação deve registrar informações suficientes para identificar a operação.

Dados conceituais:
- ID
- Vaga_ID
- Funcionario_ID
- Responsavel_ID
- Data
- Status

Podem ser adicionados posteriormente:
- Data_Criacao
- Data_Cancelamento
- Usuario_Criacao
- Usuario_Cancelamento
- Observacao
- Status da alocação

Estados iniciais:
- ATIVA
- CANCELADA

Uma nova alocação começa como:
ATIVA

## 19. Não apagar alocações
Quando uma alocação for cancelada, não apagar o registro.
Não fazer:
DELETE

Fazer:
Status = CANCELADA

Isso permite manter o histórico.

## 20. Resultado após alocação
Depois de uma alocação bem-sucedida, a tela deve atualizar automaticamente.

Exemplo antes:

Necessários: 10
Alocados: 7
Faltam: 3

Depois de alocar 2:

Necessários: 10
Alocados: 9
Faltam: 1

O funcionário deve deixar de aparecer como disponível.

## 21. Vaga completa
Se a última vaga disponível for preenchida:
Necessários: 10
Alocados: 10
Faltam: 0

Alterar status para:
COMPLETA

A ação de adicionar novos funcionários deve ser bloqueada.

## 22. Erros
A interface deve apresentar mensagens claras.
- Funcionário já alocado
- Este funcionário já está alocado para outra vaga nesta data.
- Funcionário incompatível
- Vaga cheia
- Esta vaga já está completa.
- Sem permissão
- Você não possui permissão para utilizar este funcionário.
- Erro de servidor
- Não foi possível realizar a alocação.
- Tente novamente.

## 23. Estado de carregamento
Enquanto os funcionários estiverem sendo carregados:
Carregando funcionários...

O botão de confirmação deve permanecer desabilitado enquanto a operação estiver sendo processada.

## 24. Estado sem funcionários
Se não houver funcionários disponíveis:

Nenhum funcionário disponível para esta vaga.

## 25. Estado de erro
Se ocorrer erro ao carregar os dados:

Não foi possível carregar os funcionários.
[Tentar novamente]

## 26. Segurança
O frontend nunca deve determinar sozinho:
- Qual funcionário pertence ao responsável
- Qual vaga pertence ao responsável
- Se o funcionário está disponível
- Se a vaga está cheia
- Se a alocação é permitida
- Todas essas informações devem ser validadas pelo backend.

## 27. API
A implementação da API deve seguir a arquitetura existente.

Exemplo conceitual:
Buscar funcionários disponíveis
GET /funcionarios/disponiveis?vagaId=V001
Criar alocação
POST /alocacoes
Body conceitual:
[
    {
        "vagaId": "V001",
        "funcionarioId": "F001",
    },
    {
        "vagaId": "V002",
        "funcionarioId": "F002",
    }
]

O backend deve identificar o responsável através da sessão/autenticação.
Não confiar em:
{
  "responsavelId": "R001"
}

enviado pelo frontend para determinar permissões.

## 28. Alocação em lote
A tela pode permitir selecionar vários funcionários antes de confirmar.

Exemplo:
3 funcionários selecionados

[Confirmar Alocação]

O backend deve validar cada funcionário.

Se uma parte da operação falhar, o comportamento deve ser definido antes da implementação.

Preferencialmente, a operação deve evitar situações parcialmente concluídas.

## 29. Integração com pagamentos
A alocação pode gerar posteriormente uma obrigação de pagamento.
Fluxo:
Alocação
    ↓
Funcionário
    ↓
Tipo de trabalho
    ↓
Tabela de Valores
    ↓
Pagamento

O valor deve ser registrado no pagamento no momento em que a obrigação for criada.

Alterações futuras na tabela de valores não devem alterar pagamentos históricos.

## 30. Responsividade
A tela deve funcionar em:
Desktop
Tablet
Celular
No celular, a lista de funcionários deve ser adaptada para facilitar seleção por toque.

## 31. Experiência do usuário
A tela deve priorizar:
- Identificação rápida da vaga.
- Visualização clara da quantidade restante.
- Encontrar rapidamente um funcionário.
- Selecionar funcionário.
- Confirmar alocação.
- Receber confirmação clara do resultado.
- O usuário não deve precisar navegar por várias telas para realizar uma alocação simples.

## 32. Fluxo completo
Selecionar vaga
      ↓
Ver detalhes
      ↓
Carregar funcionários permitidos
      ↓
Aplicar filtros
      ↓
Selecionar funcionário
      ↓
Validar seleção
      ↓
Confirmar
      ↓
Backend valida novamente
      ↓
Criar alocação
      ↓
Atualizar vaga
      ↓
Atualizar lista
      ↓
Exibir sucesso

## 33. Critérios de aceite
A funcionalidade será considerada concluída quando:

Responsavel consegue selecionar um dia.

Sistema mostra as sedes com vagas do dia.

Responsável consegue abrir uma sede.

Sistema mostra os dados da sede e suas vagas.

Sistema mostra somente funcionários permitidos.

Sistema permite buscar funcionário.

Sistema permite selecionar funcionário.

Sistema impede funcionário incompatível.

Sistema impede funcionário com conflito.

Sistema impede exceder a quantidade necessária.

Responsavel consegue selecionar a vaga para o funcionario.

Backend valida todas as regras.

Alocação é registrada.

Alocação possui status.

Histórico é preservado.

Dashboard/lista é atualizada após a operação.

Mensagem de sucesso é apresentada.

Mensagens de erro são apresentadas corretamente.

Não é possível acessar funcionários de outro responsável manipulando a requisição.

A interface funciona em desktop e mobile.