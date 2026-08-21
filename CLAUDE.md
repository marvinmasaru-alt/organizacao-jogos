# Sistema de Alocação de Funcionários

## Arquitetura e escopo

- **Estrutura de repositório**: monorepo (frontend Angular e backend Node no
  mesmo repositório).
- **Usuários**: uso interno apenas — os 7 responsáveis + administrador
  (8 contas no total, conhecidas). Não há acesso externo de funcionários ao
  sistema (cadastro deles continua via Google Forms).
- **Autenticação**: login por e-mail + senha (não é mais Google OAuth —
  decisão revertida), restrito a uma lista fechada de contas (os 8 usuários
  conhecidos). Não tem self-signup — se o e-mail não estiver cadastrado, o
  acesso é negado. Mapeamento:
  - aba `RESPONSAVEIS` da planilha: coluna `Email` (E) → login, coluna
    `Senha` (G) → senha (texto puro, como a planilha já guarda hoje),
    coluna `ID` (A) → `Responsavel_ID` do perfil `Responsável`;
  - Administrador: único usuário fora da aba, credenciais em
    `ADMIN_EMAIL`/`ADMIN_PASSWORD` (variáveis de ambiente do backend).
  Backend emite um JWT de sessão após validar e-mail/senha; frontend guarda
  esse token (não guarda a senha) e o reenvia em toda chamada autenticada.
- **Deploy**: vai para nuvem (hospedado), não é só uso local. Sem provedor
  definido ainda — priorizar opção simples e barata (ex.: hospedagem
  gratuita/baixo custo para frontend estático + um serviço de baixo custo
  para o backend Node), a decidir junto com o Claude Code na hora de montar
  o projeto. Onde quer que fique, as credenciais da Google Sheets API
  (service account key) devem ir em variável de ambiente / secret manager
  do provedor — nunca commitadas no repositório.

## Stack técnica

- **Frontend**: Angular (versão mais recente estável) como SPA (client-side
  puro, sem SSR). **Precisa ser responsivo** — os responsáveis acessam tanto
  por computador quanto por celular no dia a dia, então layout mobile-first
  ou ao menos totalmente adaptável é requisito, não "nice to have".
- **Backend**: Node.js com **NestJS**, em **TypeScript**. Módulos do Nest
  devem espelhar os domínios de negócio (ex.: `FuncionariosModule`,
  `SedesModule`, `VagasModule`, `AlocacoesModule`, `FaltasModule`,
  `PagamentosModule`), cada um com seu controller/service, para manter a
  regra de negócio de cada área isolada e testável.
- **Linguagem**: TypeScript de ponta a ponta (frontend e backend).
- **Banco de dados**: Google Sheets (via Google Sheets API), reaproveitando
  as planilhas já usadas hoje pelo processo manual. Não é um banco
  relacional tradicional — não há transações nem lock nativo.
  ⚠️ Toda operação que decrementa/incrementa vagas disponíveis (criar
  alocação, cancelar, registrar falta) precisa **revalidar o estado atual
  da planilha antes de gravar**, para evitar duas alocações simultâneas
  estourarem a `Quantidade` de uma vaga (condição de corrida). Preferir
  reler a linha/contagem imediatamente antes de escrever, e tratar erro de
  forma explícita se o estado mudou entre leitura e escrita.
- Cadastro de funcionário continua entrando via Google Forms (que já
  escreve na planilha) — o backend deve tratar essa origem como um "insert
  externo" e não presumir que todo registro novo vem pela aplicação.

## Visão geral

Sistema para distribuir funcionários entre sedes e vagas de trabalho. Cobre:
cadastro de funcionários e sedes, criação de vagas, alocação de funcionários,
controle de responsáveis, cancelamentos, faltas, pagamentos e comissões,
histórico e permissões por perfil.

Hoje roda em cima de Google Sheets / Google Forms. Está migrando para um
banco de dados real — ao propor esquema/queries, já pensar em modelo
relacional (ver "Estrutura das entidades" abaixo).

