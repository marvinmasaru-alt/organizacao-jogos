# Módulo de Pagamentos e Controle Financeiro

## 1. Objetivo

Implementar no sistema um módulo completo de controle financeiro relacionado às alocações de funcionários.

O módulo deverá possuir duas áreas principais:

1. **Pagamentos a Receber**
   - Permitir que cada responsável saiba quanto tem para receber.
   - Saber de quais trabalhos esse dinheiro é proveniente.
   - Saber quem deve realizar o pagamento.
   - Saber quando o pagamento deve ser recebido.
   - Identificar pagamentos pendentes, próximos do vencimento, atrasados e já recebidos.

2. **Pagamentos a Funcionários**
   - Permitir que cada responsável saiba quais funcionários precisam ser pagos.
   - Saber quanto deve ser pago a cada funcionário.
   - Saber até quando o pagamento precisa ser realizado.
   - Registrar quando o pagamento foi realizado.
   - Permitir anexar um comprovante do pagamento.
   - Identificar pagamentos pendentes, urgentes, atrasados e realizados.

O módulo deve estar integrado ao sistema de vagas e alocações.

Os registros financeiros devem ser criados a partir das alocações confirmadas e devem utilizar automaticamente:

- funcionário;
- responsável pelo funcionário;
- sede;
- responsável pela sede;
- tipo de sede;
- tipo de função;
- valor financeiro configurado;
- valor previsto para pagamento;
- valor efetivamente pago;
- data do trabalho;
- data de vencimento.

---

# 2. Conceitos fundamentais

Cada funcionário confirmado em uma vaga gera uma obrigação financeira.

A estrutura financeira deve considerar que existem dois possíveis responsáveis envolvidos:

### 2.1 Responsável pelo funcionário

É o responsável que possui/cadastrou aquele funcionário.

Também pode ser chamado de:

**Dono do funcionário**

Esse responsável é importante porque, quando o funcionário trabalha para uma sede pertencente a outro responsável, ele continua sendo o responsável pelo pagamento do funcionário.

---

### 2.2 Responsável pela sede

É o responsável associado à sede onde o funcionário foi alocado.

Também pode ser chamado de:

**Dono da sede**

Esse responsável possui direito à comissão definida pelas regras abaixo.

---

# 3. Tipos de função são dinâmicos

O sistema NÃO pode assumir que existem somente:

- manpower;
- forklift.

Esses são apenas tipos de função que já existem atualmente.

O administrador poderá cadastrar novos tipos de função diretamente no sistema.

Exemplo:

- manpower;
- forklift;
- operador;
- motorista;
- auxiliar;
- etc.

Os tipos devem ser carregados dinamicamente do banco de dados.

Não deve existir lógica no frontend ou backend que limite o sistema a dois tipos fixos.

---

# 4. Configuração de tipos de função

Cada tipo de função deverá possuir configurações financeiras.

Para uma sede do tipo **EXTERNA**, o administrador poderá definir o valor-base que deve ser utilizado para o pagamento do funcionário.

Exemplo:

| Tipo | Valor gerado | Salário-base |
|---|---:|---:|
| Manpower | ¥16.000 | ¥12.000 |
| Forklift | ¥18.000 | ¥15.000 |
| Novo tipo | Configurável | Configurável |

O sistema deve permitir que o administrador altere esses valores sem precisar modificar o código.

Os valores financeiros não devem ser hardcoded no frontend.

---

# 5. Tipos de sede

Existem atualmente dois tipos de sede:

- `EXTERNA`
- `HUB`

As regras financeiras são diferentes para cada tipo.

---

# 6. Sede EXTERNA

Nas sedes externas, existe um valor financeiro gerado pela função e um valor-base de pagamento do funcionário.

Valores atualmente definidos:

| Tipo | Valor gerado | Valor-base do funcionário |
|---|---:|---:|
| Manpower | ¥16.000 | ¥12.000 |
| Forklift | ¥18.000 | ¥15.000 |

Esses valores devem ser tratados como configuração do sistema.

O administrador poderá cadastrar novos tipos de função e definir o respectivo valor-base.

---

# 7. Sede HUB

Nas sedes do tipo HUB, atualmente:

| Tipo | Valor gerado | Pagamento do funcionário |
|---|---:|---|
| Manpower | ¥20.000 | Livre |
| Forklift | ¥22.000 | Livre |

