import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { apiError } from '../../utils/errors';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="min-h-[70vh] flex items-center justify-center py-8">
      <div class="w-full max-w-md">
        <div class="card p-6 md:p-8">
          <div class="flex items-center gap-3 mb-6">
            <span class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-white font-display font-bold text-lg" aria-hidden="true">R</span>
            <div>
              <h1 class="font-display font-bold text-2xl leading-tight">RidePals</h1>
              <p class="text-sm text-ink-muted">Vuelve a la carretera</p>
            </div>
          </div>

          <h2 class="font-display font-semibold text-xl mb-1">Iniciar sesión</h2>
          <p class="text-sm text-ink-muted mb-6">Entra con tu usuario o email.</p>

          <form (ngSubmit)="submit()" class="space-y-5">
            <div>
              <label class="label-base" for="identifier">Usuario o email</label>
              <input
                id="identifier" name="identifier" type="text" required
                autocomplete="off"
                class="input-base" [(ngModel)]="identifier"
                placeholder="demo o demo@ridepals.dev"
              />
            </div>
            <div>
              <label class="label-base" for="password">Contraseña</label>
              <input
                id="password" name="password" type="password" required
                autocomplete="new-password"
                class="input-base" [(ngModel)]="password"
                placeholder="••••••••"
              />
            </div>

            @if (error()) {
              <p class="text-sm text-danger bg-danger/10 rounded-md px-3 py-2" role="alert">{{ error() }}</p>
            }

            <button type="submit" class="btn-primary w-full" [disabled]="loading()">
              @if (loading()) {
                <span class="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true"></span>
                Entrando…
              } @else {
                Entrar
              }
            </button>
          </form>

          <!-- Credenciales demo visibles (regla de Cristian: sin autocompletar) -->
          <div class="mt-5 rounded-md border border-border bg-surface-muted px-3 py-2.5 text-center">
            <p class="text-xs text-ink-muted">
              <span class="font-semibold">Cuenta demo:</span>
              <span class="font-mono">demo@ridepals.dev / demo1234</span>
            </p>
          </div>

          <p class="text-sm text-ink-muted text-center mt-5">
            ¿Aún no tienes cuenta?
            <a routerLink="/register" class="text-primary font-medium hover:text-accent-hover">Regístrate</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly identifier = signal('');
  readonly password = signal('');
  readonly loading = signal(false);
  readonly error = signal('');

  async submit(): Promise<void> {
    if (!this.identifier() || !this.password()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.identifier().trim(), this.password());
      this.toast.success(`Bienvenido, ${this.auth.user()?.username ?? ''}!`);
      await this.router.navigate(['/rides']);
    } catch (err) {
      this.error.set(apiError(err));
    } finally {
      this.loading.set(false);
    }
  }
}
