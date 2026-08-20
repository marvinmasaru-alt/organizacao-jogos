import { Component } from '@angular/core';

/**
 * Board principal: resumo por sede (tipo, X/Y, ✓ Completo / N disponíveis),
 * seletor de data (padrão hoje, navegável para o futuro), link de
 * localização clicável, e indicador "⚠ Necessita substituição urgente"
 * sem nunca expor quem faltou.
 * TODO: consumir GET /board?data=... e GET /faltas/board?data=....
 */
@Component({
  selector: 'app-board',
  standalone: true,
  template: `<section><h1>Board</h1></section>`,
})
export class BoardComponent {}