## Perfis de usuário

- **Administrador**: acesso total. Aprova funcionários, vê tudo (sedes, vagas,
  alocações, pagamentos, faltas, cancelamentos, histórico), administra o que
  os responsáveis não podem.
- **Responsável** (7 atualmente: Paulo, Andre, Renan, Júlio, Juninho, Lucas,
  Gregório): acesso restrito ao necessário para o trabalho dele — telas de
  Vagas, Alocação, Pagamentos, Faltas. Não tem acesso administrativo completo.

Um responsável pode:
- ser responsável por uma ou mais **sedes**;
- fornecer funcionários para vagas de sedes de **outros** responsáveis.

⚠️ Existem dois papéis distintos numa alocação — **responsável pela sede**
(administra a necessidade daquela sede) e **responsável pelo fornecimento**
(quem efetivamente aloca o funcionário). Tecnicamente são independentes, e a
tabela `ALOCACOES` sempre guarda os dois IDs separadamente
(`Responsavel_Sede_ID`, `Responsavel_Fornecimento_ID`).

Na prática atual, porém, **todo responsável exerce os dois papéis**: cada um
é responsável pela(s) própria(s) sede(s) e também pode fornecer funcionários
para sedes de outros. A prioridade de cada responsável é garantir que a(s)
própria(s) sede(s) esteja(m) devidamente preenchida(s) antes de ajudar em
vagas de sedes de terceiros. Ou seja, "responsável pela sede ≠ responsável
pelo fornecimento" é um caso que **pode acontecer** numa alocação específica
(quando alguém ajuda a preencher vaga de sede alheia), não uma divisão fixa
de papéis entre pessoas diferentes.

## Estrutura das entidades

```
RESPONSAVEIS
   ├── FUNCIONARIOS (responsável que cadastrou)
   └── SEDES (responsável pela sede)
              └── VAGAS
                     └── ALOCACOES ──→ FALTAS
                                   └──→ PAGAMENTOS
```

## Regras de negócio críticas

### Funcionários
- Cadastro via Google Forms. Campos: nome, telefone, documento, província,
  código postal, responsável que cadastrou.
- ID único: `F0001`, `F0002`, ...
- Status inicial: `PENDENTE`. Só o **administrador** aprova.
- **Um funcionário só pode ser alocado pelo responsável que o cadastrou.**
  Mesmo que esteja disponível, outro responsável não pode selecioná-lo.
- Funcionário não aprovado nunca aparece como disponível para alocação.
- Tipo de trabalho (`Ajudante` / `Forklift`) **não é fixo no funcionário** —
  é definido por vaga/dia. O mesmo funcionário pode trabalhar como Ajudante
  num dia e Forklift no outro.

### Sedes
- Campos: ID, Nome, Tipo_Sede, Responsável_ID, Status, Localizacao (link),
  Sigla (coluna G — prefixo curto usado nas pendências do Dashboard, ex.:
  "[HPT] Vaga incompleta").
- **Sem restrição de visibilidade**: todo usuário logado (Administrador ou
  qualquer Responsável) pode ver todas as sedes, sem limite —
  `Responsável_ID` identifica quem administra a sede, não quem pode vê-la.
- Dashboard tem um filtro opt-in "Minha sede" / "Todas as sedes" — para
  Responsável, a tela abre com "Minha sede" selecionado por padrão (só
  reflete o que ele mais usa no dia a dia; ele pode trocar pra "Todas as
  sedes" a qualquer momento, é conveniência de visualização, não controle
  de acesso). Administrador não tem sede própria, então o filtro não se
  aplica a ele — sempre vê todas.
- Board deve exibir o link de localização de forma clicável.

### Vagas
- Campos: ID, Data, Sede_ID, Tipo (Ajudante/Forklift), Quantidade, Status.
- **Sem restrição de visibilidade**: mesma regra das Sedes — todo usuário
  logado vê todas as vagas, sem limite.
