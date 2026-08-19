import { Component } from '@angular/core';

/**
 * Visão detalhada por sede: posição a posição, quem está alocado e quem
 * forneceu ("Ainda não preenchido" quando vazio).
 * TODO: consumir GET /vagas?data=....
 */
@Component({
  selector: 'app-vagas',
  standalone: true,
  template: `<section><h1>Vagas</h1></section>`,
})
export class VagasComponent {}
