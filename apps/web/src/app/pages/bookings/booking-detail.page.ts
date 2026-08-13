import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Booking } from '../../interfaces/models';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { apiError } from '../../utils/errors';

@Component({
  selector: 'app-booking-detail-page',
  standalone: true,
  imports: [FormsModule, RouterLink, StatusBadgeComponent],
  template: `
    @if (booking()) {
      <div class="max-w-2xl mx-auto space-y-6">
        <header>
          <a routerLink="/bookings" class="text-sm text-ink-muted hover:text-accent-hover">← Mis reservas</a>
          <div class="flex items-center gap-3 mt-2">
            <h1 class="font-display font-bold text-2xl">Reserva</h1>
            <app-status-badge [status]="booking()!.status" />
          </div>
        </header>

        <div class="card p-5 space-y-4">
          <div class="flex items-center gap-2 font-semibold">
            <span>{{ booking()!.ride?.origin }}</span>
            <svg class="shrink-0 text-accent" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            <span>{{ booking()!.ride?.dest }}</span>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p class="text-xs text-ink-faint">Fecha</p>
              <p class="font-mono font-medium">{{ booking()!.occurrenceDate }}</p>
            </div>
            <div>
              <p class="text-xs text-ink-faint">Plazas</p>
              <p class="font-medium">{{ booking()!.seats }}</p>
            </div>
            <div>
              <p class="text-xs text-ink-faint">Importe</p>
              <p class="font-mono font-medium">
                {{ booking()!.ride ? (booking()!.ride!.price * booking()!.seats).toFixed(2) + ' €' : '—' }}
              </p>
            </div>
            <div>
              <p class="text-xs text-ink-faint">Conductor</p>
              @if (booking()!.ride?.driver) {
                <a [routerLink]="['/profile', booking()!.ride!.driver!.id]" class="font-medium hover:text-accent-hover">
                  {{ booking()!.ride!.driver!.username }}
                </a>
              }
            </div>
          </div>

          @if (booking()!.cancelReason) {
            <div class="rounded-md border border-border bg-surface-muted px-3 py-2.5 text-sm">
              <span class="font-semibold">Motivo:</span> {{ booking()!.cancelReason }}
            </div>
          }

          <!-- Acciones conductor -->
          @if (isDriver()) {
            <div class="pt-4 border-t border-border space-y-4">
              <h2 class="font-display font-semibold text-lg">Gestionar solicitud</h2>
              @if (booking()!.status === 'pending') {
                <div class="flex gap-3">
                  <button class="btn-primary" (click)="setStatus('confirmed')" [disabled]="busy()">Confirmar</button>
                  <button class="btn-ghost !border-danger/50 !text-danger hover:!border-danger" (click)="setStatus('rejected')" [disabled]="busy()">Rechazar</button>
                </div>
              } @else if (booking()!.status === 'confirmed') {
                <button class="btn-accent" (click)="complete()" [disabled]="busy()">
                  Marcar viaje completado
                </button>
                <p class="text-xs text-ink-faint">Al completarlo, ambas partes podrán valorarse.</p>
              }
            </div>
          }

          <!-- Acciones pasajero -->
          @if (!isDriver() && (booking()!.status === 'pending' || booking()!.status === 'confirmed')) {
            <div class="pt-4 border-t border-border">
              <button class="btn-ghost !border-danger/50 !text-danger hover:!border-danger w-full" (click)="cancel()" [disabled]="busy()">
                Cancelar reserva
              </button>
            </div>
          }

          @if (booking()!.status === 'completed' && booking()!.ride) {
            <div class="pt-4 border-t border-border">
              <a [routerLink]="['/messages', booking()!.rideId]" class="btn-ghost w-full">Abrir hilo de mensajes</a>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class BookingDetailPageComponent {
  readonly id = input.required<string>();

  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly booking = signal<Booking | null>(null);
  readonly busy = signal(false);

  readonly isDriver = () => this.booking()?.ride?.driverId === this.auth.user()?.id;

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      const b = await lastValueFrom(this.http.get<Booking>(`/api/bookings/${this.id()}`));
      this.booking.set(b);
    } catch (err) {
      this.toast.error(apiError(err));
    }
  }

  async setStatus(status: 'confirmed' | 'rejected'): Promise<void> {
    this.busy.set(true);
    try {
      const b = await lastValueFrom(
        this.http.patch<Booking>(`/api/bookings/${this.id()}/status`, { status }),
      );
      this.booking.set(b);
      this.toast.success(status === 'confirmed' ? 'Reserva confirmada' : 'Solicitud rechazada');
    } catch (err) {
      this.toast.error(apiError(err));
    } finally {
      this.busy.set(false);
    }
  }

  async complete(): Promise<void> {
    this.busy.set(true);
    try {
      await lastValueFrom(
        this.http.post<{ completed: number }>('/api/bookings/complete', {
          rideId: this.booking()!.rideId,
          occurrenceDate: this.booking()!.occurrenceDate,
        }),
      );
      this.toast.success('Viaje completado. ¡Valora a tus pasajeros!');
      await this.load();
    } catch (err) {
      this.toast.error(apiError(err));
    } finally {
      this.busy.set(false);
    }
  }

  async cancel(): Promise<void> {
    const reason = prompt('¿Motivo de la cancelación? (opcional)') ?? '';
    if (reason === null) return;
    this.busy.set(true);
    try {
      const b = await lastValueFrom(
        this.http.patch<Booking>(`/api/bookings/${this.id()}/cancel`, { reason: reason || undefined }),
      );
      this.booking.set(b);
      this.toast.info('Reserva cancelada');
    } catch (err) {
      this.toast.error(apiError(err));
    } finally {
      this.busy.set(false);
    }
  }
}
