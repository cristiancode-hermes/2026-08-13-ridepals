import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { FavoriteRoute, RideOccurrence } from '../../interfaces/models';
import { RideCardComponent } from '../../shared/ride-card.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ToastService } from '../../services/toast.service';
import { apiError } from '../../utils/errors';

@Component({
  selector: 'app-rides-search-page',
  standalone: true,
  imports: [FormsModule, RouterLink, RideCardComponent, EmptyStateComponent],
  template: `
    <div class="space-y-8">
      <header>
        <h1 class="font-display font-bold text-3xl md:text-4xl tracking-tight">
          Buscar <span class="text-accent">viajes</span>
        </h1>
        <p class="text-ink-muted mt-2">Encuentra asientos libres cerca de ti.</p>
      </header>

      <!-- Buscador -->
      <form (ngSubmit)="search()" class="card p-4 md:p-5 space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="label-base" for="origin">Origen</label>
            <input id="origin" class="input-base" [(ngModel)]="origin" name="origin" placeholder="p.ej. Madrid (Atocha)" autocomplete="off" />
          </div>
          <div>
            <label class="label-base" for="dest">Destino</label>
            <input id="dest" class="input-base" [(ngModel)]="dest" name="dest" placeholder="p.ej. Guadalajara (Centro)" autocomplete="off" />
          </div>
          <div>
            <label class="label-base" for="date">Fecha</label>
            <input id="date" type="date" class="input-base" [(ngModel)]="date" name="date" />
          </div>
          <div class="flex items-end gap-3">
            <button type="submit" class="btn-primary flex-1">Buscar</button>
            <a routerLink="/rides/new" class="btn-accent">Publicar</a>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-4 text-sm">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" class="w-4 h-4 accent-primary" [(ngModel)]="eco" name="eco" />
            <span class="text-ink-muted">Solo ecológicos</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" class="w-4 h-4 accent-primary" [(ngModel)]="showFavorites" name="showFavorites" />
            <span class="text-ink-muted">Usar mis rutas favoritas</span>
          </label>
        </div>
      </form>

      <!-- Rutas favoritas como chips rápidos -->
      @if (favorites().length > 0) {
        <section aria-label="Rutas favoritas">
          <h2 class="font-display font-semibold text-lg mb-3">Rutas guardadas</h2>
          <div class="flex flex-wrap gap-2">
            @for (f of favorites(); track f.id) {
              <button
                class="px-3 py-2 rounded-full border border-border text-sm font-medium hover:border-accent-hover hover:text-accent-hover transition-colors bg-surface"
                (click)="useFavorite(f)"
              >
                {{ f.origin }} → {{ f.dest }}
              </button>
            }
          </div>
        </section>
      }

      <!-- Resultados -->
      <section aria-label="Resultados de búsqueda">
        @if (loading()) {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (i of [1, 2, 3, 4, 5, 6]; track i) {
              <div class="card p-4 space-y-3 animate-pulse">
                <div class="h-4 bg-surface-muted rounded w-3/4"></div>
                <div class="h-3 bg-surface-muted rounded w-1/2"></div>
                <div class="h-3 bg-surface-muted rounded w-2/3"></div>
              </div>
            }
          </div>
        } @else if (results().length === 0) {
          <app-empty-state
            title="No hay viajes que coincidan"
            message="Prueba a cambiar la fecha o el destino, o publica tu propio viaje."
          >
            <a routerLink="/rides/new" class="btn-accent mt-4">Publicar un viaje</a>
          </app-empty-state>
        } @else {
          <div class="flex items-baseline justify-between mb-3">
            <h2 class="font-display font-semibold text-lg">
              {{ results().length }} {{ results().length === 1 ? 'viaje' : 'viajes' }} encontrados
            </h2>
            <p class="text-xs text-ink-faint">Ordenados por proximidad</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (occ of results(); track occ.rideId + occ.date) {
              <app-ride-card [occ]="occ" />
            }
          </div>
        }
      </section>
    </div>
  `,
})
export class RidesSearchPageComponent {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly origin = signal('');
  readonly dest = signal('');
  readonly date = signal('');
  readonly eco = signal(false);
  readonly showFavorites = signal(false);
  readonly loading = signal(false);
  readonly results = signal<RideOccurrence[]>([]);
  readonly favorites = signal<FavoriteRoute[]>([]);

  constructor() {
    const qp = this.route.snapshot.queryParamMap;
    if (qp.get('origin')) this.origin.set(qp.get('origin')!);
    if (qp.get('dest')) this.dest.set(qp.get('dest')!);
    void this.loadFavorites();
    void this.search();
  }

  async loadFavorites(): Promise<void> {
    try {
      const favs = await lastValueFrom(this.http.get<FavoriteRoute[]>('/api/favorites'));
      this.favorites.set(favs);
    } catch {
      /* sin favoritos no pasa nada */
    }
  }

  useFavorite(f: FavoriteRoute): void {
    this.origin.set(f.origin);
    this.dest.set(f.dest);
    void this.search();
  }

  async search(): Promise<void> {
    this.loading.set(true);
    try {
      const params = new URLSearchParams();
      if (this.origin().trim()) params.set('origin', this.origin().trim());
      if (this.dest().trim()) params.set('dest', this.dest().trim());
      if (this.date()) params.set('date', this.date());
      if (this.eco()) params.set('eco', 'true');
      const qs = params.toString();
      const res = await lastValueFrom(
        this.http.get<RideOccurrence[]>(`/api/rides${qs ? '?' + qs : ''}`),
      );
      this.results.set(res);
    } catch (err) {
      this.toast.error(apiError(err));
    } finally {
      this.loading.set(false);
    }
  }
}
