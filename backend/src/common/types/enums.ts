/**
 * Enums de status compartilhados entre módulos.
 *
 * ⚠️ CLAUDE.md marca a lista oficial e fechada de status como ponto em
 * aberto — os valores abaixo são um rascunho inicial coerente com as regras
 * de negócio já descritas, não devem ser tratados como definitivos até
 * confirmação.
 */

export enum PerfilUsuario {
  ADMINISTRADOR = 'ADMINISTRADOR',
  RESPONSAVEL = 'RESPONSAVEL',
}

export enum StatusFuncionario {
  ATIVO = 'ATIVO',
  PENDENTE = 'PENDENTE',
  INATIVO = 'INATIVO',
}

export enum TipoTrabalho {
  AJUDANTE = 'Ajudante',
  FORKLIFT = 'Forklift',
}

export enum StatusVaga {
  ABERTA = 'ABERTA',
  COMPLETA = 'COMPLETA',
}

export enum StatusAlocacao {
  ALOCADO = 'ALOCADO',
  CANCELADO = 'CANCELADO',
  FALTOU = 'FALTOU',
}

export enum StatusFalta {
  REGISTRADA = 'REGISTRADA',
  URGENTE = 'URGENTE_SUBSTITUICAO',
}

export enum StatusPagamento {
  NO_PRAZO = 'NO_PRAZO',
  PROXIMO_VENCIMENTO = 'PROXIMO_VENCIMENTO',
  VENCIDO = 'VENCIDO',
  PAGO = 'PAGO',
}
