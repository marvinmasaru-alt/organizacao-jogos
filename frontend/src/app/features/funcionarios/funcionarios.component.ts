import { Component } from '@angular/core';

/**
 * Lista de funcionários; administrador aprova cadastros PENDENTE.
 * TODO: consumir GET /funcionarios e PATCH /funcionarios/:id/aprovar.
 */
@Component({
  selector: 'app-funcionarios',
  standalone: true,
  template: `<section><h1>Funcionários</h1></section>`,
})
export class FuncionariosComponent {}