- `disponíveis = quantidade - alocações válidas` (nunca negativo).
- Board principal deve mostrar de forma resumida por sede: tipo, `X/Y`,
  "✓ Completo" ou "N vagas disponíveis".
- Existe visão detalhada por sede mostrando, posição a posição, quem está
  alocado e quem forneceu cada um (ou "Ainda não preenchido").
- Seletor de data no Board: padrão = hoje, mas permite navegar para datas
  futuras (preparar vagas com antecedência).
- **Nunca permitir ultrapassar `Quantidade`** — ao atingir o limite, vaga
  vira "✓ Completo" e não aceita nova alocação.

### Alocações
- Tabela `ALOCACOES`: ID, Vaga_ID, Funcionario_ID, Responsavel_Sede_ID,
  Responsavel_Fornecimento_ID, Data, Valor_Recebido, Valor_Funcionario,
  Comissao_Total, Comissao_Responsavel_Sede, Comissao_Responsavel_Fornecimento,
  Extra_Responsavel, Status, Data_Cancelamento, Motivo_Cancelamento.
- **Só contam para "preenchidas" as alocações com `Status = ALOCADO`.**
  Cálculos de vaga nunca devem simplesmente contar todas as linhas.
- Fluxo de criação: data → sede/vaga → tipo → funcionário → cria alocação.
  O funcionário sugerido/selecionável precisa respeitar: quem cadastrou,
  status aprovado, disponibilidade, vaga e data.

### Cancelamentos
- **Nunca apagar** a linha de alocação.
- Ao cancelar: `Status → CANCELADO`, preencher `Data_Cancelamento` e
  `Motivo_Cancelamento`.
- Libera uma vaga (`6/6` → `5/6`), mas o histórico continua mostrando que a
  pessoa havia sido alocada.
- Administrador deve conseguir consultar histórico completo de cancelamentos
  (funcionário, vaga, data, responsável, data/motivo do cancelamento).

### Faltas
- Falta ≠ cancelamento antecipado — é registrada separadamente, no dia do
  trabalho, quando o funcionário estava alocado mas não compareceu.
- **Falta não gera multa.** Nenhuma penalidade financeira automática.
- **Falta cancela o pagamento** daquele funcionário para aquele dia.
- Ao registrar falta, o responsável decide explicitamente entre:
  - "Falta registrada" (sem urgência), ou
  - "Falta + necessita substituição urgente".
  Nunca assumir automaticamente que é urgente.
- **Board principal nunca expõe o nome de quem faltou** — mostra apenas
  "⚠ Necessita de substituição urgente" quando marcado. Detalhes completos
  (funcionário, sede, vaga, data, responsáveis, status, observação) ficam
  numa área restrita separada.
- Uma falta é relevante para até 3 partes ao mesmo tempo: responsável da
  sede, responsável do fornecimento (que pode ser outra pessoa, se alguém
  ajudou a preencher vaga de sede alheia) e administrador.

### Pagamentos e comissões (sedes externas)
- Valor pago ao **funcionário**: Ajudante ¥12.000 / Forklift ¥15.000.
- Valor de referência para o **responsável**: Ajudante ¥16.000 / Forklift ¥18.000.
- O responsável pode pagar ao funcionário um valor diferente do de
  referência — a diferença compõe a comissão.
- Se o responsável pagar **a mais** do previsto do próprio bolso, isso deve
  ser registrado em `Extra_Responsavel` (para ele não esquecer que colocou
  dinheiro próprio na operação).
- Comissão = Valor recebido − Valor pago ao funcionário, podendo ser
  dividida entre `Comissao_Responsavel_Sede` e
  `Comissao_Responsavel_Fornecimento` quando são pessoas diferentes.
- **Prazo de pagamento: até 1 semana** após a data do trabalho. Sistema deve
  destacar visualmente o prazo (ex.: 🟢 no prazo / 🟡 próximo / 🔴 vencido) —
  a regra de negócio é sempre "1 semana", a cor é só indicador visual.