No HUB não existe um salário-base obrigatório para o funcionário.

O responsável pelo funcionário pode definir livremente quanto será pago ao funcionário.

Exemplo:

```text
Valor gerado:                 ¥20.000
Valor definido para funcionário: ¥14.000
Comissão total:                ¥6.000
```

Outro exemplo:

```text
Valor gerado:                 ¥20.000
Valor definido para funcionário: ¥18.000
Comissão total:                ¥2.000
```

O sistema deve permitir que o valor do funcionário seja definido de forma livre no HUB.

---

# 8. Cálculo da comissão

A comissão financeira é inicialmente calculada como:

**Comissão calculada = Valor gerado − Valor pago ao funcionário**

Exemplo:

```text
Valor gerado:              ¥20.000
Valor pago ao funcionário: ¥14.000
Comissão calculada:         ¥6.000
```

Entretanto, quando existem responsáveis diferentes, existe uma regra adicional obrigatória de comissão para o dono da sede.

Essa regra está descrita na seção 10.

---

# 9. Mesmo responsável

Quando o funcionário pertence ao mesmo responsável da sede:

```text
Responsável pelo funcionário = Responsável pela sede
```

o responsável possui integralmente o resultado financeiro da operação.

Exemplo:

```text
Valor gerado:              ¥20.000
Pagamento ao funcionário:  ¥14.000
Comissão:                   ¥6.000

Responsável:
¥6.000
```

Nesse cenário não existe comissão separada para outro responsável.

---

# 10. Responsáveis diferentes

Quando:

```text
Responsável pelo funcionário ≠ Responsável pela sede
```

existem dois responsáveis financeiros diferentes.

A regra é:

### Dono da sede

Recebe uma comissão **FIXA de ¥1.000**.

### Dono do funcionário

Recebe o restante do resultado financeiro.

A comissão do dono da sede é sempre ¥1.000.

**Não é uma divisão de 50/50.**

---

# 11. Exemplo — comissão positiva

HUB:

```text
Valor gerado:              ¥20.000
Pagamento ao funcionário:  ¥14.000
Diferença:                   ¥6.000
```

Como os responsáveis são diferentes:

```text
Funcionário:                ¥14.000
Dono da sede:                ¥1.000
Dono do funcionário:         ¥5.000
```

Total:

```text
¥14.000 + ¥1.000 + ¥5.000 = ¥20.000
```

---

# 12. Regra fundamental — comissão mínima do dono da sede

O valor de **¥1.000 para o dono da sede é obrigatório**.

Ele não depende da existência de comissão positiva para o dono do funcionário.

Ou seja:

> Sempre que o funcionário pertencer a um responsável diferente do responsável pela sede, o dono da sede deverá receber ¥1.000.

O dono do funcionário deverá arcar com esse valor quando necessário.

---

# 13. Exemplo — funcionário recebe todo o valor gerado

Valor gerado:

```text
¥20.000
```

Valor pago ao funcionário:

```text
¥20.000
```

Resultado:

```text
¥20.000 - ¥20.000 = ¥0
```

Mesmo assim:

```text
Funcionário:        ¥20.000
Dono da sede:        ¥1.000
Dono funcionário:   -¥1.000
```

Nesse caso, o dono do funcionário fica com resultado negativo e precisa pagar ¥1.000 do próprio bolso ao dono da sede.

---

# 14. Exemplo — funcionário recebe mais que o valor gerado

Valor gerado:

```text
¥20.000
```

Valor pago ao funcionário:

```text
¥21.000
```

Resultado:

```text
¥20.000 - ¥21.000 = -¥1.000
```

Além do custo adicional de ¥1.000 referente ao pagamento do funcionário, o dono do funcionário ainda deverá pagar ¥1.000 ao dono da sede.

Resultado financeiro:

```text
Funcionário:        ¥21.000
Dono da sede:        ¥1.000
Dono funcionário:   -¥2.000
```

Portanto:

**O ¥1.000 do dono da sede é uma obrigação mínima e não pode ser eliminado pelo valor pago ao funcionário.**

---

# 15. Responsabilidade pelo pagamento do funcionário

Quando os responsáveis são diferentes:

```text
Responsável A = dono do funcionário
Responsável B = dono da sede
```

