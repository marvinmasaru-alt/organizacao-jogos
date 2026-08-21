Regras de negócio — Sistema de Alocação de Funcionários
1. Objetivo do sistema
O sistema tem como objetivo controlar a distribuição de funcionários entre diferentes sedes e vagas de trabalho, permitindo:
cadastrar funcionários;
cadastrar e administrar sedes;
cadastrar vagas por data, sede e função;
permitir que responsáveis forneçam funcionários para as vagas;
controlar quem é responsável por cada sede;
controlar quem forneceu cada funcionário;
acompanhar vagas preenchidas e disponíveis;
permitir cancelamentos;
registrar faltas;
identificar necessidade de substituição urgente;
controlar pagamentos aos funcionários;
controlar pagamentos/comissões dos responsáveis;
manter histórico das operações;
limitar a visualização de informações conforme o perfil do usuário.
2. Perfis de usuário
Existem, conceitualmente, três níveis de acesso.
2.1 Administrador
O administrador possui acesso amplo ao sistema.
Pode:
visualizar todos os funcionários;
aprovar funcionários;
visualizar todas as sedes;
visualizar todas as vagas;
visualizar todas as alocações;
acompanhar pagamentos;
registrar/gerenciar faltas;
visualizar cancelamentos;
visualizar históricos;
administrar situações que os responsáveis não podem alterar.
O administrador é o principal responsável pelo controle do cadastro e pela supervisão do sistema.
3. Responsáveis
Existem atualmente 7 responsáveis:
Paulo
Andre
Renan
Júlio
Juninho
Lucas
Gregório
Cada responsável pode ser responsável por uma ou mais sedes.
Exemplo:
Paulo → Toyohashi
Um responsável pode também fornecer funcionários para uma sede que pertence a outro responsável.
Portanto existem duas responsabilidades diferentes:
Responsável pela sede
É quem administra/é responsável pela necessidade daquela sede.
Responsável pelo fornecimento
É quem efetivamente fornece/aloca o funcionário para aquela vaga.
Esses dois responsáveis podem ser a mesma pessoa ou pessoas diferentes.
4. Cadastro de funcionários
O funcionário é cadastrado através de um Google Forms.
Os dados originalmente definidos são:
Campo	Informação
Nome completo	Nome do funcionário
Telefone	Telefone
Documento	Link/arquivo do documento
Província	Província
Código postal	Código postal
Responsável	Responsável que cadastrou


O cadastro também recebe:
ID do funcionário;
data do cadastro;
status.
ID
O funcionário recebe um identificador único, por exemplo:
F0001
F0002
F0003
5. Responsável pelo cadastro
Cada funcionário fica vinculado ao responsável que realizou seu cadastro.
Essa informação é importante porque:
Um responsável só pode selecionar funcionários que ele próprio cadastrou durante o processo de alocação.

Exemplo:
Paulo cadastrou:
- Marcos
- João
- Pedro

Andre cadastrou:
- Carlos
- Lucas
- Rafael
Quando Paulo estiver alocando funcionários:
Paulo → pode selecionar Marcos, João e Pedro
Mas não:
Carlos
Lucas
Rafael
mesmo que esses funcionários estejam disponíveis.
Essa regra existe para impedir que um responsável utilize funcionários cadastrados por outro responsável.
6. Status do funcionário
O cadastro possui um status.
Um funcionário novo inicialmente pode ficar:
PENDENTE
O administrador é responsável pela aprovação.
Depois de aprovado, o funcionário pode ser utilizado no sistema.
O sistema deve impedir que funcionários que não estejam em condição válida sejam disponibilizados para alocação.
7. Tipos de trabalho
No MVP existem somente dois tipos:
Manpower
Forklift
Um mesmo funcionário pode trabalhar em funções diferentes em dias diferentes.
Exemplo:
18/08 → Marcos → Manpower

