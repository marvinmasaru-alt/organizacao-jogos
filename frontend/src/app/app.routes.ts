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
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
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
        path: 'alocacao',
        loadComponent: () =>
          import('./features/alocacao/alocacao.component').then(
            (m) => m.AlocacaoComponent,
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
        path: 'confirmacao-dia',
        loadComponent: () =>
          import('./features/confirmacao-dia/confirmacao-dia.component').then(
            (m) => m.ConfirmacaoDiaComponent,
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
      {
        path: 'configuracoes-vagas',
        canActivate: [perfilGuard(['ADMINISTRADOR'])],
        loadComponent: () =>
          import(
            './features/configuracoes-vagas/configuracoes-vagas.component'
          ).then((m) => m.ConfiguracoesVagasComponent),
      },
      {
        path: 'tipos-trabalho',
        canActivate: [perfilGuard(['ADMINISTRADOR'])],
        loadComponent: () =>
          import('./features/tipos-trabalho/tipos-trabalho.component').then(
            (m) => m.TiposTrabalhoComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