o **dono do funcionário é responsável por realizar o pagamento ao funcionário**.

O dono da sede não fica responsável pelo pagamento do funcionário nesse cenário.

Exemplo:

```text
Valor gerado:              ¥20.000
Valor a pagar ao funcionário: ¥14.000

Responsável A:
- paga ¥14.000 ao funcionário
- recebe o restante da comissão

Responsável B:
- recebe ¥1.000 de comissão
```

Essa regra é definitiva.

---

# 16. Fluxo financeiro completo

Quando um funcionário é confirmado em uma vaga:

```text
Vaga
 ↓
Funcionário alocado
 ↓
Alocação confirmada
 ↓
Sistema identifica:
    - funcionário
    - responsável pelo funcionário
    - sede
    - responsável pela sede
    - tipo de função
    - tipo de sede
 ↓
Sistema identifica o valor gerado
 ↓
Sistema define o valor previsto para o funcionário
 ↓
Sistema calcula as obrigações financeiras
 ↓
Cria obrigação de pagamento ao funcionário
 ↓
Cria obrigação de pagamento/recebimento de comissão
 ↓
Os registros aparecem nas respectivas telas
```

---

# 17. Prazo para pagamento do funcionário

O responsável pelo funcionário possui até **7 dias após a data do trabalho** para realizar o pagamento.

Exemplo:

```text
Data do trabalho: 26/08/2026
Prazo máximo:     02/09/2026
```

A data de vencimento deve ser calculada automaticamente pelo backend.

Não deve depender de cálculo manual no frontend.

---

# 18. Status de pagamentos

Utilizar estados claros.

Sugestão:

- `PENDENTE`
- `A_VENCER`
- `VENCENDO`
- `ATRASADO`
- `PAGO`

### PENDENTE

Pagamento ainda não realizado.

### A_VENCER

Pagamento pendente cujo vencimento ainda está distante.

### VENCENDO

Pagamento que está próximo do vencimento.

### ATRASADO

Data de vencimento já passou e o pagamento ainda não foi realizado.

### PAGO

Pagamento já confirmado.

O status deve ser calculado/validado pelo backend.

---

# 19. Tela — Pagamentos a Receber

Criar uma tela financeira onde o responsável consiga visualizar tudo que possui direito a receber.

A tela deve responder:

> Quanto eu tenho para receber?

> Quando eu vou receber?

> De qual trabalho vem esse dinheiro?

> Quem é responsável pelo pagamento?

> Qual é a minha comissão?

> O pagamento já foi realizado?

---

# 20. Resumo da tela de pagamentos a receber

Exibir cards:

### Total a receber

Valor total atualmente pendente.

### A receber nos próximos 7 dias

Valor com vencimento dentro dos próximos 7 dias.

### Em atraso

Valor cujo prazo de recebimento já passou.

### Total a receber - URGENTE - 

Valor total atualmente pendente que está próximo de entrar em atraso.Perto de dois dias


### Recebido no período

Valor recebido dentro do período selecionado.

---

# 21. Lista de pagamentos a receber

Cada registro deve apresentar, no mínimo:

- data do trabalho;
- data de vencimento;
- sede;
- tipo de função;
- funcionário;
- responsável pagador;
- valor gerado;
- valor destinado ao funcionário;
- comissão calculada;
- minha comissão;
- status.

Exemplo:

```text
Data:                 26/08/2026
Sede:                 HUB XYZ
Função:               Manpower
Funcionário:          João

Valor gerado:         ¥20.000
Pagamento funcionário: ¥14.000
Comissão calculada:    ¥6.000
Minha comissão:        ¥5.000

Vencimento:           02/09/2026
Status:               Pendente
```

Se o responsável for o dono da sede:

```text
Minha comissão: ¥1.000
```

---

# 22. Tela — Pagamentos de Funcionários

Criar uma tela separada para controlar os pagamentos que o responsável precisa realizar aos funcionários.

A tela deve responder:

> Quem eu preciso pagar?

> Quanto preciso pagar?

> Quando preciso pagar?

> Qual trabalho originou esse pagamento?

> Já paguei?

> Existe algum pagamento atrasado?

---

# 23. Resumo da tela de pagamentos de funcionários

Exibir:

### Total a pagar

