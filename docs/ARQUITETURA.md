Arquitetura do Sistema de Gestão de Vagas
# Visão geral
O sistema é uma aplicação web para gestão de funcionários, vagas, alocações e pagamentos.

A arquitetura é baseada em quatro componentes principais:

- Google Forms — entrada e cadastro de dados.
- Google Sheets — armazenamento e fonte principal dos dados cadastrais e operacionais.
- Backend NestJS — API, autenticação, regras de negócio, permissões e integração com Google Sheets.
- Frontend Web — interface utilizada pelos responsáveis para visualizar informações e realizar alocações.

O sistema não possui cadastro manual de funcionários, responsáveis ou sedes pelo frontend. Esses dados são alimentados através de Google Forms.

A única operação principal de alteração realizada diretamente pelo site é a alocação de funcionários nas vagas.

## 2. Fluxo geral dos dados
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

## 3. Responsabilidade de cada componente
### 3.1 Google Forms
Google Forms é utilizado como mecanismo oficial de entrada de dados administrativos.

Os seguintes dados são cadastrados através dos Forms:
- Funcionários
- Responsáveis
- Sedes

Outros dados administrativos que forem definidos posteriormente
O frontend não deve duplicar essas funcionalidades.

Não criar telas no site para cadastrar funcionários, responsáveis ou sedes sem autorização explícita.

### 3.2 Google Sheets
Google Sheets funciona como a fonte de dados do sistema.
As planilhas armazenam informações como:
- funcionários;
- responsáveis;
- sedes;
- vagas;
- alocações;
- pagamentos.

O backend é responsável por acessar as planilhas.

O frontend nunca deve acessar diretamente a API do Google Sheets.

O fluxo obrigatório é:

Frontend
   ↓
Backend
   ↓
Google Sheets
### 4. Backend
O backend utiliza NestJS.
Responsabilidades do backend:
autenticação;
gerenciamento de sessão;
autorização;
validação dos dados;
aplicação das regras de negócio;
acesso ao Google Sheets;
processamento de alocações;
processamento de pagamentos;
cálculo de indicadores;
proteção dos dados.
O frontend nunca deve ser considerado uma camada confiável para aplicação das regras de negócio.
Toda regra importante deve ser validada no backend.
5. Estrutura do backend
A estrutura esperada é:
backend/
├── src/
│   ├── auth/
│   ├── dashboard/
│   ├── vagas/
│   ├── alocacoes/
│   ├── pagamentos/
│   ├── funcionarios/
│   ├── responsaveis/
│   ├── sedes/
│   └── common/
│       └── google-sheets/
Auth
Responsável por:
login;
autenticação Google;
criação da sessão;
JWT;
identificação do usuário;
controle inicial de acesso.
Dashboard
Responsável por fornecer os dados necessários para:
vagas do dia;
ocupação;
pendências;
pagamentos;
indicadores.
O Dashboard deve ser predominantemente de leitura.
Funcionários
Responsável por consultar funcionários provenientes dos Google Forms/Sheets.
Não deve criar funcionários através do frontend.
Responsáveis
Responsável por consultar os responsáveis provenientes dos Google Forms/Sheets.
Não deve criar responsáveis através do frontend.
Sedes
Responsável por consultar as sedes provenientes dos Google Forms/Sheets.
Não deve criar sedes através do frontend.
Vagas
Responsável pela consulta das vagas e seus estados.
Alocações
Responsável pelas operações realizadas no site:
alocar funcionário;
trocar funcionário;
cancelar alocação;
identificar necessidade de substituição.
Pagamentos
Responsável por:
pagamentos pendentes;
pagamentos realizados;
valores;
comissão;
controle de prazo.
6. Google Sheets Service
O acesso ao Google Sheets deve ser centralizado.
Os módulos de negócio não devem implementar diretamente chamadas à API do Google Sheets.
Exemplo:
FuncionariosService
        ↓
GoogleSheetsService
        ↓
Google Sheets API
e:
AlocacoesService
        ↓
GoogleSheetsService
        ↓
Google Sheets API
Isso evita duplicação de código e facilita uma futura migração para outro banco de dados.
7. Frontend
O frontend é responsável por:
apresentar informações;
permitir navegação;
apresentar o Dashboard;
apresentar vagas;
permitir operações de alocação;
apresentar pagamentos;
apresentar mensagens de erro e sucesso.
O frontend não deve implementar sozinho regras de segurança ou autorização.
Por exemplo, esconder um funcionário da interface não significa que o usuário tenha permissão para acessá-lo.
O backend deve validar todas as operações.
8. Autenticação
A autenticação utiliza Google OAuth.
Fluxo:
Usuário
   ↓
Google OAuth
   ↓
Backend
   ↓
Identificação do usuário
   ↓
Verificação no sistema
   ↓
Sessão autenticada
O Google é responsável por confirmar a identidade do usuário.
O sistema é responsável por determinar quais recursos esse usuário pode acessar.
9. Autorização
Autenticação e autorização são conceitos separados.
Autenticação
Determina:
Quem é o usuário?
Autorização
Determina:
O que esse usuário pode fazer?
O backend deve aplicar as permissões.
Um responsável, por exemplo, não deve conseguir consultar funcionários pertencentes a outro responsável apenas alterando parâmetros de uma requisição.
10. Responsáveis e funcionários
Cada responsável possui um conjunto de funcionários que ele cadastrou.
No módulo de alocação:
Usuário autenticado
        ↓
Responsável
        ↓
Funcionários permitidos
        ↓
Alocação
O backend deve determinar quais funcionários podem ser utilizados pelo responsável.
O frontend não deve receber funcionários que o usuário não tem autorização para visualizar.
11. Alocação
A alocação é uma das principais operações mutáveis do sistema.
O conceito deve ser separado entre:
Vaga
e:
Alocação
Uma vaga pode possuir várias alocações.
Exemplo:
Vaga
10 ajudantes
     │
     ├── Alocação → João
     ├── Alocação → Pedro
     ├── Alocação → Carlos
     └── ...
Uma alocação deve possuir informações suficientes para identificar:
vaga;
funcionário;
responsável;
status;
data;
histórico da operação.
12. Histórico
Operações importantes não devem simplesmente apagar dados.
Por exemplo, ao cancelar uma alocação:
❌ Não:
DELETE alocação
Preferir:
alocação.status = CANCELADA
Sempre que possível, manter informações necessárias para auditoria e histórico.
Isso é importante principalmente para pagamentos.
13. Pagamentos
Os pagamentos dependem das informações de alocação.
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
O sistema deve conseguir identificar posteriormente:
quem trabalhou;
em qual vaga;
qual função exerceu;
qual responsável realizou a alocação;
quanto deveria receber;
quanto foi pago;
quando foi pago;
se o pagamento está atrasado.
14. Regras de arquitetura
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
A lógica de acesso ao Google Sheets deve ficar centralizada.
Regra 6 — Alterações pequenas
Ao implementar uma funcionalidade, modificar somente os módulos necessários.
Regra 7 — Segurança no backend
Nunca confiar em IDs ou permissões enviados pelo frontend.
15. Fases de implementação
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
Responsável vê seus funcionários
Alocar funcionário
Trocar funcionário
Cancelar alocação
Substituição urgente
Fase 3 — Pagamentos
Pagamentos pendentes
Pagamentos realizados
Valores
Comissão
Controle de prazo