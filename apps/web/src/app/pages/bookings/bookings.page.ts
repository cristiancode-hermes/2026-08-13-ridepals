import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Booking } from '../../interfaces/models';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ToastService } from '../../services/toast.service';
import { apiError } from '../../utils/errors';

@Component({
  selector: 'app-bookings-page',
  standalone: true,
  imports: [RouterLink, StatusBadgeComponent, EmptyStateComponent],
  template: `
    <div class="space-y-6">
      <header>
        <h1 class="font-display font-bold text-3xl tracking-tight">Mis reservas</h1>
        <p class="text-ink-muted mt-1">Gestiona tus trayectos como pasajero y como conductor.</p>
      </header>

      <div class="flex gap-2 border-b border-border">
        <button
          class="px-4 py-2.5 font-semibold text-sm border-b-2 -mb-px transition-colors"
          [class]="tab() === 'passenger' ? 'border-accent text-accent-hover' : 'border-transparent text-ink-muted hover:text-ink'"
          (click)="tab.set('passenger')"
        >Como pasajero ({{ passenger().length }})</button>
        <button
          class="px-4 py-2.5 font-semibold text-sm border-b-2 -mb-px transition-colors"
          [class]="tab() === 'driver' ? 'border-accent text-accent-hover' : 'border-transparent text-ink-muted hover:text-ink'"
          (click)="tab.set('driver')"
        >Como conductor ({{ driver().length }})</button>
      </div>

      @if (loading()) {
        <div class="space-y-3">
          @for (i of [1, 2, 3]; track i) {
            <div class="card p-4 h-20 bg-surface-muted animate-pulse"></div>
          }
        </div>
      } @else {
        @for (b of tab() === 'passenger' ? passenger() : driver(); track b.id) {
          <a [routerLink]="['/bookings', b.id]" class="card p-4 flex items-center gap-4 hover:border-accent-hover transition-colors no-underline">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 text-sm font-semibold">
                <span class="truncate">{{ b.ride?.origin ?? '…' }}</span>
                <svg class="shrink-0 text-ink-faint" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                <span class="truncate">{{ b.ride?.dest ?? '…' }}</span>
              </div>
              <p class="text-xs text-ink-muted mt-1 font-mono">
                {{ b.occurrenceDate }} · {{ b.seats }} {{ b.seats === 1 ? 'plaza' : 'plazas' }}
                @if (b.ride?.driver) { · {{ b.ride!.driver!.username }} }
              </p>
            </div>
            <app-status-badge [status]="b.status" />
          </a>
        } @empty {
          <app-empty-state
            [title]="tab() === 'passenger' ? 'No has reservado ningún viaje' : 'Aún no tienes solicitudes'"
            message="Busca un trayecto y reserva tu asiento."
          >
            <a routerLink="/rides" class="btn-accent mt-4">Buscar viajes</a>
          </app-empty-state>
        }
      }
    </div>
  `,
})
export class BookingsPageComponent {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  readonly tab = signal<'passenger' | 'driver'>('passenger');
  readonly passenger = signal<Booking[]>([]);
  readonly driver = signal<Booking[]>([]);
  readonly loading = signal(true);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [p, d] = await Promise.all([
        lastValueFrom(this.http.get<Booking[]>('/api/bookings/mine')),
        lastValueFrom(this.http.get<Booking[]>('/api/bookings/as-driver')),
      ]);
      this.passenger.set(p);
      this.driver.set(d);
    } catch (err) {
      this.toast.error(apiError(err));
    } finally {
      this.loading.set(false);
    }
  }
}