19/08 → Marcos → Forklift
Portanto o tipo de trabalho não é uma característica permanente do funcionário.
Ele pertence à vaga/alocação daquele dia.
8. Sedes
A tabela Sedes possui:
Campo	Descrição
ID	Identificador da sede
Nome	Nome da sede
Tipo_Sede	Tipo da sede
Responsável_ID	Responsável pela sede
Status	Status da sede
Localizacao	Link para localização


Exemplo:
S001
Toyohashi
EXTERNA
R001
ATIVA
https://...
9. Responsável da sede
Cada sede possui um responsável.
Esse responsável é quem precisa acompanhar se as vagas daquela sede foram preenchidas.
Por isso o Board possui o filtro:
Minhas sedes
Todas as sedes
Minhas sedes
Mostra somente as vagas das sedes pelas quais o responsável logado é responsável.
Todas as sedes
Permite visualizar todas as vagas.
Isso é importante porque um responsável pode precisar visualizar uma situação envolvendo outra sede.
10. Localização da sede
Cada sede possui um link de localização.
No Board, o sistema deve apresentar algo como:
Sede de Toyohashi
Responsável: Paulo

📍 Ver localização
Ao clicar, o responsável deve conseguir abrir a localização da sede.
11. Vagas
A tabela Vagas possui:
Campo	Descrição
ID	ID da vaga
Data	Data do trabalho
Sede_ID	Sede
Tipo	Manpower/Forklift
Quantidade	Número de pessoas necessárias
Status	Estado da vaga


Exemplo:
V0001
18/08/2026
S001
Manpower
6
ABERTA
12. Quantidade de vagas
Se uma vaga possui:
Quantidade = 6
isso significa que são necessárias 6 pessoas.
Se existem 4 alocações válidas:
Preenchidas = 4
Disponíveis = 2
O sistema deve calcular:
disponíveis = quantidade - alocações válidas
Nunca deve mostrar quantidade negativa.
13. Status da vaga
Uma vaga pode ter estados como:
ABERTA
e posteriormente outros estados conforme a necessidade do sistema.
A regra principal do Board é mostrar a situação real da vaga:
6 / 6
✓ Completo
ou:
4 / 6
2 vagas disponíveis
14. Seleção de data
O Board deve possuir um seletor de data.
Ao abrir:
A data padrão deve ser o dia atual.

Porém o responsável pode selecionar outra data.
Isso permite preparar vagas futuras.
Exemplo:
Hoje: 20/08

Responsável pode selecionar:
21/08
22/08
23/08
...
O sistema deve atualizar o Board conforme a data selecionada.
15. Board resumido
A visão principal deve ser resumida.
Exemplo:
Toyohashi
Responsável: Paulo
📍 Ver localização

Manpower
4/6
2 vagas disponíveis

Forklift
1/1
✓ Completo
O objetivo é permitir que o responsável veja rapidamente:
quais sedes são suas;
quantas vagas existem;
quantas estão preenchidas;
quantas ainda faltam.
16. Visão detalhada da sede
Além da visão resumida, deve existir uma visão detalhada.
Exemplo:
Sede de Toyohashi
Responsável: Paulo
📍 Localização

Manpower

1. Marcos — preenchido por Paulo
2. João — preenchido por Paulo
3. Carlos — preenchido por Andre
4. Pedro — preenchido por Paulo
5. Ainda não preenchido
6. Ainda não preenchido

Forklift