### Princípio geral de histórico
> Alterar o status de um registro é sempre preferível a apagar o registro.

Vale para alocações, cancelamentos, faltas e pagamentos. Fica ainda mais
importante ao migrar de Google Sheets para banco de dados real.

## Pontos ainda em aberto (não assumir, perguntar antes de implementar)

- Lista oficial e fechada de status para: funcionário, sede, vaga, alocação,
  pagamento, falta.
- Fórmula exata de cálculo de `Comissao_Total`, `Comissao_Responsavel_Sede`,
  `Comissao_Responsavel_Fornecimento` e `Extra_Responsavel`, principalmente
  quando responsável da sede ≠ responsável do fornecimento.
- Fluxo exato de substituição urgente no banco: provavelmente mantém o
  registro original da falta e cria uma **nova** alocação para o substituto,
  em vez de sobrescrever o registro original — mas isso ainda não está
  100% fechado.

## Setup inicial necessário (fora do código)

Antes de a integração com Google Sheets funcionar, alguém precisa configurar
manualmente no Google Cloud Console:

1. Criar (ou usar) um projeto no Google Cloud Console.
2. Habilitar a **Google Sheets API** (e a Google Drive API, se for necessário
   listar/acessar arquivos por nome em vez de só por ID).
3. Criar uma **Service Account** dentro desse projeto.
4. Gerar uma **chave JSON** para essa Service Account (é a credencial que o
   backend usa para autenticar).
5. **Compartilhar a planilha do Google Sheets** com o e-mail da Service
   Account (algo como `nome@projeto.iam.gserviceaccount.com`), dando
   permissão de **Editor** — sem isso o backend só consegue ler, não gravar.
6. Guardar a chave JSON como variável de ambiente / secret (nunca commitar
   no repositório — adicionar ao `.gitignore` desde o primeiro commit).

O login dos usuários não depende de credencial Google nenhuma — é e-mail +
senha (coluna `Senha` da aba `RESPONSAVEIS`, ou `ADMIN_EMAIL`/
`ADMIN_PASSWORD` para o administrador). A única credencial Google
necessária é a Service Account acima, usada exclusivamente pelo backend
para ler/escrever na planilha.

## Módulos planejados

Autenticação · Funcionários · Responsáveis · Sedes · Vagas · Board ·
Alocações · Cancelamentos · Faltas · Substituições · Pagamentos ·
Comissões · Histórico · Permissões

## Relacão de tabelas:

### Responsaveis
Cadastrado manualmente nas tabelas pelo administrador
- Id: Id unico do responsavel, R001
- Nome: Nome do responsavel
- Codigo: Código utilizado quando for usar o form de autenticacao
- Status: status do responsavel: ATIVO/INATIVO
- email: email
- link formulario de cadastro: Link unico para ele mandar para os funcionarios cadastrarem
- senha: Senha para entrar no sistema

### Funcionarios
O cadastro é feito por google forms, utilizado para mostrar para o responsavel todos os funcionarios disponiveis a ele, e tambem para fazer alocação e pagamento de funcionarios
- Id: Id unico funcionario F0001
- Nome: nome
- Telefone: telefone
- Provincia: provincia japonesa que ele se encontra
- codigo postal: codigo postal
- Documento: documento que ele ta cadastrado (Zairyu card)
- Responsável_ID: Qual o Id do funcionario que ele esta linkado
- Status: Status de funcionario: ATIVO/PENDENTE/INATIVO
- Data cadastro: Data que foi feito cadastro
- Data aprovação: Data que saiu do pendente

### Sedes
Cadastrado manualmente pelo administrador
- ID: Id unico S001
- Nome: nome da sede
- Tipo_Sede: Enum EXTERNA/HUB
- Responsável_ID: Id do responsavel pela sede
- Status: ATIVA/INATIVA
- Localizacao: Link do google maps
- Sigla: Sigla curta da sede, usada como prefixo `[SIGLA]` nas pendências
  "Vaga incompleta" do Dashboard

