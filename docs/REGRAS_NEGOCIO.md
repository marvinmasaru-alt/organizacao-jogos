# Regras de Negócio — Sistema de Gestão de Vagas

## 1. Objetivo do sistema

O sistema tem como objetivo controlar a distribuição de funcionários entre vagas e sedes, permitindo acompanhar:

- Funcionários
- Responsáveis
- Sedes
- Vagas
- Alocações
- Pagamentos
- Valores recebidos
- Valores pagos
- Comissões
- Pendências
- Necessidades de substituição

O sistema web será utilizado principalmente para **visualização, acompanhamento e alocação de funcionários**.

Os cadastros administrativos são realizados através de **Google Forms**.

---

# 2. Fontes de dados

## 2.1 Google Forms

Os seguintes dados são cadastrados através de Google Forms:

- Funcionários
- Responsáveis
- Sedes
- Outros cadastros administrativos definidos posteriormente

O site não deve criar esses registros diretamente.

---

## 2.2 Google Sheets

O Google Sheets funciona como fonte de dados do sistema.

Os dados podem incluir:

- Funcionários
- Responsáveis
- Sedes
- Vagas
- Alocações
- Pagamentos

O backend é responsável pela leitura e alteração dos dados quando permitido.

---

# 3. Usuários e permissões

O sistema possui diferentes níveis de acesso.

## 3.1 Administrador

O administrador possui acesso administrativo ao sistema.

Responsabilidades:

- Gerenciar e aprovar funcionários
- Consultar informações gerais
- Acompanhar vagas
- Acompanhar alocações
- Acompanhar pagamentos
- Administrar configurações permitidas pelo sistema

O administrador possui visão geral do sistema.

---

## 3.2 Responsável

O responsável é o usuário operacional que realiza as alocações.

Um responsável pode ser responsável por uma ou mais sedes.

O responsável deve conseguir:

- Visualizar suas vagas
- Visualizar funcionários permitidos
- Alocar funcionários
- Trocar funcionários
- Cancelar alocações
- Visualizar pagamentos pendentes
- Registrar pagamentos
- Visualizar valores a receber
- Acompanhar suas pendências

O responsável não deve conseguir acessar dados administrativos que não estejam dentro de suas permissões.

---

# 4. Funcionários

## 4.1 Cadastro

O funcionário é cadastrado através de Google Forms.

Os dados previstos incluem:

- Nome completo
- Telefone
- Zairyū Card — frente
- Zairyū Card — verso
- Província
- Código postal
- Responsável
- Tipo de trabalho
- Status

---

## 4.2 Tipos de trabalho

O sistema possui inicialmente dois tipos de trabalho:

- **Manpower**
- **Empilhadeira / Forklift**

Esses tipos devem ser tratados como valores controlados pelo sistema.

---

## 4.3 Responsável pelo funcionário

Cada funcionário possui um responsável associado.

O responsável que cadastrou o funcionário é o responsável por ele para fins de seleção e alocação, de acordo com as permissões do sistema.

---

## 4.4 Visibilidade dos funcionários

Um responsável **não pode visualizar todos os funcionários do sistema**.

Ele deve visualizar somente os funcionários aos quais possui acesso.

Regra principal:

