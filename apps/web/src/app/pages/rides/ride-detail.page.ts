import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import {
  Booking,
  Review,
  Ride,
  RideOccurrence,
} from '../../interfaces/models';
import { StarsComponent } from '../../shared/stars.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { apiError } from '../../utils/errors';

@Component({
  selector: 'app-ride-detail-page',
  standalone: true,
  imports: [FormsModule, RouterLink, StarsComponent, EmptyStateComponent],
  template: `
    @if (loading()) {
      <div class="max-w-3xl mx-auto space-y-4 animate-pulse">
        <div class="h-8 bg-surface-muted rounded w-2/3"></div>
        <div class="card p-5 h-40 bg-surface-muted"></div>
      </div>
    } @else if (ride()) {
      <div class="max-w-3xl mx-auto space-y-6">
        <div class="flex items-center gap-3">
          <a routerLink="/rides" class="text-sm text-ink-muted hover:text-accent-hover">← Buscar</a>
          @if (isMine()) {
            <span class="ml-auto badge badge-confirmed">Tu viaje</span>
          }
        </div>

        <header>
          <div class="flex items-center gap-3 font-display font-bold text-2xl md:text-3xl leading-tight">
            <span>{{ ride()!.origin }}</span>
            <svg class="shrink-0 text-accent" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            <span>{{ ride()!.dest }}</span>
          </div>
          <p class="text-sm text-ink-muted mt-2 font-mono">
            {{ ride()!.datetime.slice(0, 16).replace('T', ' · ') }}
            @if (ride()!.recurrence) {
              · Recurrente L–V {{ ride()!.recurrence!.time }}
            }
          </p>
        </header>

        <div class="card p-5 space-y-5">
          <div class="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <p class="text-xs text-ink-faint uppercase tracking-wide">Precio</p>
              <p class="font-mono font-semibold text-xl">{{ ride()!.price.toFixed(2) }} €</p>
            </div>
            <div>
              <p class="text-xs text-ink-faint uppercase tracking-wide">Distancia</p>
              <p class="font-mono font-semibold text-xl">
                @if (ride()!.distanceKm) { {{ ride()!.distanceKm!.toFixed(1) }} km }
                @else { — }
              </p>
            </div>
            <div>
              <p class="text-xs text-ink-faint uppercase tracking-wide">Plazas</p>
              <p class="font-mono font-semibold text-xl">{{ ride()!.seats }}</p>
            </div>
            <div>
              <p class="text-xs text-ink-faint uppercase tracking-wide">Conductor</p>
              @if (ride()!.driver) {
                <a [routerLink]="['/profile', ride()!.driver!.id]" class="font-semibold hover:text-accent-hover">
                  {{ ride()!.driver!.username }}
                </a>
              }
            </div>
          </div>

          @if (ride()!.vehicle) {
            <div class="flex items-center gap-3 pt-4 border-t border-border">
              <span class="font-mono text-sm bg-surface-muted rounded-md px-2.5 py-1.5">
                {{ ride()!.vehicle!.brand }} {{ ride()!.vehicle!.model }}
              </span>
              <span class="font-mono text-xs text-ink-muted">{{ ride()!.vehicle!.plate }}</span>
            </div>
          }

          @if (ride()!.notes) {
            <div class="pt-4 border-t border-border">
              <p class="text-sm text-ink-muted">{{ ride()!.notes }}</p>
            </div>
          }

          <!-- Reserva -->
          @if (!isMine()) {
            <div class="pt-4 border-t border-border">
              <h2 class="font-display font-semibold text-lg mb-3">Reservar asiento</h2>
              @if (myBooking()) {
                <div class="rounded-md border border-border bg-surface-muted px-3 py-3 text-sm">
                  Ya tienes una reserva en este viaje
                  (<a [routerLink]="['/bookings', myBooking()!.id]" class="font-semibold text-primary hover:text-accent-hover">ver detalle</a>).
                </div>
              } @else {
                <div class="flex flex-wrap items-end gap-3">
                  <div class="w-28">
                    <label class="label-base" for="seats">Plazas</label>
                    <select id="seats" class="input-base" [(ngModel)]="bookSeats" name="bookSeats">
                      @for (n of [1, 2, 3, 4]; track n) {
                        <option [value]="n">{{ n }}</option>
                      }
                    </select>
                  </div>
                  <button class="btn-primary" (click)="book()" [disabled]="booking()">
                    @if (booking()) { Reservando… } @else { Reservar por {{ (ride()!.price * bookSeats()).toFixed(2) }} € }
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <!-- Ocurrencias (recurrente) -->
        @if (occurrences().length > 1) {
          <section aria-label="Próximas ocurrencias">
            <h2 class="font-display font-semibold text-lg mb-3">Próximas salidas</h2>
            <div class="space-y-2">
              @for (occ of occurrences(); track occ.date) {
                <div class="card px-4 py-3 flex items-center justify-between text-sm">
                  <span class="font-mono">{{ occ.date }}</span>
                  <span class="text-ink-muted">{{ occ.time }}</span>
                  <span class="text-ink-muted">{{ occ.availableSeats }} plazas</span>
                </div>
              }
            </div>
          </section>
        }

        <!-- Reseñas -->
        <section aria-label="Reseñas del viaje">
          <h2 class="font-display font-semibold text-lg mb-3">Reseñas de este viaje</h2>
          @if (reviews().length === 0) {
            <app-empty-state title="Todavía no hay reseñas" message="Las reseñas aparecen tras completar el viaje." />
          } @else {
            <div class="space-y-3">
              @for (r of reviews(); track r.id) {
                <div class="card p-4">
                  <div class="flex items-center justify-between">
                    <app-stars [rating]="r.rating" />
                    <span class="text-xs text-ink-faint">{{ r.createdAt.slice(0, 10) }}</span>
                  </div>
                  @if (r.comment) {
                    <p class="text-sm mt-2">{{ r.comment }}</p>
                  }
                </div>
              }
            </div>
          }
        </section>

        <!-- Acciones del conductor -->
        @if (isMine()) {
          <div class="flex gap-3">
            <a [routerLink]="['/messages', ride()!.id]" class="btn-ghost flex-1">Mensajes del viaje</a>
            <button class="btn-ghost !border-danger/50 !text-danger hover:!border-danger" (click)="cancelRide()" [disabled]="cancelling()">
              @if (cancelling()) { Cancelando… } @else { Cancelar viaje }
            </button>
          </div>
        }
      </div>
    }
  `,
})
export class RideDetailPageComponent {
  readonly id = input.required<string>();

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly ride = signal<Ride | null>(null);
  readonly occurrences = signal<RideOccurrence[]>([]);
  readonly reviews = signal<Review[]>([]);
  readonly myBooking = signal<Booking | null>(null);
  readonly loading = signal(true);
  readonly booking = signal(false);
  readonly cancelling = signal(false);
  readonly bookSeats = signal(1);