### Vagas
Cadastrado por formulario pelo chefe, utilizado para mostrar quais sao as vagas disponiveis em cada sede, que vai aparecer no dashboard
- ID: Id unico da vaga V0001
- Data: data de cadastro da vaga
- Sede_ID: id da sede
- Tipo: tipo de vaga AJUDANTE/FORKLIFT
- Quantidade: quantidade de pessoas necessarias para a vaga
- Status: Se está ATIVO/INATIVO

### Alocacoes
cadastrado pelo app
- ID: Id unica ca alocacao A0001
- Vaga_ID: Id da vaga
- Funcionario_ID: Id do funcionario alocado
- Responsavel_Sede_ID: Id do responsavel da sede
- Responsavel_Fornecimento_ID: Id da pessoa que alocou
- Data: Data que foi feito a alocação
- Valor_Recebido: valor que vai ser recebido pela alocação
- Valor_Funcionario: valor que o funcionario vai receber
- Comissao_Total: total que vai ser a comissão do(s) responsavel(eis) envolvidos
- Comissao_Responsavel_Sede: Quanto que o responsavel da sede vai receber (O valor do funcionario mais metade da comissão, ou a comissão inteira se ele tambem for o responsavel fornecimento)
- Comissao_Responsavel_Fornecimento: Metade da comissão (Ou zero se ele  tambem for o responsavel da sede)
- Extra_Responsavel: Valor extra que o responsavel teve que tirar do bolso caso ele queira pagar a mais para o funcionario
- Status: Qual o status da alocação: ALOCADO/CANCELADO/FALTOU
- Data_Cancelamento: Data que foi cancelado
- Motivo_Cancelamento: Motivo de cancelamento
- Data_Falta: Data da falta
- Motivo_Falta: Motivo de ter faltado (Pode ser preenchido depois)
- Falta_Urgente: VERDADEIRA/FALSO, utilizado para saber se precisa aparecer no dashboard como ação a ser tomada

### Valores
tabela para salvar o valor que foi pago ao funcionario, pode ser fixo ou variavel, se for HUB o valor é variavel
- ID: Id unico dos valores V001
- Tipo_Sede	Tipo: Enumerado para saber o tipo de sede: EXTERNO/HUB
- Valor_Reccebido: valor fixo recebido pelo trabalho, 16000 ajudante, 18000 pilota o forklift para sede externa. Para HUB é 20000 ajudante, 22000 forklift
- Valor_Funcionario_Fixo: Valor que o funcionario recebe, 12000 ajudante, 15000
- Valor_Funcionario_Variavel:Valor utilizado para informar quanto que o funcionario do hub vai ganhar se não for informado um valor diferente na hora
- Status: Status para saber se esta vigente ainda ou não ATIVO/INATIVO
- Vigencia_Inicio: Data de inicio da vigencia
- Vigencia_Inicio: Data de fim da vigencia

### Pagamentos
- ID: Id unico de pagamentos Exemplo: P0001
- Tipo: Tipo de trabalho que originou o pagamento AJUDANTE/FORKLIFT
- Responsavel_ID: Responsável que deve realizar o pagamento
- Alocacao_ID: Alocação que originou o pagamento
- Funcionario_ID: Funcionário que receberá
- Valor: Valor que deve ser pago
- Data_Prevista: Data limite/prevista para pagamento, normalmente uma semana após a alocação
- Data_Pagamento: Data em que o pagamento foi efetivamente realizado, informado pelo responsavel na hora do pagamento
- Status: Estado atual do pagamento: PENDENTE/FEITO/CANCELADO
- Tipo_Pagamento: Se foi um pagamento em maos ou deposito bancario: EM_MAOS/DEPOSITO
- Comprovante: Link de foto que pode ser informada pelo forms para comprovante
- Observacao: Observação adicional que pode ser informado

