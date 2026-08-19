import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { perfilGuard } from './core/auth/perfil.guard';

/**
 * Rotas carregadas sob demanda (lazy), uma feature por tela conforme os
 * "Módulos planejados" do CLAUDE.md. Cancelamentos e Substituições vivem
 * dentro das features de Alocações/Faltas; Comissões dentro de Pagamentos;
 * Permissões é transversal (guards), não uma tela própria.
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'board', pathMatch: 'full' },
      {
        path: 'board',
        loadComponent: () =>
          import('./features/board/board.component').then(
            (m) => m.BoardComponent,
          ),
      },
      {
        path: 'funcionarios',
        loadComponent: () =>
          import('./features/funcionarios/funcionarios.component').then(
            (m) => m.FuncionariosComponent,
          ),
      },
      {
        path: 'sedes',
        loadComponent: () =>
          import('./features/sedes/sedes.component').then(
            (m) => m.SedesComponent,
          ),
      },
      {
        path: 'vagas',
        loadComponent: () =>
          import('./features/vagas/vagas.component').then(
            (m) => m.VagasComponent,
          ),
      },
      {
        path: 'alocacoes',
        loadComponent: () =>
          import('./features/alocacoes/alocacoes.component').then(
            (m) => m.AlocacoesComponent,
          ),
      },
      {
        path: 'faltas',
        loadComponent: () =>
          import('./features/faltas/faltas.component').then(
            (m) => m.FaltasComponent,
          ),
      },
      {
        path: 'pagamentos',
        loadComponent: () =>
          import('./features/pagamentos/pagamentos.component').then(
            (m) => m.PagamentosComponent,
          ),
      },
      {
        path: 'historico',
        canActivate: [perfilGuard(['ADMINISTRADOR'])],
        loadComponent: () =>
          import('./features/historico/historico.component').then(
            (m) => m.HistoricoComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'board' },
];
