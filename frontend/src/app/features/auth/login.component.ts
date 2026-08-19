import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main>
      <h1>Alocação de Funcionários</h1>
      <form (ngSubmit)="entrar()">
        <label>
          E-mail
          <input
            type="email"
            name="email"
            [(ngModel)]="email"
            required
            autocomplete="username"
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            name="senha"
            [(ngModel)]="senha"
            required
            autocomplete="current-password"
          />
        </label>
        @if (erro()) {
          <p role="alert">{{ erro() }}</p>
        }
        <button type="submit" [disabled]="carregando()">Entrar</button>
      </form>
    </main>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  senha = '';
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);

  entrar(): void {
    this.erro.set(null);
    this.carregando.set(true);
    this.auth.login(this.email, this.senha).subscribe({
      next: () => {
        this.carregando.set(false);
        this.router.navigateByUrl('/board');
      },
      error: () => {
        this.carregando.set(false);
        this.erro.set('E-mail ou senha inválidos.');
      },
    });
  }
}