Soma dos pagamentos pendentes.

### A pagar nos próximos 7 dias

Pagamentos cujo vencimento está dentro dos próximos 7 dias.

### Urgente — próximos 2 dias

Pagamentos cujo vencimento ocorrerá dentro dos próximos 2 dias.

Essa categoria serve para destacar pagamentos que estão próximos do prazo máximo.

### Em atraso

Pagamentos cujo prazo já passou.

### Pagamentos realizados

Total pago dentro do período selecionado.

---

# 24. Lista de pagamentos de funcionários

Cada pagamento deve apresentar:

- funcionário;
- data do trabalho;
- sede;
- tipo de sede;
- tipo de função;
- valor gerado;
- valor previsto para pagamento;
- valor efetivamente pago;
- data limite;
- status;
- data do pagamento;
- comprovante, quando houver.

Exemplo:

```text
Funcionário: João
Data: 26/08/2026
Sede: HUB XYZ
Tipo de sede: HUB
Função: Manpower

Valor gerado:       ¥20.000
Valor previsto:     ¥14.000
Valor pago:         -

Vencimento:         02/09/2026
Status:             Pendente
```

---

# 25. Registro de pagamento

O responsável deve conseguir abrir um pagamento pendente e registrar que realizou o pagamento.

Ao registrar o pagamento, deverá informar:

- valor efetivamente pago;
- data do pagamento;
- observação opcional;
- comprovante de pagamento.

O status deverá passar para:

```text
PAGO
```

O sistema deve registrar o histórico da operação.

O registro original não deve ser apagado.

---

# 26. Comprovante de pagamento

A tela de registro do pagamento deve permitir o upload de uma imagem como comprovante.

O sistema deve:

1. permitir selecionar uma imagem;
2. realizar o upload para o armazenamento configurado pelo projeto;
3. salvar no banco de dados o link/referência do arquivo;
4. associar o comprovante ao pagamento;
5. permitir posteriormente visualizar o comprovante.

O banco não deve necessariamente armazenar o arquivo binário diretamente.

Deve ser salvo o link/referência para o arquivo, conforme a arquitetura de armazenamento utilizada pelo projeto.

---

# 27. Valor previsto x valor efetivamente pago

O sistema deve obrigatoriamente manter separados:

### Valor previsto

Quanto deveria ser pago.

### Valor efetivamente pago

Quanto realmente foi pago.

Exemplo:

```text
Valor previsto:       ¥14.000
Valor efetivamente pago: ¥13.000
```

O sistema **não deve substituir o valor previsto pelo valor pago**.

Os dois valores precisam continuar disponíveis para histórico e auditoria.

---

# 28. Diferença entre previsto e pago

Quando:

```text
Valor previsto ≠ Valor efetivamente pago
```

o sistema deve preservar essa diferença.

Exemplo:

```text
Previsto: ¥14.000
Pago:     ¥13.000
Diferença: ¥1.000
```

Essa informação deverá poder ser utilizada futuramente para identificar pagamentos parciais, diferenças ou ajustes.

---

# 29. Não duplicar pagamentos

Uma mesma alocação não pode gerar pagamentos duplicados.

Cada alocação deverá possuir uma referência financeira única.

Se o usuário:

- atualizar a página;
- abrir novamente a vaga;
- consultar novamente a alocação;
- recarregar o dashboard;

o sistema não poderá criar outro pagamento.

A criação dos registros financeiros deve ser idempotente.

---

# 30. Permissões

Os responsáveis somente podem visualizar informações financeiras relacionadas às suas responsabilidades.

## Pagamentos de funcionários

Um responsável deve visualizar os pagamentos de funcionários pelos quais ele é responsável.

## Pagamentos a receber

Um responsável deve visualizar somente valores que ele possui direito de receber.

## Administrador

O administrador pode visualizar todos os pagamentos e todas as obrigações financeiras.

---

# 31. Cenário de responsáveis diferentes

Considerar o seguinte cenário:

```text
Funcionário João
        ↓
Dono do funcionário = Responsável A

Sede HUB XYZ
        ↓
Dono da sede = Responsável B
```

João é alocado na sede HUB XYZ.

Resultado:

```text
Responsável A:
- responsável por pagar João
- recebe o restante da comissão

Responsável B:
- não paga João
- recebe ¥1.000 de comissão
```

