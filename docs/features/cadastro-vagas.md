# Módulo de Cadastro e Gestão de Vagas

## 1. Objetivo

O módulo de Cadastro e Gestão de Vagas é responsável por definir e controlar as necessidades de funcionários das sedes.

O sistema possui dois tipos principais de necessidade:

- Vagas fixas
- Vagas esporádicas

As vagas fixas representam uma necessidade recorrente de uma sede.

As vagas esporádicas representam uma necessidade específica para determinada data e não fazem parte da configuração recorrente da sede.

O módulo deve permitir que o sistema saiba:

- Quais sedes possuem operação em determinada data
- Quais tipos de funcionários são necessários
- Quantos funcionários são necessários
- Quais necessidades são recorrentes
- Quais necessidades são específicas
- Quais vagas estão abertas
- Quantos funcionários já foram alocados
- Quantas posições ainda estão disponíveis
- Qual é o status da vaga

---

# 2. Conceitos

O sistema deve separar três conceitos:

```text
SEDE
   ↓
CONFIGURAÇÃO DE VAGA
   ↓
VAGA DO DIA
```

Sede
Representa o local onde o trabalho será realizado.

Exemplo:
Toyohashi


Configuração de vaga
Representa uma necessidade padrão/recorrente de uma sede.

Exemplo:
Toyohashi
Manpower: 6
Forklift: 1

Vaga do dia
Representa a necessidade real para uma data específica.

Exemplo:
20/08/2026

Toyohashi
Manpower: 6
Forklift: 1

## 3. Vagas fixas
Uma vaga fixa representa uma necessidade recorrente.
Exemplo:
Toyohashi

Manpower: 6
Forklift: 1

Essa configuração não representa uma vaga de uma data específica.
Ela representa um padrão que pode ser utilizado para gerar as vagas dos dias em que a sede possui operação.

## 4. Vagas esporádicas
Uma vaga esporádica representa uma necessidade excepcional.
Exemplo:
Normalmente:
Toyohashi

Manpower: 6
Forklift: 1

Mas em determinado dia:
25/08/2026

Manpower: 10
Forklift: 2

A necessidade adicional deve ser tratada como esporádica.
A configuração fixa original não deve ser alterada apenas porque um determinado dia possui uma necessidade diferente.

## 5. Estrutura geral
O fluxo esperado é:

SEDE
   ↓
Configuração de vagas
   ↓
Operação da sede
   ↓
Vagas do dia
   ↓
Alocação
   ↓
Confirmação
   ↓
Pagamento

## 6. Configuração de vagas fixas
A configuração de vaga fixa deve possuir os seguintes dados conceituais:
- ID
- Sede_ID
- Tipo
- Quantidade_Padrao
- Ativa
- Data_Inicio
- Data_Fim

Exemplo
- ID: CV001
- Sede_ID: S001
- Tipo: MANPOWER
- Quantidade_Padrao: 6
- Ativa: SIM
- Data_Inicio: 2026-10-01
- Data_Fim: 2026-12-01

- ID: CV002
- Sede_ID: S001
- Tipo: FORKLIFT
- Quantidade_Padrao: 1
- Ativa: SIM
- Data_Inicio: 2026-10-01
- Data_Fim: 2026-12-01

## 7. Tipos de trabalho
Neste momento o sistema trabalha com dois tipos:
- MANPOWER
- FORKLIFT

O sistema deve utilizar valores padronizados.

Não criar variações como:
- Manpower
- manpower
- Man Power
- Ajudante
- AJUDANTE

quando representam o mesmo tipo.

O frontend deve utilizar os valores definidos pelo backend.

## 8. Status da configuração
Uma configuração fixa pode estar:
- ATIVA: Pode gerar vagas para os dias em que a sede possui operação.
- INATIVA: Não deve gerar novas vagas.

A configuração não deve ser apagada caso já tenha sido utilizada.

Preferir: Inativa
em vez de excluir o registro.

## 9. Período da configuração
Uma configuração fixa deve possuir:
- Data_Inicio
- Data_Fim

Isso permite controlar quando aquela configuração é válida.

Exemplo:
Toyohashi
Manpower
6

Data início:
01/08/2026

Data fim:
31/12/2026

Caso Data_Fim seja nula, a configuração pode permanecer válida indefinidamente enquanto estiver ativa.

## 10. Operação da sede
A existência de uma configuração fixa não significa necessariamente que haverá vaga todos os dias.

A sede pode operar somente em determinados dias.

Portanto, o sistema deve considerar a operação da sede antes de gerar as vagas.

Exemplo:
Toyohashi

