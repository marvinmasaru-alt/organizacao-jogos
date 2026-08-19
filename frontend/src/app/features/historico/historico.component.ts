import { Component } from '@angular/core';

/**
 * Restrito a ADMINISTRADOR (perfilGuard na rota). Histórico completo de
 * cancelamentos: funcionário, vaga, data, responsável, data/motivo.
 * TODO: consumir GET /historico/cancelamentos.
 */
@Component({
  selector: 'app-historico',
  standalone: true,
  template: `<section><h1>Histórico</h1></section>`,
})
export class HistoricoComponent {}