1. Ainda não preenchido
Essa visão é importante porque mostra:
quem está alocado;
quem forneceu a pessoa;
quais posições ainda estão abertas.
17. Responsável pela sede ≠ responsável pelo fornecimento
Essa é uma das regras mais importantes do sistema.
Exemplo:
Sede: Toyohashi
Responsável pela sede: Paulo
Paulo pode fornecer Marcos:
Responsável da sede: Paulo
Responsável pelo fornecimento: Paulo
Mas Andre também pode fornecer Carlos:
Responsável da sede: Paulo
Responsável pelo fornecimento: Andre
Portanto a alocação precisa guardar os dois IDs.
Na tabela ALOCACOES:
Responsavel_Sede_ID
Responsavel_Fornecimento_ID
18. Estrutura de ALOCAÇÕES
A estrutura definida é:
ID
Vaga_ID
Funcionario_ID
Responsavel_Sede_ID
Responsavel_Fornecimento_ID
Data
Valor_Recebido
Valor_Funcionario
Comissao_Total
Comissao_Responsavel_Sede
Comissao_Responsavel_Fornecimento
Extra_Responsavel
Status
Data_Cancelamento
Motivo_Cancelamento
19. Regra para considerar uma alocação válida
O Board não deve simplesmente contar todas as linhas de ALOCACOES.
Somente alocações com status válido devem ocupar uma vaga.
A regra que implementamos atualmente é:
Status = ALOCADO
Somente essas entram no cálculo:
Preenchidas
Disponíveis
Isso é fundamental para cancelamentos e faltas.
20. Cancelamento
Um funcionário pode cancelar a qualquer momento.
O cancelamento não deve apagar a alocação.
Isso é importante para preservar histórico.
Em vez disso:
Status → CANCELADO
Data_Cancelamento → data
Motivo_Cancelamento → motivo
A alocação deixa de ocupar a vaga.
Exemplo:
Antes:
6 vagas
6 pessoas alocadas
Uma pessoa cancela:
5 alocadas
1 disponível
Mas o histórico continua registrando que aquela pessoa havia sido alocada.
21. Histórico de cancelamento
O administrador deve conseguir visualizar:
Funcionário
Vaga
Data
Responsável
Data do cancelamento
Motivo
A ideia é manter rastreabilidade.
Não devemos apagar informações históricas simplesmente porque a pessoa cancelou.
22. Faltas
Além de cancelamentos prévios, existe uma situação diferente:
O funcionário estava alocado, mas faltou no dia do trabalho.

Isso deve ser registrado separadamente como falta.
Uma falta não é necessariamente um cancelamento antecipado.
23. Falta não gera multa
Foi definido explicitamente:
A falta não gera multa.

Portanto o sistema não deve calcular nenhuma penalidade financeira automática por falta.
24. Falta cancela o pagamento
Se o funcionário estava alocado e no final do dia foi registrado que ele faltou:
Pagamento do funcionário = cancelado/não devido
A falta deve impedir que aquele funcionário seja tratado como alguém que trabalhou normalmente para fins de pagamento.
25. Falta pode ou não exigir substituição
Nem toda falta exige substituição urgente.
O responsável deve decidir.
Quando registrar uma falta, deve existir uma decisão do tipo:
Falta registrada
ou:
Falta + necessita substituição urgente
Portanto o sistema não deve assumir automaticamente que toda falta é urgente.
26. Substituição urgente
Quando o responsável decidir que a falta exige substituição urgente, o Board principal deve mostrar somente algo genérico, por exemplo:
⚠ Necessita de substituição urgente
Não devemos expor no Board principal qual funcionário faltou.
Isso evita apontar publicamente o funcionário que faltou.
27. Detalhes da falta
Em uma área específica de faltas, o administrador e os responsáveis autorizados poderão visualizar:
Funcionário
Sede
Vaga
Data
Responsável pela sede
Responsável pelo fornecimento
Status da falta
Necessita substituição?
Observação
Assim a informação detalhada fica restrita à área apropriada.
28. Falta quando o responsável pela sede e fornecedor são diferentes
Essa regra foi explicitamente definida.
Exemplo:
Sede: Toyohashi
Responsável pela sede: Paulo