Segunda: opera
Terça: opera
Quarta: opera
Quinta: opera
Sexta: opera
Sábado: não opera
Domingo: não opera
Uma configuração fixa de:
6 Manpower
1 Forklift

não deve gerar automaticamente vagas para sábado e domingo se a sede não operar nesses dias.

## 11. Vaga do dia
A vaga do dia representa a necessidade efetiva de uma determinada data.
Estrutura conceitual:
- ID
- Sede_ID
- Data
- Tipo
- Quantidade
- Origem
- Status
- Configuracao_Vaga_ID

## 12. Origem da vaga
A vaga deve identificar sua origem.
Valores:
- FIXA
- ESPORADICA

FIXA
A vaga foi criada a partir de uma configuração fixa.

ESPORADICA
A vaga foi criada especificamente para determinada data.

## 13. Configuração relacionada
Para vagas originadas de uma configuração fixa:
Configuracao_Vaga_ID

deve armazenar a configuração que originou a vaga.

Exemplo:
Vaga:
V001

Configuração:
CV001

Para uma vaga puramente esporádica:
Configuracao_Vaga_ID = NULL

## 14. Status da vaga
A vaga do dia deve possuir um status.
Estados principais:
- ABERTA
- COMPLETA
- CANCELADA
- ENCERRADA

ABERTA
Ainda existem posições disponíveis.

Exemplo:
Necessários: 6
Alocados: 4
Faltam: 2

Status: ABERTA

COMPLETA
Todas as posições foram preenchidas.

Necessários: 6
Alocados: 6
Faltam: 0

Status: COMPLETA

CANCELADA
A necessidade da vaga foi cancelada.
A vaga não deve receber novas alocações.

ENCERRADA
A operação daquela vaga foi concluída.
O conceito de ENCERRADA deve ser utilizado quando a vaga não estiver mais em processo de alocação/confirmação.

## 15. Quantidade da vaga
A quantidade representa o número de funcionários necessários.

Exemplo:
Tipo: MANPOWER
Quantidade: 6
Significa:
6 funcionários de MANPOWER

## 16. Quantidade alocada
A quantidade alocada deve ser calculada a partir das alocações válidas.

Exemplo:
Quantidade necessária: 6
Alocados: 4
Resultado:
Faltam: 2

O sistema não deve depender de um valor manual para determinar a quantidade alocada.

Sempre que possível:
Alocados = quantidade de alocações válidas relacionadas à vaga

## 17. Vaga completa
Uma vaga é considerada completa quando:
Quantidade alocada >= Quantidade necessária

Exemplo:
Necessários: 6
Alocados: 6

Status:
COMPLETA

O sistema deve impedir novas alocações quando a vaga estiver completa.

## 18. Vaga incompleta
Uma vaga está incompleta quando:
Quantidade alocada < Quantidade necessária

Exemplo:
Necessários: 6
Alocados: 4
Faltam: 2

A vaga permanece disponível para alocação.

## 19. Vaga esporádica
Uma vaga esporádica pode ser criada para uma data específica.

Exemplo:
Data: 25/08/2026
Sede: Toyohashi
Tipo: MANPOWER
Quantidade: 4
Origem: ESPORADICA

Essa vaga não altera a configuração fixa da sede.

## 20. Necessidade adicional em uma data
Quando uma sede possui uma necessidade maior que sua configuração normal, o sistema deve permitir registrar a necessidade adicional sem alterar permanentemente a configuração.

Exemplo:
Configuração:
Manpower: 6
Forklift: 1

Necessidade excepcional:
25/08/2026

Manpower: 10
Forklift: 2

A configuração continua:

Manpower: 6
Forklift: 1

A necessidade do dia pode ser:
Manpower: 10
Forklift: 2

## 21. Alteração excepcional
Caso a quantidade necessária para um dia específico seja diferente da configuração padrão, a alteração deve ser registrada somente na vaga daquele dia.

Não alterar Quantidade_Padrao, somente por causa de uma necessidade excepcional.

## 22. Exemplo completo
Configuração da sede:
Toyohashi

MANPOWER: 6
FORKLIFT: 1

Dia:
20/08/2026

Vagas geradas:
V001
Toyohashi
20/08/2026
MANPOWER
Quantidade: 6
Origem: FIXA
Status: ABERTA
V002
Toyohashi
20/08/2026
FORKLIFT
Quantidade: 1
Origem: FIXA
Status: ABERTA

## 23. Exemplo de necessidade esporádica
Configuração:
Toyohashi

MANPOWER: 6
FORKLIFT: 1

