import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { DashboardStats } from '../../interfaces/models';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ToastService } from '../../services/toast.service';
import { apiError } from '../../utils/errors';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent],
  template: `
    <div class="space-y-6">
      <header>
        <h1 class="font-display font-bold text-3xl tracking-tight">Mi panel</h1>
        <p class="text-ink-muted mt-1">Tu impacto compartiendo coche, de un vistazo.</p>
      </header>

      @if (loading()) {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="card p-5 h-24 bg-surface-muted animate-pulse"></div>
          }
        </div>
      } @else if (stats()) {
        <!-- KPIs -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="card p-5">
            <p class="text-xs text-ink-faint font-medium uppercase tracking-wide">Viajes dados</p>
            <p class="font-mono font-bold text-3xl mt-1">{{ stats()!.ridesGiven }}</p>
          </div>
          <div class="card p-5">
            <p class="text-xs text-ink-faint font-medium uppercase tracking-wide">Viajes tomados</p>
            <p class="font-mono font-bold text-3xl mt-1">{{ stats()!.ridesTaken }}</p>
          </div>
          <div class="card p-5">
            <p class="text-xs text-ink-faint font-medium uppercase tracking-wide">Km ahorrados</p>
            <p class="font-mono font-bold text-3xl mt-1">{{ stats()!.kmSaved.toFixed(0) }}</p>
            <p class="text-xs text-success font-semibold mt-1">{{ stats()!.co2SavedKg.toFixed(1) }} kg CO₂ evitados</p>
          </div>
          <div class="card p-5">
            <p class="text-xs text-ink-faint font-medium uppercase tracking-wide">€ ahorrados</p>
            <p class="font-mono font-bold text-3xl mt-1">{{ stats()!.moneySaved.toFixed(2) }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Rating -->
          <div class="card p-5">
            <h2 class="font-display font-semibold text-lg mb-2">Reputación</h2>
            <div class="flex items-baseline gap-3">
              <p class="font-display font-bold text-4xl">{{ stats()!.avgRating.toFixed(1) }}</p>
              <p class="text-sm text-ink-muted">{{ stats()!.reviewCount }} reseñas</p>
            </div>
          </div>

          <!-- Serie mensual -->
          <div class="card p-5">
            <h2 class="font-display font-semibold text-lg mb-3">Viajes dados por mes</h2>
            @if (stats()!.monthlySeries.length === 0) {
              <p class="text-sm text-ink-muted">Aún no hay actividad mensual.</p>
            } @else {
              <div class="flex items-end gap-3 h-32" role="img" [attr.aria-label]="'Gráfico de viajes mensuales'">
                @for (m of stats()!.monthlySeries; track m.month) {
                  <div class="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <span class="font-mono text-xs">{{ m.rides }}</span>
                    <div
                      class="w-full rounded-t-md bg-primary transition-colors hover:bg-accent"
                      [style.height.px]="barHeight(m.rides)"
                    ></div>
                    <span class="font-mono text-[10px] text-ink-faint truncate">{{ m.month.slice(5) }}/{{ m.month.slice(2, 4) }}</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Próximos viajes -->
        <section aria-label="Próximos viajes">
          <h2 class="font-display font-semibold text-lg mb-3">Próximos viajes</h2>
          @if (stats()!.upcomingRides.length === 0) {
            <app-empty-state title="Sin viajes próximos" message="Busca un trayecto o publica uno nuevo.">
              <div class="flex gap-3 justify-center mt-4">
                <a routerLink="/rides" class="btn-primary">Buscar viajes</a>
                <a routerLink="/rides/new" class="btn-accent">Publicar</a>
              </div>
            </app-empty-state>
          } @else {
            <div class="space-y-2">
              @for (u of stats()!.upcomingRides; track u.rideId + u.date) {
                <a [routerLink]="['/rides', u.rideId]" class="card px-4 py-3 flex items-center gap-3 hover:border-accent-hover transition-colors no-underline">
                  <span class="font-mono text-sm bg-surface-muted rounded-md px-2 py-1 shrink-0">{{ u.date }}</span>
                  <span class="text-sm font-semibold truncate">{{ u.origin }}</span>
                  <svg class="shrink-0 text-accent" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  <span class="text-sm font-semibold truncate">{{ u.dest }}</span>
                </a>
              }
            </div>
          }
        </section>
      }
    </div>
  `,
})
export class DashboardPageComponent {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  readonly stats = signal<DashboardStats | null>(null);
  readonly loading = signal(true);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.stats.set(
        await lastValueFrom(this.http.get<DashboardStats>('/api/dashboard/stats')),
      );
    } catch (err) {
      this.toast.error(apiError(err));
    } finally {
      this.loading.set(false);
    }
  }

  /** Altura de barra relativa al máximo de la serie (mín. 8px). */
  barHeight(rides: number): number {
    const series = this.stats()?.monthlySeries ?? [];
    const max = Math.max(...series.map((m) => m.rides), 1);
    return Math.max(8, Math.round((rides / max) * 100));
  }
}
