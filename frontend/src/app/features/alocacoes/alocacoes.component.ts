import { Component } from '@angular/core';

/**
 * Fluxo de criação: data -> sede/vaga -> tipo -> funcionário -> cria
 * alocação. Inclui ação de cancelamento (nunca apaga, só muda status).
 * TODO: consumir GET/POST /alocacoes e PATCH /alocacoes/:id/cancelar.
 */
@Component({
  selector: 'app-alocacoes',
  standalone: true,
  template: `<section><h1>Alocações</h1></section>`,
})
export class AlocacoesComponent {}