Necessidade excepcional em:
25/08/2026
A empresa solicita:
MANPOWER: 10
FORKLIFT: 2

O sistema deve registrar a necessidade daquele dia sem alterar a configuração padrão.

Resultado:
25/08/2026

MANPOWER
Necessários: 10

FORKLIFT
Necessários: 2

## 24. Cadastro através de Google Forms
O cadastro administrativo de sedes e demais informações continua sendo realizado através de Google Forms, conforme definido na arquitetura do sistema.

O frontend não deve criar sedes.

A configuração de vagas também deve respeitar o fluxo administrativo definido pelo projeto.

Caso a configuração de vagas seja cadastrada através de Google Forms/Google Sheets, o backend deverá apenas consultar e utilizar esses dados.

Não criar uma tela de cadastro manual no frontend sem autorização explícita.

## 25. Google Sheets
O Google Sheets continua sendo a fonte de dados definida pela arquitetura atual.
O fluxo deve permanecer:
Frontend
    ↓
Backend
    ↓
Google Sheets
O frontend nunca deve acessar diretamente o Google Sheets.

## 26. Google Sheets Service
O acesso ao Google Sheets deve continuar centralizado no:
GoogleSheetsService
Os módulos de negócio não devem realizar chamadas diretas à API do Google Sheets.

Exemplo:
VagasService
      ↓
GoogleSheetsService
      ↓
Google Sheets API

## 27. Regras de negócio
Regra 1 — Configuração fixa não é vaga do dia
Uma configuração fixa representa um padrão.
Uma vaga representa uma necessidade real de uma data.

Regra 2 — Alteração excepcional não altera o padrão
Uma necessidade diferente em uma determinada data não deve alterar a configuração fixa.

Regra 3 — Vagas fixas dependem da operação
Uma configuração fixa somente deve resultar em vaga quando a sede possuir operação naquela data.

Regra 4 — Não apagar configurações utilizadas
Configurações antigas devem ser desativadas.

Preferir:
ATIVA → INATIVA

em vez de:
DELETE

Regra 5 — Não apagar vagas com histórico
Se uma vaga já possuir alocações ou outras informações relacionadas, não deve ser apagada.

Utilizar:
Status = CANCELADA
quando necessário.

Regra 6 — Vaga completa não recebe novas alocações
Se:
Alocados >= Necessários
a vaga não pode receber novas alocações.

Regra 7 — Backend é a autoridade
Toda validação deve ocorrer no backend.
O frontend pode impedir visualmente ações inválidas, mas o backend deve validar novamente.

## 28. Segurança
O backend deve validar:
- Sede
- Sede existe
- Sede está ativa
- Usuário possui permissão para acessar a sede
- Configuração
- Configuração existe
- Configuração está ativa
- Configuração pertence à sede correta
- Data está dentro do período válido
- Vaga
- Vaga existe
- Vaga está ativa
- Vaga pertence à sede correta
- Data é válida
- Ainda existem posições disponíveis
- Nunca confiar em IDs enviados pelo frontend para determinar permissões.

## 29. API conceitual
A implementação deve seguir os padrões existentes no backend.

Buscar vagas de uma data
GET /vagas?data=2026-08-20

O backend deve retornar somente as vagas que o usuário possui permissão para visualizar.

Buscar vagas de uma sede
GET /vagas?sedeId=S001&data=2026-08-20

Buscar configuração de vagas

Endpoint conceitual:
GET /configuracoes-vagas?sedeId=S001

## 30. Estrutura do backend
O módulo deve seguir a arquitetura existente.
Estrutura esperada:
backend/
└── src/
    ├── vagas/
    │   ├── vagas.controller.ts
    │   ├── vagas.service.ts
    │   └── ...
    │
    ├── configuracoes-vagas/
    │   ├── configuracoes-vagas.controller.ts
    │   ├── configuracoes-vagas.service.ts
    │   └── ...
    │
    ├── sedes/
    └── common/
        └── google-sheets/
Não criar estruturas paralelas se já existir uma implementação equivalente no projeto.

## 31. Integração com alocação
A tela de alocação deve utilizar as vagas do dia.
Fluxo:
Vagas
    ↓
Alocação
Exemplo:
Toyohashi
20/08/2026

MANPOWER
Necessários: 6
Alocados: 4
Faltam: 2
O módulo de alocação não precisa saber se a vaga foi criada a partir de uma configuração fixa ou esporádica.
Essa informação pertence ao módulo de vagas.

## 32. Integração com confirmação
Após o dia de trabalho, o módulo de confirmação utilizará as alocações relacionadas às vagas.
Fluxo:
Vaga
    ↓
