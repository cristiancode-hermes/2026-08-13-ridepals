import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { apiError } from '../../utils/errors';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="max-w-xl mx-auto space-y-6">
      <header>
        <h1 class="font-display font-bold text-3xl tracking-tight">Mi perfil</h1>
        <p class="text-ink-muted mt-1">Tu información pública en RidePals.</p>
      </header>

      <div class="card p-5 space-y-5">
        <div class="flex items-center gap-4">
          <span class="w-16 h-16 rounded-full bg-surface-muted border border-border flex items-center justify-center font-display font-bold text-2xl uppercase">
            {{ auth.user()?.username?.charAt(0) ?? '?' }}
          </span>
          <div>
            <h2 class="font-display font-semibold text-xl">{{ auth.user()?.username }}</h2>
            <p class="text-sm text-ink-muted">{{ auth.user()?.email }}</p>
            <p class="text-xs text-ink-faint mt-1">Miembro desde {{ (auth.user()?.createdAt ?? '').slice(0, 10) }}</p>
          </div>
        </div>

        <form (ngSubmit)="save()" class="space-y-4">
          <div>
            <label class="label-base" for="bio">Bio</label>
            <textarea
              id="bio" rows="3" maxlength="300"
              class="input-base !h-auto py-2.5 resize-none"
              [(ngModel)]="bio" name="bio"
              placeholder="Cuéntale a la comunidad quién eres…"
            ></textarea>
          </div>
          @if (error()) {
            <p class="text-sm text-danger bg-danger/10 rounded-md px-3 py-2" role="alert">{{ error() }}</p>
          }
          <button type="submit" class="btn-primary" [disabled]="saving()">
            @if (saving()) { Guardando… } @else { Guardar perfil }
          </button>
        </form>
      </div>

      <div class="flex items-center justify-between card p-4">
        <div>
          <p class="font-semibold text-sm">Ver perfil público</p>
          <p class="text-xs text-ink-muted">Tu reputación y reseñas visibles para la comunidad.</p>
        </div>
        <a [href]="'/profile/' + auth.user()?.id" class="btn-ghost !h-10 text-sm">Abrir</a>
      </div>
    </div>
  `,
})
export class ProfilePageComponent {
  protected readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  readonly bio = signal('');
  readonly saving = signal(false);
  readonly error = signal('');

  constructor() {
    this.bio.set(this.auth.user()?.bio ?? '');
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    try {
      await this.auth.updateProfile({ bio: this.bio().trim() });
      this.toast.success('Perfil actualizado');
    } catch (err) {
      this.error.set(apiError(err));
    } finally {
      this.saving.set(false);
    }
  }
}
