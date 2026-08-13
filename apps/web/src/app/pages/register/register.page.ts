import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { apiError } from '../../utils/errors';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="min-h-[70vh] flex items-center justify-center py-8">
      <div class="w-full max-w-md">
        <div class="card p-6 md:p-8">
          <h1 class="font-display font-semibold text-xl mb-1">Crear cuenta</h1>
          <p class="text-sm text-ink-muted mb-6">Únete a la comunidad de coche compartido.</p>

          <form (ngSubmit)="submit()" class="space-y-5">
            <div>
              <label class="label-base" for="username">Usuario</label>
              <input
                id="username" name="username" type="text" required minlength="3" maxlength="30"
                autocomplete="off"
                class="input-base" [(ngModel)]="username"
                placeholder="p.ej. carmen87"
              />
            </div>
            <div>
              <label class="label-base" for="email">Email</label>
              <input
                id="email" name="email" type="email" required
                autocomplete="off"
                class="input-base" [(ngModel)]="email"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label class="label-base" for="password">Contraseña</label>
              <input
                id="password" name="password" type="password" required minlength="6"
                autocomplete="new-password"
                class="input-base" [(ngModel)]="password"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            @if (error()) {
              <p class="text-sm text-danger bg-danger/10 rounded-md px-3 py-2" role="alert">{{ error() }}</p>
            }

            <button type="submit" class="btn-accent w-full" [disabled]="loading()">
              @if (loading()) {
                <span class="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true"></span>
                Creando…
              } @else {
                Crear cuenta
              }
            </button>
          </form>

          <p class="text-sm text-ink-muted text-center mt-5">
            ¿Ya tienes cuenta?
            <a routerLink="/login" class="text-primary font-medium hover:text-accent-hover">Entra</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly username = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly loading = signal(false);
  readonly error = signal('');

  async submit(): Promise<void> {
    if (!this.username() || !this.email() || !this.password()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.register(this.username().trim(), this.email().trim(), this.password());
      this.toast.success('Cuenta creada. ¡Bienvenido!');
      await this.router.navigate(['/rides']);
    } catch (err) {
      this.error.set(apiError(err));
    } finally {
      this.loading.set(false);
    }
  }
}