Alocação
    ↓
Confirmação
A vaga deve permanecer como registro da necessidade original.
A confirmação registra o que realmente aconteceu.

## 33. Integração com pagamentos
O módulo de pagamentos utilizará as informações provenientes das alocações e confirmações.
Fluxo:
Vaga
    ↓
Alocação
    ↓
Confirmação
    ↓
TRABALHOU
    ↓
Pagamento
A vaga não deve gerar pagamento diretamente.

## 34. Interface
Caso seja necessário desenvolver uma interface administrativa para gerenciamento das vagas, ela deve seguir o padrão visual existente no projeto.
A interface deve priorizar:
- Visualização das vagas por data
- Visualização por sede
- Tipo de trabalho
- Quantidade necessária
- Quantidade alocada
- Quantidade restante
- Status
- Origem da vaga

## 35. Exibição da vaga
Exemplo:
TOYOHASHI

20/08/2026

MANPOWER

Necessários: 6
Alocados: 4
Faltam: 2

Status: ABERTA
Origem: FIXA
Outra:
TOYOHASHI

25/08/2026

MANPOWER

Necessários: 10
Alocados: 7
Faltam: 3

Status: ABERTA
Origem: ESPORÁDICA

## 36. Dashboard
O Dashboard poderá utilizar as vagas para apresentar:
- Vagas hoje
- Vagas completas
- Vagas incompletas
- Total de posições
- Total de posições preenchidas
- Total de posições disponíveis

Exemplo:
Vagas hoje: 12
Completas: 8
Incompletas: 4

Necessários: 72
Alocados: 65
Disponíveis: 7

## 37. Estados de carregamento
Enquanto as vagas estiverem sendo carregadas:
Carregando vagas...

Durante uma operação:
Salvando...

Os botões envolvidos na operação devem ser desabilitados para evitar requisições duplicadas.

## 38. Estado sem dados
Caso não existam vagas:
Nenhuma vaga encontrada para esta data.

Caso não exista operação:
Nenhuma operação cadastrada para esta sede nesta data.

## 39. Estado de erro
Caso ocorra erro:
Não foi possível carregar as vagas.

[Tentar novamente]

## 40. Histórico
O sistema deve preservar informações importantes.

Não apagar:
- Configurações utilizadas
- Vagas que já tiveram alocação
- Vagas que já tiveram confirmação
- Informações relacionadas a pagamentos
- Sempre que possível, utilizar status para encerramento/cancelamento.

## 41. Alterações futuras
O módulo deve permitir futuras extensões, como:
- Diferentes quantidades por dia da semana
- Diferentes configurações por período
- Horários de início
- Horários de término
- Tipos adicionais de funcionários
- Múltiplas operações na mesma sede
- Necessidades adicionais
- Vagas emergenciais

Essas funcionalidades não devem ser implementadas agora sem necessidade.

## 42. Escopo atual
O desenvolvimento inicial deve contemplar:
- Configuração de vagas fixas
- Vagas esporádicas
- Vagas por data
- Vagas por sede
- Tipo de trabalho
- Quantidade necessária
- Quantidade alocada
- Quantidade restante
- Status da vaga
- Origem da vaga
- Integração com alocação
- Integração com confirmação
- Integração futura com pagamentos
Não implementar funcionalidades não descritas neste documento sem autorização.

## 43. Critérios de aceite
A funcionalidade será considerada concluída quando:

- Sistema diferencia configuração fixa de vaga do dia.
- Sistema diferencia vaga fixa de vaga esporádica.
- Sistema permite representar necessidades fixas de uma sede.
- Sistema permite representar necessidades específicas de uma data.
- Alterações esporádicas não alteram a configuração fixa.
- Configurações podem ser ativadas e desativadas.
- Configurações possuem período de validade.
- Vagas possuem data.
- Vagas possuem sede.
- Vagas possuem tipo de trabalho.
- Vagas possuem quantidade necessária.
- Vagas possuem origem.
- Vagas possuem status.
- Sistema calcula quantidade alocada.
- Sistema calcula quantidade restante.
- Vaga completa não aceita novas alocações.
- Vaga cancelada não aceita novas alocações.
- Vagas com histórico não são apagadas.
- Configurações com histórico não são apagadas.
- Backend valida todas as regras.
- Frontend não acessa diretamente o Google Sheets.
- Sistema mantém integração com o GoogleSheetsService.
- Tela de alocação consegue utilizar as vagas.
- Módulo de confirmação consegue utilizar as vagas.
- Estrutura permite integração com pagamentos.
- Não são introduzidas funcionalidades fora do escopo sem autorização.