---

# 32. Privacidade dos funcionários

Quando um responsável estiver trabalhando com um funcionário pertencente a outro responsável, ele deverá visualizar somente as informações necessárias para a operação.

Não expor dados pessoais desnecessários.

Exemplo:

| Informação | Funcionário próprio | Funcionário de outro responsável |
|---|---:|---:|
| Nome | Sim | Sim |
| Função | Sim | Sim |
| Status da alocação | Sim | Sim |
| Telefone | Sim | Não |
| Documento | Sim | Não |
| Dados pessoais desnecessários | Sim | Não |

Essa restrição deve ser implementada no **backend**.

Não basta esconder o telefone ou documento no frontend.

A API também deve impedir que esses dados sejam retornados para o responsável que não possui autorização.

---

# 33. Dashboard financeiro

A área financeira deve permitir uma visão rápida da situação do responsável.

Exemplo:

```text
┌─────────────────────────────────────────────────┐
│ PAGAMENTOS                                      │
│                                                 │
│ ¥ XXX.XXX       ¥ XX.XXX        ¥ XX.XXX       │
│ A receber        Próximos 7d      Em atraso     │
└─────────────────────────────────────────────────┘
```

Depois:

```text
PAGAMENTOS A RECEBER

Data       Sede       Funcionário    Valor    Status
26/08      HUB A      João           ¥5.000  Pendente
27/08      Externa B  Pedro          ¥1.000  Vencendo
```

E:

```text
PAGAMENTOS A FUNCIONÁRIOS

Data       Funcionário    Sede       Valor      Vencimento
26/08      João            HUB A      ¥14.000    02/09
27/08      Pedro           Externa B  ¥12.000    03/09
```

---

# 34. Filtros

As telas financeiras devem permitir filtrar por:

- período;
- status;
- sede;
- tipo de função;
- funcionário;
- responsável;
- tipo de sede;
- HUB;
- Externa.

Os tipos de função devem ser carregados dinamicamente do banco.

Não criar filtros hardcoded somente para:

```text
manpower
forklift
```

---

# 35. Regras de cálculo importantes

O backend deve ser a fonte oficial dos cálculos financeiros.

Não confiar em valores calculados exclusivamente no frontend.

O backend deve determinar:

- valor gerado;
- valor previsto do funcionário;
- valor efetivamente pago;
- comissão;
- comissão do dono da sede;
- comissão do dono do funcionário;
- vencimento;
- status.

---

# 36. Regra financeira resumida

## Cenário A — mesmo responsável

```text
Responsável funcionário = Responsável sede
```

Exemplo:

```text
Valor gerado:              ¥20.000
Funcionário:               ¥14.000
Resultado:                  ¥6.000

Dono do funcionário/sede:  ¥6.000
```

---

## Cenário B — responsáveis diferentes

```text
Responsável funcionário ≠ Responsável sede
```

Exemplo:

```text
Valor gerado:              ¥20.000
Funcionário:               ¥14.000
Resultado calculado:        ¥6.000

Dono da sede:               ¥1.000
Dono do funcionário:        ¥5.000
```

---

## Cenário C — nenhuma comissão para o dono do funcionário

```text
Valor gerado:              ¥20.000
Funcionário:               ¥20.000
Resultado:                   ¥0

Dono da sede:               ¥1.000
Dono do funcionário:       -¥1.000
```

O dono do funcionário precisa arcar com os ¥1.000.

---

## Cenário D — prejuízo maior

```text
Valor gerado:              ¥20.000
Funcionário:               ¥21.000
Resultado:                 -¥1.000

Dono da sede:               ¥1.000
Dono do funcionário:       -¥2.000
```

O dono do funcionário arca tanto com a diferença do pagamento do funcionário quanto com a comissão obrigatória de ¥1.000 do dono da sede.

---

# 37. Regras que NÃO devem ser implementadas

Não implementar as seguintes regras antigas:

- NÃO dividir comissão 50/50;
- NÃO deixar a responsabilidade pelo pagamento do funcionário indefinida;
- NÃO permitir que o dono da sede seja responsável pelo pagamento do funcionário quando o funcionário pertence a outro responsável;
- NÃO limitar tipos de função a manpower e forklift;
- NÃO hardcodar valores financeiros no frontend;
- NÃO esconder dados pessoais somente pelo frontend;
- NÃO substituir valor previsto pelo valor efetivamente pago;
- NÃO criar pagamentos duplicados para a mesma alocação.

