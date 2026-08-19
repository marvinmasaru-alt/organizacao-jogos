import { Component } from '@angular/core';

/**
 * Registro de falta: responsável escolhe explicitamente entre "Falta
 * registrada" e "Falta + necessita substituição urgente" — nunca marcado
 * automaticamente. Falta não gera multa; cancela o pagamento do dia.
 * TODO: consumir GET /faltas e POST /faltas.
 */
@Component({
  selector: 'app-faltas',
  standalone: true,
  template: `<section><h1>Faltas</h1></section>`,
})
export class FaltasComponent {}