```text
Usuário
   ↓
Responsável
   ↓
Funcionários permitidos
Um responsável não pode acessar funcionários pertencentes a outro responsável apenas alterando parâmetros da requisição.
Essa validação deve ocorrer no backend.
5. Responsáveis
Os responsáveis são cadastrados através de Google Forms.
Um responsável pode estar associado a uma ou mais sedes.
Exemplo:
Paulo
├── Toyohashi
└── Outra sede

André
└── Komaki
A relação entre responsável e sede deve ser utilizada para determinar quais operações ele pode realizar.
6. Sedes
As sedes são cadastradas através de Google Forms.
Uma sede possui, conceitualmente:
ID
Nome
Tipo
Responsável
Localização
Status
Um responsável pode administrar uma ou mais sedes.
7. Vagas
Uma vaga representa uma necessidade de funcionários em determinada sede e data.
Uma vaga possui, conceitualmente:
ID
Data
Sede
Tipo de trabalho
Quantidade necessária
Status
7.1 Quantidade da vaga
A quantidade representa o número de funcionários necessários.
Exemplo:
Vaga:
Toyohashi
20/08
Manpower
10 funcionários
Essa vaga precisa de 10 alocações ativas.
7.2 Ocupação
A ocupação de uma vaga é calculada com base nas alocações ativas.
Exemplo:
Quantidade necessária: 10
Alocações ativas: 8

Ocupação: 8 / 10
Se:
Alocações ativas < quantidade necessária
a vaga possui necessidade de funcionários.
7.3 Vaga completa
Uma vaga é considerada completa quando:
Alocações ativas >= quantidade necessária
8. Alocações
A alocação representa a associação entre:
Vaga
Funcionário
Responsável
Uma vaga pode possuir várias alocações.
Exemplo:
Vaga — Toyohashi — 10 ajudantes

├── João
├── Pedro
├── Carlos
├── Marcos
└── ...
8.1 Criação de uma alocação
Para realizar uma alocação, o sistema deve validar:
O usuário está autenticado.
O usuário possui permissão para realizar a operação.
O usuário é responsável pela sede/vaga.
O funcionário está dentro dos funcionários permitidos ao responsável.
O tipo de trabalho do funcionário é compatível com a vaga.
O funcionário não possui outra alocação conflitante.
A vaga ainda permite novas alocações.
Somente após todas as validações a alocação deve ser criada.
9. Status das alocações
As alocações devem possuir status.
Estados possíveis incluem:
ATIVA
CANCELADA
Novos estados podem ser adicionados futuramente se necessário.
10. Cancelamento de alocação
Uma alocação cancelada não deve ser simplesmente apagada.
Não fazer:
DELETE alocação
Preferir:
status = CANCELADA
O histórico deve ser preservado sempre que possível.
Isso permite identificar posteriormente:
Quem estava alocado
Quando foi alocado
Quando foi cancelado
Quem realizou o cancelamento
Qual vaga estava envolvida
11. Troca de funcionário
A troca de funcionário deve preservar o histórico.
Exemplo:
João
↓
Alocação cancelada

Pedro
↓
Nova alocação criada
Não substituir simplesmente o funcionarioId da alocação existente.
O sistema deve manter o histórico da operação.
12. Substituição urgente
Quando uma vaga perde uma alocação e fica abaixo da quantidade necessária, o sistema deve identificar a necessidade de substituição.
Exemplo:
Necessário: 10
Ativos: 9
Resultado:
NECESSITA DE UMA SUBSTITUIÇÃO URGENTE
O dashboard não precisa necessariamente identificar publicamente qual funcionário deixou a vaga.
A informação detalhada deve estar disponível somente para usuários autorizados.
13. Conflito de alocação
Um funcionário não deve ser alocado em duas vagas incompatíveis.
Antes de criar uma alocação, o backend deve verificar se o funcionário já possui uma alocação ativa conflitante para a mesma data/período.
Caso exista conflito, a operação deve ser recusada.
14. Compatibilidade de função
O tipo de trabalho do funcionário deve ser compatível com o tipo da vaga.
Exemplo:
Funcionário:
MANPOWER

Vaga:
EMPILHADEIRA
Resultado:
❌ Alocação não permitida
Outro exemplo:
Funcionário:
EMPILHADEIRA

Vaga:
EMPILHADEIRA
Resultado:
✅ Alocação permitida
15. Pagamentos
Os pagamentos são derivados das alocações realizadas.
O sistema precisa conseguir relacionar:
Vaga
 ↓
Alocação
 ↓
Funcionário
 ↓
Tipo de trabalho
 ↓
Valor
 ↓
Pagamento
16. Valores dos funcionários
Para sedes externas, os valores definidos inicialmente são:
Tipo	Valor pago ao funcionário
Manpower	¥12.000
Empilhadeira	¥15.000


Esses valores devem ser tratados como regras de negócio e não devem ser alterados diretamente pelo frontend.
17. Valores do responsável
Os valores definidos inicialmente para o responsável são:
Tipo	Valor do responsável
Manpower	¥16.000
Empilhadeira	¥18.000


O responsável possui um valor fixo por funcionário/tipo de trabalho conforme a regra definida.
18. Comissão
A comissão do responsável é calculada pela diferença entre:
Valor recebido pelo responsável
-
Valor pago ao funcionário
=
Comissão
Manpower
Recebido: ¥16.000
Pago:     ¥12.000
------------------
Comissão: ¥4.000
Empilhadeira
Recebido: ¥18.000
Pago:     ¥15.000
------------------
Comissão: ¥3.000
19. Pagamento ao funcionário
O responsável pode definir quanto efetivamente pagará ao funcionário dentro das regras permitidas pelo sistema.
Caso o responsável pague um valor superior ao valor previsto, a diferença deve ser identificada.
Exemplo:
Valor previsto:
¥12.000

Valor pago:
¥13.000

Diferença:
¥1.000
O sistema deve permitir identificar que o responsável realizou um pagamento superior ao valor de referência.
20. Pagamentos pendentes
Um pagamento deve ser considerado pendente quando existe uma obrigação de pagamento ainda não registrada como concluída.
Exemplo:
Funcionário: João
Função: Manpower
Valor: ¥12.000
Status: PENDENTE
O sistema deve permitir visualizar os pagamentos pendentes.
21. Pagamentos realizados
Quando o responsável realizar o pagamento, o sistema deve registrar:
Funcionário
Alocação
Valor
Data do pagamento
Responsável
Status
O pagamento não deve ser simplesmente removido da lista de pendências.
Seu status deve ser alterado para indicar que foi realizado.
22. Prazo de pagamento
O responsável possui prazo de até uma semana para realizar o pagamento ao funcionário.
O sistema deve calcular o prazo a partir da data definida pela regra de pagamento.
Os pagamentos podem ser classificados como:
PENDENTE
PRÓXIMO DO VENCIMENTO
ATRASADO
PAGO
23. Dashboard
O Dashboard é principalmente uma interface de acompanhamento.
Deve apresentar informações como:
Vagas do dia
Total de vagas
Vagas completas
Vagas incompletas
Necessidades de substituição
Ocupação
Quantidade necessária
Quantidade alocada
Percentual de ocupação
Pendências
Vagas incompletas
Substituições urgentes
Pagamentos pendentes
Pagamentos próximos do vencimento
Pagamentos atrasados
Pagamentos
Total a pagar
Total pago
Total a receber
Comissões
Indicadores
Os indicadores podem ser expandidos conforme o sistema evoluir.
24. Segurança
24.1 Backend como autoridade
Toda regra de negócio importante deve ser validada pelo backend.
Nunca confiar exclusivamente em validações feitas pelo frontend.
24.2 Identidade do usuário
O usuário é identificado através do Google OAuth.
O sistema utiliza essa identidade para determinar o usuário cadastrado e suas permissões.
24.3 Permissões
O usuário não pode obter acesso a dados simplesmente alterando:
IDs
parâmetros
URLs
IDs de funcionários
IDs de vagas
IDs de responsáveis
O backend deve validar se o usuário possui autorização para acessar ou modificar o recurso solicitado.
25. Histórico e auditoria
Operações relevantes devem preservar histórico sempre que possível.
Principalmente:
Criação de alocação
Cancelamento de alocação
Troca de funcionário
Pagamento
Cancelamento de pagamento
Alterações relevantes
O objetivo é permitir identificar posteriormente o que aconteceu no sistema.
26. Regras de implementação
Ao implementar novas funcionalidades:
Não modificar regras de negócio existentes sem autorização.
Não criar funcionalidades administrativas que já são realizadas através do Google Forms.
Não duplicar dados sem necessidade.
Não apagar registros que precisem de histórico.
Validar regras importantes no backend.
Não confiar em dados de permissão enviados pelo frontend.
Não permitir acesso de um responsável aos dados de outro responsável.
Não permitir alocações incompatíveis.
Não permitir alocações conflitantes.
Preservar histórico de alterações importantes.
Fazer alterações pequenas e isoladas.
Testar as regras de negócio após cada implementação.
27. Fases de implementação
Fase 0 — Fundação

Autenticação Google

Sessão/JWT

Backend NestJS

Integração com Google Sheets
Status: concluída.
Fase 1 — Dashboard

Vagas do dia

Ocupação

Pendências

Pagamentos

Indicadores
Fase 2 — Alocação

Responsável visualiza seus funcionários

Alocar funcionário

Trocar funcionário

Cancelar alocação

Substituição urgente

Validação de conflito

Validação de compatibilidade de função
Fase 3 — Pagamentos

Pagamentos pendentes

Pagamentos realizados

Valores

Comissão

Controle de prazo

Identificação de pagamentos atrasados

Histórico de pagamentos
28. Princípio geral do sistema
O sistema deve seguir o seguinte princípio:
Google Forms cadastra, Google Sheets armazena, o Backend valida e aplica as regras, e o site permite visualizar e operar o processo de alocação e pagamentos.

Nenhuma camada deve assumir responsabilidades que pertencem a outra camada.
```










