# Dashboard

## Objetivo

O Dashboard é a tela principal do sistema.

Ele deve permitir que o responsável veja rapidamente:

- quais vagas existem hoje;
- quantas pessoas são necessárias;
- quantas pessoas já estão alocadas;
- quais vagas estão incompletas;
- quais pagamentos estão pendentes;
- quais problemas precisam de atenção.

O Dashboard é principalmente uma tela de consulta.

---

# 1. Usuário

O Dashboard deve respeitar o usuário autenticado.

## Responsável

O responsável deve visualizar somente informações relacionadas às suas sedes e aos seus funcionários.

O frontend não deve decidir isso sozinho.

O backend deve filtrar os dados.

---

# 2. Layout

A tela deve ser organizada da seguinte maneira:

```text
┌──────────────────────────────────────────────────────────────┐
│ Dashboard                               [Data: 20/08/2026]   │
├──────────────────────────────────────────────────────────────┤
│ PENDÊNCIAS                                                   │
│                                                              │
│ 🔴 2 vagas precisam de substituição                          │
│ 🟡 3 pagamentos próximos do vencimento                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                                                              │
│     Vagas.        Ocupação       Pendências                  │
│      12              87%              3                      │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ VAGAS DE HOJE                  Minhas sedes / todas as sedes │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Toyohashi                                                │ │
│ │ Ajudante       8 / 10        ████████░░     80%          │ │
│ │ Forklift       0 / 1         ░░░░░░░░░░     00%.         │ │
│ │ [Ver vaga]                                               │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Komaki                                                   │ │
│ │ Empilhadeira   5 / 5         ██████████    100%          │ │
│ │ [Ver vaga]                                               │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 3. Filtro de data
Por padrão, o Dashboard deve abrir mostrando o dia atual.
O usuário deve poder alterar a data.
Exemplo:
[ ← ] 20/08/2026 [ → ]

Ao alterar a data, todos os dados da tela devem ser atualizados.

## 4. Card de Vagas
Mostrar:
quantidade total de vagas;
quantidade de vagas completas;
quantidade de vagas incompletas.
Exemplo:
VAGAS

12
vagas hoje

9 completas
3 incompletas

### 5. Card de Ocupação
Mostrar a ocupação geral.
Cálculo:
total de funcionários alocados
/
total de funcionários necessários
Exemplo:
87%

87 funcionários
100 necessários

### 6. Lista de vagas
A lista principal deve mostrar uma linha/card para cada vaga.
Cada vaga deve mostrar:
- sede;
- data;
- tipo de trabalho;
- quantidade necessária;
- quantidade alocada;
- percentual de ocupação;
- status.
Exemplo:
Toyohashi
Ajudante

8 / 10
80%

Status:
INCOMPLETA

## 7. Status da vaga
Completa
Quando:
alocados >= necessários
Mostrar:
COMPLETA
Incompleta
Quando:
alocados < necessários
Mostrar:
INCOMPLETA
Substituição urgente
Quando uma alocação foi cancelada e a vaga ficou abaixo da quantidade necessária.
Mostrar:
SUBSTITUIÇÃO URGENTE

## 8. Pendências
Mostrar somente pendências que exigem atenção do usuário.
Exemplo:
PENDÊNCIAS

🔴 Substituição urgente
Toyohashi — Ajudante
Faltam 2 pessoas
deve aparecer as substituições urgentes apenas do dia atual, não deverá aparecer as substituições que são de dias anteriores

🟡 Pagamento próximo do vencimento
João — ¥12.000
Vence em 2 dias
O pagamento tem que ser feito em 7 dias, se não tiver registro de pagamento a partir de 4 dias do vencimento tem que colocar em amarelo, e apartir de 2 dias do vencimento deixar em vermelho

## 10. Interações
Clicar em uma vaga
Ao clicar em uma vaga:
Dashboard
    ↓
Detalhes da vaga
A tela de detalhes deverá mostrar:
funcionários alocados;
vagas disponíveis;
responsável;
status;
informações da vaga.
Clicar em "Alocar"
O usuário deve ser direcionado para a tela de alocação.

## 12. Dados
O frontend não deve acessar Google Sheets diretamente.
Fluxo:
Frontend
    ↓
API Backend
    ↓
GoogleSheetsService
    ↓
Google Sheets
O backend deve fornecer ao frontend somente os dados necessários.

## 13. Regras importantes
O Dashboard não deve:
cadastrar funcionários;
cadastrar responsáveis;
cadastrar sedes;
alterar dados diretamente no Google Sheets;
permitir acesso a dados de outro responsável.

## 14. Responsividade
A interface deve funcionar em:
Desktop
Tablet
Celular
No celular, os cards devem ser reorganizados verticalmente.

## 15. Estados da interface
A tela deve possuir estados para:
Carregando
Mostrar skeleton/loading.
Sem dados
Mostrar:
Nenhuma vaga encontrada para esta data.
Erro
Mostrar:
Não foi possível carregar os dados.
Tente novamente.
Dados carregados
Mostrar normalmente o Dashboard.

---