---

# 38. Regras definitivas para implementação

1. Tipos de função são dinâmicos.
2. O administrador pode cadastrar novos tipos.
3. O administrador pode configurar o salário-base dos tipos para sedes externas.
4. Manpower e forklift são tipos existentes, mas não são exclusivos.
5. Existem sedes HUB e EXTERNA.
6. Sedes externas possuem valor gerado e salário-base configurável.
7. HUB possui valor gerado e pagamento ao funcionário livre.
8. A comissão calculada é a diferença entre valor gerado e valor pago ao funcionário.
9. Quando funcionário e sede pertencem ao mesmo responsável, o resultado pertence integralmente a esse responsável.
10. Quando pertencem a responsáveis diferentes, o dono da sede recebe **sempre ¥1.000**.
11. O restante pertence ao dono do funcionário.
12. O dono do funcionário é responsável por pagar o funcionário.
13. Mesmo que não exista comissão positiva para o dono do funcionário, ele continua obrigado a pagar ¥1.000 ao dono da sede.
14. O dono do funcionário pode ter resultado negativo.
15. O prazo para pagamento do funcionário é de até 7 dias após o trabalho.
16. O sistema deve identificar pagamentos a vencer, próximos do vencimento e atrasados.
17. Deve existir uma tela de pagamentos a receber.
18. Deve existir uma tela de pagamentos de funcionários.
19. Deve ser possível registrar o pagamento efetivo.
20. Deve ser possível anexar comprovante de pagamento.
21. O comprovante deve ter sua referência/link salvo no banco.
22. Valor previsto e valor efetivamente pago devem ser armazenados separadamente.
23. O histórico financeiro não deve ser apagado.
24. Uma alocação não pode gerar pagamentos duplicados.
25. O backend é responsável pelos cálculos financeiros.
26. Os responsáveis só podem visualizar informações financeiras autorizadas.
27. Dados pessoais de funcionários de outros responsáveis não podem ser expostos.
28. O administrador possui acesso financeiro completo.

---

# 39. Resultado esperado

Após a implementação, cada responsável deverá conseguir entrar no sistema e responder rapidamente:

### Recebimentos

- Quanto tenho para receber?
- De onde vem esse dinheiro?
- Quem precisa me pagar?
- Quando devo receber?
- O que está atrasado?
- Quanto recebi no período?
- Quanto foi minha comissão?

### Pagamentos

- Quanto tenho que pagar?
- Quem preciso pagar?
- Qual é o valor de cada funcionário?
- Quando preciso pagar?
- Quais pagamentos vencem nos próximos 2 dias?
- Quais estão atrasados?
- Quais já foram pagos?
- Qual foi o valor efetivamente pago?
- Existe comprovante?

### Administrador

O administrador deverá conseguir visualizar o panorama financeiro completo e manter as configurações de tipos de função e seus valores sem precisar modificar o código.

---

# 40. Orientação de implementação para o Claude

Antes de alterar o código:

1. Analisar a estrutura atual do projeto.
2. Identificar os modelos Prisma existentes relacionados a:
   - funcionários;
   - responsáveis;
   - sedes;
   - tipos de função;
   - vagas;
   - alocações.
3. Identificar como as alocações atualmente são confirmadas.
4. Identificar como os tipos de função dinâmicos já foram implementados.
5. Identificar onde os valores financeiros atualmente estão configurados.
6. Reutilizar a arquitetura existente sempre que possível.
7. Não criar estruturas duplicadas para informações que já existem.
8. Não modificar regras existentes que não estejam relacionadas ao módulo financeiro.
9. Antes de criar novos models/tabelas, verificar se a estrutura atual pode ser estendida de maneira consistente.
10. Garantir que toda regra financeira importante seja validada no backend.
11. Garantir que as permissões sejam aplicadas na API.
12. Garantir que a criação de obrigações financeiras seja idempotente.

A implementação deve priorizar:

**consistência financeira > facilidade de implementação.**

Nenhum valor financeiro deve depender exclusivamente do que o frontend enviar.

O backend deve validar e determinar os valores oficiais.