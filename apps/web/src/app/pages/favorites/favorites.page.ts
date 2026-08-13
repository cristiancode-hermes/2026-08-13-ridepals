import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { FavoriteRoute } from '../../interfaces/models';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ToastService } from '../../services/toast.service';
import { apiError } from '../../utils/errors';

@Component({
  selector: 'app-favorites-page',
  standalone: true,
  imports: [FormsModule, RouterLink, EmptyStateComponent],
  template: `
    <div class="space-y-6">
      <header>
        <h1 class="font-display font-bold text-3xl tracking-tight">Rutas favoritas</h1>
        <p class="text-ink-muted mt-1">Guarda tus trayectos habituales y búscalos en un clic.</p>
      </header>

      <form (ngSubmit)="add()" class="card p-4 md:p-5 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <label class="label-base" for="origin">Origen</label>
          <input id="origin" class="input-base" required [(ngModel)]="origin" name="origin" placeholder="p.ej. Madrid (Atocha)" autocomplete="off" />
        </div>
        <div>
          <label class="label-base" for="dest">Destino</label>
          <input id="dest" class="input-base" required [(ngModel)]="dest" name="dest" placeholder="p.ej. Guadalajara (Centro)" autocomplete="off" />
        </div>
        <button type="submit" class="btn-accent" [disabled]="busy()">Guardar ruta</button>
      </form>

      @if (favorites().length === 0) {
        <app-empty-state title="Sin rutas guardadas" message="Añade tus trayectos habituales para buscar más rápido." />
      } @else {
        <div class="space-y-2">
          @for (f of favorites(); track f.id) {
            <div class="card px-4 py-3 flex items-center gap-3">
              <div class="flex items-center gap-2 font-semibold text-sm min-w-0 flex-1">
                <span class="truncate">{{ f.origin }}</span>
                <svg class="shrink-0 text-accent" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                <span class="truncate">{{ f.dest }}</span>
              </div>
              <a
                [routerLink]="['/rides']"
                [queryParams]="{ origin: f.origin, dest: f.dest }"
                class="btn-ghost !h-9 !px-3 text-xs shrink-0"
              >Buscar</a>
              <button
                class="btn-ghost !h-9 !px-3 text-xs !border-danger/50 !text-danger hover:!border-danger shrink-0"
                (click)="remove(f)"
                [attr.aria-label]="'Eliminar ruta ' + f.origin + ' a ' + f.dest"
              >Eliminar</button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class FavoritesPageComponent {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  readonly favorites = signal<FavoriteRoute[]>([]);
  readonly origin = signal('');
  readonly dest = signal('');
  readonly busy = signal(false);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.favorites.set(await lastValueFrom(this.http.get<FavoriteRoute[]>('/api/favorites')));
    } catch (err) {
      this.toast.error(apiError(err));
    }
  }

  async add(): Promise<void> {
    this.busy.set(true);
    try {
      await lastValueFrom(
        this.http.post<FavoriteRoute>('/api/favorites', {
          origin: this.origin().trim(),
          dest: this.dest().trim(),
        }),
      );
      this.toast.success('Ruta guardada');
      this.origin.set('');
      this.dest.set('');
      await this.load();
    } catch (err) {
      this.toast.error(apiError(err));
    } finally {
      this.busy.set(false);
    }
  }

  async remove(f: FavoriteRoute): Promise<void> {
    this.busy.set(true);
    try {
      await lastValueFrom(this.http.delete(`/api/favorites/${f.id}`));
      this.favorites.update((fs) => fs.filter((x) => x.id !== f.id));
    } catch (err) {
      this.toast.error(apiError(err));
    } finally {
      this.busy.set(false);
    }
  }
}