Funcionário fornecido por: Andre
Se Carlos faltar, Paulo precisa saber da falta, porque a falta ocorreu na sede que ele administra.
Andre também precisa visualizar a falta porque foi quem forneceu Carlos.
Portanto uma falta pode ser relevante para:
Responsável pela sede
+
Responsável pelo fornecimento
+
Administrador
mesmo quando essas pessoas são diferentes.
29. Board principal e faltas
O Board principal não deve mostrar:
❌ Carlos faltou
Deve mostrar apenas:
⚠ Necessita de substituição urgente
quando essa opção tiver sido marcada.
Os detalhes ficam em outra área.
30. Pagamentos
O sistema também controla o pagamento dos funcionários e os valores recebidos pelos responsáveis.
Para sedes externas, os valores definidos são:
Funcionário
Manpower → ¥12.000
Forklift → ¥15.000
Esses são os valores destinados ao funcionário.
31. Valor do responsável
Para o responsável, foram definidos valores fixos:
Manpower → ¥16.000
Forklift → ¥18.000
Existe também a regra financeira mencionada de que o responsável recebe valores maiores no total, dependendo da operação, mas a estrutura atual do sistema deve preservar separadamente:
valor recebido;
valor pago ao funcionário;
comissão;
eventual extra.
Isso evita misturar valores diferentes da operação.
32. Responsável pode escolher quanto pagar ao funcionário
O responsável pode escolher quanto efetivamente paga ao funcionário dentro da operação.
Por exemplo, se o valor de referência disponível for:
¥16.000
e ele pagar:
¥12.000
a diferença pode representar a comissão.
Se decidir pagar mais:
¥13.000
a diferença diminui.
Se pagar um valor superior ao que estava previsto, pode existir:
Extra_Responsavel
33. Extra pago pelo responsável
Foi definido que às vezes o responsável pode pagar um valor extra do próprio bolso.
O sistema deve registrar isso e lembrar o responsável quando isso acontecer.
Isso evita que o responsável esqueça que colocou dinheiro próprio na operação.
34. Comissão
A comissão deve considerar a diferença entre:
Valor recebido
-
Valor pago ao funcionário
A estrutura já prevê:
Comissao_Total
Comissao_Responsavel_Sede
Comissao_Responsavel_Fornecimento
Extra_Responsavel
Isso permite separar a remuneração quando existe mais de um responsável envolvido.
35. Dois responsáveis na mesma operação
Quando:
Responsável da sede = Paulo
Responsável fornecedor = Andre
o sistema precisa saber que existem dois papéis diferentes.
A comissão pode então ser distribuída de acordo com as regras financeiras estabelecidas.
Isso deve ficar registrado na própria alocação para permitir auditoria posterior.
36. Prazo para pagamento
Foi definida uma regra importante:
O responsável possui até uma semana para realizar o pagamento ao funcionário.

Portanto o sistema deve controlar:
Data do trabalho
+
Prazo máximo de pagamento
O prazo deve ser evidenciado para o responsável para reduzir o risco de pagamento atrasado.
37. Alertas de pagamento
O sistema deve facilitar a visualização de pagamentos pendentes.
Idealmente, o responsável deve conseguir ver:
Pagamento pendente
Funcionário: Marcos
Data do trabalho: 18/08
Prazo para pagamento: 25/08
Status: PENDENTE
Conforme a data se aproxima, o sistema pode destacar a situação.
Por exemplo:
🟢 Dentro do prazo
🟡 Prazo próximo
🔴 Prazo vencido
A regra de negócio continua sendo uma semana; a classificação visual é apenas uma ferramenta para evitar atrasos.
38. Responsável não deve ter acesso administrativo completo
Os responsáveis não precisam acessar todas as tabelas diretamente.
A interface deve apresentar apenas o que é necessário para o trabalho deles.
As áreas planejadas são:
Vagas
Alocação
Pagamentos
Faltas
Enquanto o administrador possui acesso às informações administrativas completas.
39. Acesso às vagas
Os responsáveis:
podem visualizar todas as vagas;
podem filtrar para suas próprias sedes;
devem iniciar, por padrão, em "Minhas sedes";
podem selecionar outras datas;
podem visualizar vagas futuras;
podem verificar rapidamente se todas as vagas de suas sedes foram preenchidas.
40. Regra "Minhas sedes"
A filtragem é baseada no:
Sedes.Responsável_ID
e no responsável autenticado.
Se:
Sede.Responsável_ID = R001
e o usuário é:
R001
essa sede aparece em:
Minhas sedes
Se for:
R002
não aparece nessa visualização.
Mas pode aparecer em:
Todas as sedes
41. Alocação
O fluxo básico é:
Responsável
↓
seleciona data
↓
seleciona sede/vaga
↓
seleciona tipo
↓
seleciona funcionário
↓
cria alocação
O funcionário selecionável deve respeitar as regras de:
responsável que o cadastrou;
status válido;
disponibilidade;
vaga;
data.
42. Não permitir ultrapassar a quantidade da vaga
Se a vaga possui:
Quantidade = 6
e já existem:
6 alocações válidas
não pode ser adicionada uma sétima pessoa.
A vaga deve aparecer como:
✓ Completo
43. Cancelamento libera a vaga
Se uma pessoa cancelar:
ALOCADO
↓
CANCELADO
ela deixa de contar na quantidade preenchida.
Portanto:
6/6
pode voltar para:
5/6
1 vaga disponível
Isso permite que outro funcionário seja alocado.
44. Falta e disponibilidade
Uma falta também deve deixar de ser considerada como trabalho realizado.
Dependendo da decisão de substituição:
Sem substituição urgente
A falta é registrada para histórico/pagamento, mas não necessariamente cria uma ação urgente.
Com substituição urgente
O sistema deve sinalizar que ainda existe uma necessidade operacional naquele dia.
45. Princípio de histórico
O sistema deve evitar apagar registros importantes.
Eventos como:
alocação;
cancelamento;
falta;
pagamento;
devem preservar histórico.
A regra geral é:
Alterar o status do registro é preferível a apagar o registro.