gere um markdown contendo tudo












Claro. Abaixo está um Markdown completo, juntando Arquitetura + Regras de Negócio + Estrutura do projeto + Fases de implementação, já organizado para você colocar como documentação principal do Claude Code.
Sugestão de arquivo:
docs/SPECIFICACAO_DO_SISTEMA.md
# Sistema de Gestão de Vagas

> Documento central de arquitetura, regras de negócio e especificação do sistema.

---

# 1. Visão Geral

O sistema é uma aplicação web para gestão de:

- Funcionários
- Responsáveis
- Sedes
- Vagas
- Alocações
- Pagamentos
- Comissões
- Pendências
- Substituições

O objetivo principal é permitir que os responsáveis acompanhem suas vagas e realizem a alocação dos funcionários disponíveis.

A arquitetura utiliza:

1. Google Forms
2. Google Sheets
3. Backend NestJS
4. Frontend Web

---

# 2. Princípio Geral

O sistema deve seguir o seguinte princípio:

> **Google Forms cadastra, Google Sheets armazena, o Backend valida e aplica as regras, e o site permite visualizar e operar o processo de alocação e pagamentos.**

Cada camada possui uma responsabilidade específica.

```text
Google Forms
     ↓
Google Sheets
     ↓
Backend NestJS
     ↓
Frontend Web
3. Arquitetura
3.1 Componentes
Google Forms
Responsável pela entrada e cadastro de dados administrativos.
Google Sheets
Responsável pelo armazenamento dos dados.
Backend NestJS
Responsável por:
API
Autenticação
Autorização
Regras de negócio
Validação
Segurança
Integração com Google Sheets
Alocações
Pagamentos
Indicadores
Frontend Web
Responsável por:
Dashboard
Visualização das vagas
Alocação
Troca de funcionários
Cancelamentos
Pagamentos
Indicadores
Feedback visual ao usuário
4. Fluxo Geral
                    GOOGLE FORMS
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
    Funcionários    Responsáveis      Sedes
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                  GOOGLE SHEETS
                         │
                         ▼
                  BACKEND NESTJS
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
        Dashboard    Alocação    Pagamentos
             │           │           │
             └───────────┼───────────┘
                         ▼
                    FRONTEND WEB
5. Fonte dos Dados
5.1 Google Forms
Os seguintes dados são cadastrados através de Google Forms:
Funcionários
Responsáveis
Sedes
Outros dados administrativos definidos posteriormente
O frontend não deve duplicar essas funcionalidades.
Regra
Não criar telas no site para cadastrar funcionários, responsáveis ou sedes sem autorização explícita.
6. Google Sheets
O Google Sheets funciona como fonte de dados do sistema.
As planilhas podem armazenar:
Funcionários
Responsáveis
Sedes
Vagas
Alocações
Pagamentos
O backend é responsável pelo acesso às planilhas.
O frontend nunca deve acessar diretamente a API do Google Sheets.
Fluxo obrigatório:
Frontend
   ↓
Backend
   ↓
Google Sheets
7. Backend
O backend utiliza NestJS.
Responsabilidades
Autenticação
Gerenciamento de sessão
Autorização
Validação dos dados
Regras de negócio
Integração com Google Sheets
Processamento de alocações
Processamento de pagamentos
Cálculo de indicadores
Segurança
O frontend nunca deve ser considerado uma camada confiável para aplicação das regras de negócio.
Toda regra importante deve ser validada no backend.
8. Estrutura do Backend
backend/
└── src/
    ├── auth/
    ├── dashboard/
    ├── vagas/
    ├── alocacoes/
    ├── pagamentos/
    ├── funcionarios/
    ├── responsaveis/
    ├── sedes/
    └── common/
        └── google-sheets/
9. Módulos
9.1 Auth
Responsável por:
Login
Google OAuth
Sessão
JWT
Identificação do usuário
Controle inicial de acesso
9.2 Dashboard
Responsável por fornecer dados para:
Vagas do dia
Ocupação
Pendências
Pagamentos
Indicadores
O Dashboard é predominantemente de leitura.
9.3 Funcionários
Responsável por consultar funcionários provenientes dos Forms/Sheets.
Não deve criar funcionários através do frontend.
9.4 Responsáveis
Responsável por consultar os responsáveis provenientes dos Forms/Sheets.
Não deve criar responsáveis através do frontend.
9.5 Sedes
Responsável por consultar as sedes provenientes dos Forms/Sheets.
Não deve criar sedes através do frontend.
9.6 Vagas
Responsável por consultar:
Vagas
Quantidades
Datas
Tipos
Estados
Ocupação
9.7 Alocações
Responsável por:
Alocar funcionário
Trocar funcionário
Cancelar alocação
Identificar necessidade de substituição
9.8 Pagamentos
Responsável por:
Pagamentos pendentes
Pagamentos realizados
Valores
Comissão
Prazo
Atrasos
10. Google Sheets Service
O acesso ao Google Sheets deve ser centralizado.
Os módulos de negócio não devem implementar diretamente chamadas à API.
Exemplo:
FuncionariosService
        ↓
GoogleSheetsService
        ↓
Google Sheets API
Outro exemplo:
AlocacoesService
        ↓
GoogleSheetsService
        ↓
Google Sheets API
Isso evita duplicação e facilita uma futura migração para outro banco de dados.
11. Frontend
O frontend é responsável por:
Apresentar informações
Navegação
Dashboard
Vagas
Alocações
Pagamentos
Mensagens de erro
Mensagens de sucesso
O frontend não deve implementar sozinho regras de segurança.
Esconder um funcionário na interface não é suficiente para garantir autorização.
O backend deve validar todas as operações.
12. Autenticação
A autenticação utiliza Google OAuth.
Fluxo:
Usuário
   ↓
Google OAuth
   ↓
Backend
   ↓
Identificação
   ↓
Verificação
   ↓
Sessão autenticada
O Google confirma a identidade.
O sistema determina quais recursos o usuário pode acessar.
13. Autorização
Autenticação e autorização são diferentes.
Autenticação
Quem é o usuário?

Autorização
O que o usuário pode fazer?

O backend deve aplicar todas as permissões.
Um responsável não pode acessar funcionários de outro responsável simplesmente alterando parâmetros de uma requisição.
14. Usuários
14.1 Administrador
O administrador possui visão geral do sistema.
Pode:
Consultar funcionários
Consultar responsáveis
Consultar sedes
Consultar vagas
Consultar alocações
Consultar pagamentos
Acompanhar indicadores
Realizar operações administrativas autorizadas
14.2 Responsável
O responsável é o usuário operacional.
Pode:
Visualizar suas vagas
Visualizar seus funcionários permitidos
Alocar funcionários
Trocar funcionários
Cancelar alocações
Visualizar pagamentos
Registrar pagamentos
Acompanhar pendências
Acompanhar seus valores e comissões
Não pode acessar dados fora de suas permissões.
15. Funcionários
15.1 Cadastro
O cadastro é realizado através do Google Forms.
Dados previstos:
Nome completo
Telefone
Zairyū Card — frente
Zairyū Card — verso
Província
Código postal
Responsável
Tipo de trabalho
Status
16. Tipos de Trabalho
O sistema possui inicialmente dois tipos:
MANPOWER
EMPILHADEIRA
Esses tipos devem ser tratados como valores controlados.
17. Visibilidade dos Funcionários
Cada responsável possui acesso somente aos funcionários permitidos para ele.
Fluxo:
Usuário autenticado
        ↓
Responsável
        ↓
Funcionários permitidos
        ↓
Alocação
O responsável não pode visualizar funcionários de outro responsável.
Essa validação deve ocorrer no backend.
O frontend não deve receber dados que o usuário não tem autorização para visualizar.
18. Responsáveis
Responsáveis são cadastrados via Google Forms.
Um responsável pode administrar uma ou mais sedes.
Exemplo:
Paulo
├── Toyohashi
└── Outra sede

André
└── Komaki
A relação entre responsável e sede determina quais operações ele pode realizar.
19. Sedes
As sedes são cadastradas via Google Forms.
Uma sede possui conceitualmente:
ID
Nome
Tipo
Responsável
Localização
Status
20. Vagas
Uma vaga representa uma necessidade de funcionários em determinada sede e data.
Dados conceituais:
ID
Data
Sede
Tipo de trabalho
Quantidade necessária
Status
21. Quantidade de Vagas
Exemplo:
Sede: Toyohashi
Data: 20/08
Função: Manpower
Quantidade: 10
A vaga necessita de 10 alocações ativas.
22. Ocupação
A ocupação é calculada pelas alocações ativas.
Exemplo:
Necessário: 10
Alocados: 8

Ocupação: 8 / 10
Percentual: 80%
23. Vaga Completa
Uma vaga é considerada completa quando:
Alocações ativas >= quantidade necessária
24. Alocação
Uma alocação representa a associação entre:
Vaga
Funcionário
Responsável
Exemplo:
Vaga — Toyohashi — 10 ajudantes

├── João
├── Pedro
├── Carlos
└── Marcos
Uma alocação deve possuir informações suficientes para identificar:
Vaga
Funcionário
Responsável
Status
Data
Histórico
25. Criação de Alocação
Antes de criar uma alocação, o backend deve validar:
Usuário autenticado.
Usuário autorizado.
Usuário responsável pela vaga/sede.
Funcionário permitido para o responsável.
Tipo de trabalho compatível.
Funcionário sem conflito de horário/data.
Vaga disponível para alocação.
Somente após todas as validações a alocação pode ser criada.
26. Status da Alocação
Estados iniciais:
ATIVA
CANCELADA
Novos estados podem ser adicionados futuramente.
27. Cancelamento
Alocações canceladas não devem ser apagadas.
Não fazer
DELETE alocação
Fazer
status = CANCELADA
O histórico deve ser preservado.
Isso permite identificar:
Quem estava alocado
Quando foi alocado
Quando foi cancelado
Quem cancelou
Qual vaga estava envolvida
28. Troca de Funcionário
Uma troca deve preservar o histórico.
Exemplo:
João
↓
Alocação CANCELADA

Pedro
↓
Nova alocação ATIVA
Não alterar simplesmente o funcionário da alocação antiga.
29. Substituição Urgente
Se uma vaga ficar abaixo da quantidade necessária:
Necessário: 10
Ativos: 9
O sistema deve indicar:
🔴 NECESSITA DE UMA SUBSTITUIÇÃO URGENTE
O Dashboard pode ocultar detalhes do funcionário que saiu.
Usuários autorizados podem consultar os detalhes.
30. Conflito de Alocação
Um funcionário não pode possuir duas alocações incompatíveis para a mesma data/período.
Antes da alocação, o backend deve verificar conflitos.
Caso exista conflito:
❌ Alocação não permitida
31. Compatibilidade de Função
O tipo de funcionário deve ser compatível com o tipo da vaga.
Exemplo inválido:
Funcionário: MANPOWER
Vaga: EMPILHADEIRA
Resultado:
❌ Alocação não permitida
Exemplo válido:
Funcionário: EMPILHADEIRA
Vaga: EMPILHADEIRA
Resultado:
✅ Alocação permitida
32. Pagamentos
Pagamentos são derivados das alocações.
Fluxo:
Vaga
 ↓
Alocação
 ↓
Funcionário
 ↓
Tipo de trabalho
 ↓
Valor
 ↓
Pagamento
O sistema deve conseguir identificar:
Quem trabalhou
Em qual vaga
Qual função exerceu
Qual responsável realizou a alocação
Quanto deveria receber
Quanto foi pago
Quando foi pago
Se está atrasado
33. Valores dos Funcionários
Para sedes externas:
Tipo	Valor
Manpower	¥12.000
Empilhadeira	¥15.000


Esses valores são regras de negócio.
Não devem ser alterados diretamente pelo frontend.
34. Valores do Responsável
Valores definidos:
Tipo	Valor
Manpower	¥16.000
Empilhadeira	¥18.000


35. Comissão
A comissão é calculada:
Valor recebido pelo responsável
-
Valor pago ao funcionário
=
Comissão
Manpower
Recebido: ¥16.000
Pago:     ¥12.000
Comissão: ¥4.000
Empilhadeira
Recebido: ¥18.000
Pago:     ¥15.000
Comissão: ¥3.000
36. Pagamento Extra
O responsável pode eventualmente pagar ao funcionário um valor superior ao valor padrão.
Exemplo:
Valor padrão: ¥12.000
Valor pago:   ¥13.000
Diferença:    ¥1.000
O sistema deve registrar e identificar essa diferença.
37. Pagamentos Pendentes
Um pagamento é pendente quando existe uma obrigação de pagamento ainda não registrada como concluída.
Exemplo:
Funcionário: João
Função: Manpower
Valor: ¥12.000
Status: PENDENTE
38. Pagamentos Realizados
Quando o pagamento for realizado, registrar:
Funcionário
Alocação
Valor
Data
Responsável
Status
O registro não deve ser apagado da lista histórica.
39. Prazo de Pagamento
O responsável possui prazo de até uma semana para realizar o pagamento.
O sistema deve calcular o vencimento.
Estados possíveis:
PENDENTE
PROXIMO_DO_VENCIMENTO
ATRASADO
PAGO
40. Dashboard
O Dashboard deve apresentar:
Vagas do dia
Total
Completas
Incompletas
Substituições urgentes
Ocupação
Quantidade necessária
Quantidade alocada
Percentual
Pendências
Vagas incompletas
Substituições urgentes
Pagamentos pendentes
Pagamentos próximos do vencimento
Pagamentos atrasados
Pagamentos
Total a pagar
Total pago
Total a receber
Comissão
Indicadores
Indicadores podem ser adicionados conforme o sistema evoluir.
41. Histórico e Auditoria
Operações importantes devem preservar histórico.
Principalmente:
Criação de alocação
Cancelamento de alocação
Troca de funcionário
Pagamento
Cancelamento de pagamento
Alterações relevantes
O sistema deve permitir identificar posteriormente o que aconteceu.
42. Segurança
Regra 1 — Backend é a autoridade
Toda regra importante deve ser validada no backend.
Regra 2 — Não confiar no frontend
O frontend pode enviar dados inválidos ou manipulados.
O backend deve validar tudo.
Regra 3 — IDs não garantem autorização
Não confiar em:
ID de funcionário
ID de vaga
ID de sede
ID de responsável
IDs enviados pelo frontend
O backend deve verificar a autorização real.
Regra 4 — Isolamento entre responsáveis
Um responsável não pode acessar dados de outro responsável.
Isso deve ser validado no backend.
43. Regras de Arquitetura
Regra 1 — Backend é a autoridade
Toda regra importante deve ser validada no backend.
Regra 2 — Frontend não acessa Google Sheets
Sempre:
Frontend → Backend → Google Sheets
Regra 3 — Não duplicar cadastros
Funcionários, responsáveis e sedes são cadastrados através dos Google Forms.
Regra 4 — Não apagar histórico importante
Operações como cancelamento devem preservar histórico.
Regra 5 — Não duplicar lógica
O acesso ao Google Sheets deve ser centralizado.
Regra 6 — Alterações pequenas
Ao implementar uma funcionalidade, modificar somente os módulos necessários.
Regra 7 — Segurança no backend
Nunca confiar em IDs ou permissões enviados pelo frontend.
44. Princípios para Implementação com Claude Code
Ao implementar qualquer funcionalidade, o Claude Code deve:
Ler este documento antes de modificar o sistema.
Consultar docs/ARQUITETURA.md.
Verificar a estrutura atual do projeto antes de criar novos arquivos.
Reutilizar serviços existentes quando possível.
Evitar duplicação de lógica.
Não alterar regras de negócio sem autorização explícita.
Não criar funcionalidades administrativas que pertencem aos Google Forms.
Implementar validações no backend.
Não confiar em validações exclusivamente feitas pelo frontend.
Preservar histórico de operações importantes.
Fazer alterações pequenas e isoladas.
Testar as funcionalidades implementadas.
Informar quais arquivos foram alterados.
Informar quais regras de negócio foram implementadas.
Informar qualquer decisão ou premissa que não esteja definida neste documento.
45. Fluxo de Desenvolvimento
Para cada nova funcionalidade:
1. Ler documentação
       ↓
2. Entender regra de negócio
       ↓
3. Analisar código existente
       ↓
4. Definir implementação
       ↓
5. Implementar Backend
       ↓
6. Implementar Frontend
       ↓
7. Testar regras
       ↓
8. Corrigir problemas
       ↓
9. Documentar alterações
46. Fases de Implementação
Fase 0 — Fundação

Autenticação Google

Sessão/JWT

Backend NestJS

Integração Google Sheets
Status: concluída.
Fase 1 — Dashboard

Vagas do dia

Ocupação

Pendências

Pagamentos

Indicadores
Fase 2 — Alocação

Responsável visualiza seus funcionários

Alocar funcionário

Trocar funcionário

Cancelar alocação

Substituição urgente

Validação de conflito

Validação de compatibilidade de função

Preservação de histórico
Fase 3 — Pagamentos

Pagamentos pendentes

Pagamentos realizados

Valores

Comissão

Controle de prazo

Pagamentos atrasados

Histórico de pagamentos
47. Estado Atual
A Fundação está concluída.
Atualmente o sistema possui:
Autenticação Google
JWT
Backend NestJS
Integração com Google Sheets
A próxima etapa de desenvolvimento é:
FASE 1 — Dashboard

Após a conclusão do Dashboard, o foco será:
FASE 2 — Alocação

E posteriormente:
FASE 3 — Pagamentos

48. Regra Fundamental
Não implementar funcionalidades com base em suposições quando uma regra de negócio não estiver definida.

Quando uma implementação exigir uma decisão que não esteja documentada:
Identificar a decisão necessária.
Informar a dúvida.
Propor uma solução.
Aguardar definição antes de transformar a decisão em regra permanente.
A documentação deve ser atualizada quando uma nova regra de negócio for oficialmente definida.