  readonly isMine = () => this.ride()?.driverId === this.auth.user()?.id;

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [ride, occs, reviews, bookings] = await Promise.all([
        lastValueFrom(this.http.get<Ride>(`/api/rides/${this.id()}`)),
        lastValueFrom(this.http.get<RideOccurrence[]>(`/api/rides/${this.id()}/occurrences`)),
        lastValueFrom(this.http.get<Review[]>(`/api/reviews/ride/${this.id()}`)).catch(() => []),
        lastValueFrom(this.http.get<Booking[]>('/api/bookings/mine')).catch(() => []),
      ]);
      this.ride.set(ride);
      this.occurrences.set(occs);
      this.reviews.set(reviews);
      this.myBooking.set(bookings.find((b) => b.rideId === this.id()) ?? null);
    } catch (err) {
      this.toast.error(apiError(err));
    } finally {
      this.loading.set(false);
    }
  }

  async book(): Promise<void> {
    this.booking.set(true);
    try {
      const booking = await lastValueFrom(
        this.http.post<Booking>('/api/bookings', {
          rideId: this.id(),
          occurrenceDate: this.ride()!.datetime.slice(0, 10),
          seats: this.bookSeats(),
        }),
      );
      this.toast.success('Reserva solicitada. El conductor debe confirmarla.');
      this.myBooking.set(booking);
    } catch (err) {
      this.toast.error(apiError(err));
    } finally {
      this.booking.set(false);
    }
  }

  async cancelRide(): Promise<void> {
    if (!confirm('¿Cancelar este viaje? Se cancelarán las reservas futuras.')) return;
    this.cancelling.set(true);
    try {
      await lastValueFrom(this.http.delete(`/api/rides/${this.id()}`));
      this.toast.info('Viaje cancelado');
      await this.router.navigate(['/rides']);
    } catch (err) {
      this.toast.error(apiError(err));
    } finally {
      this.cancelling.set(false);
    }
  }
}
