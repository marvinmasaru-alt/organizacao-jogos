import { Component } from '@angular/core';

/**
 * Pagamentos e comissões, com indicador visual de prazo:
 * 🟢 no prazo / 🟡 próximo / 🔴 vencido (regra sempre "1 semana").
 * TODO: consumir GET /pagamentos/status-prazo?data=....
 */
@Component({
  selector: 'app-pagamentos',
  standalone: true,
  template: `<section><h1>Pagamentos</h1></section>`,
})
export class PagamentosComponent {}
