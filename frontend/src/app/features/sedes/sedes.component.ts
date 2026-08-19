import { Component } from '@angular/core';

/**
 * Filtros "Minhas sedes" / "Todas as sedes".
 * TODO: consumir GET /sedes e GET /sedes/responsavel/:id.
 */
@Component({
  selector: 'app-sedes',
  standalone: true,
  template: `<section><h1>Sedes</h1></section>`,
})
export class SedesComponent {}