Isso será especialmente importante quando o sistema deixar de usar somente Google Sheets e passar para um banco de dados real.
46. Estrutura conceitual das entidades
O sistema atualmente gira em torno destas entidades:
RESPONSAVEIS
      │
      ├──────────────┐
      ↓              ↓
   FUNCIONARIOS     SEDES
      │              │
      │              ↓
      │            VAGAS
      │              │
      └──────→ ALOCACOES
                    │
             ┌──────┴──────┐
             ↓             ↓
           FALTAS       PAGAMENTOS
47. Regra central do sistema
A lógica principal pode ser resumida assim:
Uma vaga representa uma necessidade de funcionários em uma determinada sede, data e função. Um responsável pela sede é responsável por acompanhar essa necessidade, enquanto um responsável pelo fornecimento pode fornecer funcionários para preenchê-la. Cada funcionário alocado ocupa uma posição da vaga enquanto sua alocação estiver válida. Cancelamentos e faltas não devem apagar o histórico, mas deixam de contar como alocações ativas.

48. Regras que ainda precisam ser formalizadas
Há alguns pontos que já foram discutidos parcialmente, mas que eu não considero 100% fechados ainda:
Status completos
Precisamos definir a lista oficial de status para:
funcionário;
sede;
vaga;
alocação;
pagamento;
falta.
Pagamento
Precisamos fechar exatamente a fórmula de:
Comissao_Total
Comissao_Responsavel_Sede
Comissao_Responsavel_Fornecimento
Extra_Responsavel
principalmente quando sede e fornecedor são pessoas diferentes.
Substituição
Precisamos definir exatamente o que acontece no banco quando:
Carlos faltou
↓
substituição urgente
↓
Andre fornece João
Provavelmente teremos que manter o registro de Carlos e criar uma nova alocação para João, em vez de substituir/apagar o registro original.
Autenticação
Ainda precisamos definir como o sistema identifica que:
marvin.masaru@gmail.com → Administrador
paulo@... → R001
andre@... → R002
e como isso será aplicado em todas as telas.
A arquitetura que eu usaria daqui para frente
Com essa especificação, eu separaria o sistema em módulos:
1. Autenticação
2. Funcionários
3. Responsáveis
4. Sedes
5. Vagas
6. Board
7. Alocações
8. Cancelamentos
9. Faltas
10. Substituições
11. Pagamentos
12. Comissões
13. Histórico
14. Permissões