import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { FuelType, FUEL_LABELS, Ride, Vehicle } from '../../interfaces/models';
import { ToastService } from '../../services/toast.service';
import { apiError } from '../../utils/errors';

const WEEKDAYS: Array<{ v: number; label: string }> = [
  { v: 1, label: 'L' },
  { v: 2, label: 'M' },
  { v: 3, label: 'X' },
  { v: 4, label: 'J' },
  { v: 5, label: 'V' },
  { v: 6, label: 'S' },
  { v: 7, label: 'D' },
];

@Component({
  selector: 'app-ride-create-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="max-w-2xl mx-auto space-y-6">
      <header>
        <a routerLink="/rides" class="text-sm text-ink-muted hover:text-accent-hover">← Volver a buscar</a>
        <h1 class="font-display font-bold text-3xl mt-2">Publicar un viaje</h1>
        <p class="text-ink-muted mt-1">Comparte tu trayecto y ahorra en combustible.</p>
      </header>

      <form (ngSubmit)="submit()" class="card p-5 md:p-6 space-y-6">
        <!-- Tipo de viaje -->
        <fieldset>
          <legend class="label-base">Tipo de viaje</legend>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              class="h-12 rounded-md border font-semibold text-sm transition-colors"
              [class]="recurring() ? 'border-border text-ink-muted hover:border-accent-hover' : 'border-primary bg-primary-soft text-primary'"
              (click)="recurring.set(false)"
            >
              Puntual
            </button>
            <button
              type="button"
              class="h-12 rounded-md border font-semibold text-sm transition-colors"
              [class]="recurring() ? 'border-primary bg-primary-soft text-primary' : 'border-border text-ink-muted hover:border-accent-hover'"
              (click)="recurring.set(true)"
            >
              Recurrente
            </button>
          </div>
        </fieldset>

        <!-- Ruta -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="label-base" for="origin">Origen</label>
            <input id="origin" class="input-base" required [(ngModel)]="origin" name="origin" autocomplete="off" placeholder="p.ej. Plaza del Sol, Madrid" />
          </div>
          <div>
            <label class="label-base" for="dest">Destino</label>
            <input id="dest" class="input-base" required [(ngModel)]="dest" name="dest" autocomplete="off" placeholder="p.ej. Polígono Norte, Alcobendas" />
          </div>
        </div>

        <!-- Coordenadas -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label class="label-base" for="originLat">Lat. origen</label>
            <input id="originLat" type="number" step="0.0001" class="input-base" [(ngModel)]="originLat" name="originLat" placeholder="40.4168" />
          </div>
          <div>
            <label class="label-base" for="originLng">Lng. origen</label>
            <input id="originLng" type="number" step="0.0001" class="input-base" [(ngModel)]="originLng" name="originLng" placeholder="-3.7038" />
          </div>
          <div>
            <label class="label-base" for="destLat">Lat. destino</label>
            <input id="destLat" type="number" step="0.0001" class="input-base" [(ngModel)]="destLat" name="destLat" placeholder="40.5050" />
          </div>
          <div>
            <label class="label-base" for="destLng">Lng. destino</label>
            <input id="destLng" type="number" step="0.0001" class="input-base" [(ngModel)]="destLng" name="destLng" placeholder="-3.6550" />
          </div>
        </div>

        <!-- Fecha/hora -->
        @if (!recurring()) {
          <div>
            <label class="label-base" for="datetime">Fecha y hora de salida</label>
            <input id="datetime" type="datetime-local" class="input-base" required [(ngModel)]="datetime" name="datetime" />
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="label-base">Días de la semana</label>
              <div class="flex gap-1.5 flex-wrap">
                @for (d of WEEKDAYS; track d.v) {
                  <button
                    type="button"
                    class="w-10 h-10 rounded-md border font-semibold text-sm transition-colors"
                    [class]="weekdays().includes(d.v) ? 'border-primary bg-primary-soft text-primary' : 'border-border text-ink-muted hover:border-accent-hover'"
                    (click)="toggleWeekday(d.v)"
                    [attr.aria-label]="'Día ' + d.label"
                  >{{ d.label }}</button>
                }
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="label-base" for="recurTime">Hora</label>
                <input id="recurTime" type="time" class="input-base" [(ngModel)]="recurTime" name="recurTime" />
              </div>
              <div>
                <label class="label-base" for="recurEnd">Hasta</label>
                <input id="recurEnd" type="date" class="input-base" [(ngModel)]="recurEnd" name="recurEnd" />
              </div>
            </div>
          </div>
        }

        <!-- Vehículo, plazas, precio -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="label-base" for="vehicleId">Vehículo</label>
            <select id="vehicleId" class="input-base" [(ngModel)]="vehicleId" name="vehicleId" required>
              <option value="" disabled>Selecciona…</option>
              @for (v of vehicles(); track v.id) {
                <option [value]="v.id">{{ v.brand }} {{ v.model }} · {{ v.plate }} ({{ v.seats }} plazas)</option>
              }
            </select>
          </div>
          <div>
            <label class="label-base" for="seats">Plazas libres</label>
            <input id="seats" type="number" min="1" max="8" class="input-base" required [(ngModel)]="seats" name="seats" />
          </div>
          <div>
            <label class="label-base" for="price">Precio por plaza (€)</label>
            <input id="price" type="number" min="0" step="0.5" class="input-base" required [(ngModel)]="price" name="price" />
          </div>
        </div>

        <div>
          <label class="label-base" for="notes">Notas (opcional)</label>
          <textarea
            id="notes" rows="2" maxlength="300"
            class="input-base !h-auto py-2.5 resize-none"
            [(ngModel)]="notes" name="notes"
            placeholder="p.ej. Salgo de la estación, parada en La Arboleda…"
          ></textarea>
        </div>

        @if (!vehicles().length) {
          <div class="rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning">
            Necesitas un vehículo para publicar.
            <a routerLink="/vehicles" class="font-semibold underline">Añade uno</a> antes de continuar.
          </div>
        }

        @if (error()) {
          <p class="text-sm text-danger bg-danger/10 rounded-md px-3 py-2" role="alert">{{ error() }}</p>
        }

        <div class="flex gap-3">
          <button type="submit" class="btn-accent flex-1" [disabled]="loading() || vehicles().length === 0">
            @if (loading()) {
              <span class="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true"></span>
              Publicando…
            } @else {
              Publicar viaje
            }
          </button>
          <a routerLink="/rides" class="btn-ghost">Cancelar</a>
        </div>
      </form>
    </div>
  `,
})
export class RideCreatePageComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly WEEKDAYS = WEEKDAYS;
  protected readonly FUEL_LABELS = FUEL_LABELS;

  readonly vehicles = signal<Vehicle[]>([]);
  readonly recurring = signal(false);
  readonly origin = signal('');
  readonly dest = signal('');
  readonly originLat = signal<number | null>(null);
  readonly originLng = signal<number | null>(null);
  readonly destLat = signal<number | null>(null);
  readonly destLng = signal<number | null>(null);
  readonly datetime = signal('');
  readonly weekdays = signal<number[]>([1, 2, 3, 4, 5]);
  readonly recurTime = signal('08:00');
  readonly recurEnd = signal('');
  readonly vehicleId = signal('');
  readonly seats = signal<number | null>(null);
  readonly price = signal<number | null>(null);
  readonly notes = signal('');
  readonly loading = signal(false);
  readonly error = signal('');

  constructor() {
    void this.loadVehicles();
  }

  async loadVehicles(): Promise<void> {
    try {
      const vs = await lastValueFrom(this.http.get<Vehicle[]>('/api/vehicles'));
      this.vehicles.set(vs);
      if (vs.length > 0) this.vehicleId.set(vs[0].id);
    } catch {
      /* se muestra el aviso de vehículo */
    }
  }

  toggleWeekday(v: number): void {
    this.weekdays.update((w) => (w.includes(v) ? w.filter((x) => x !== v) : [...w, v].sort()));
  }

  async submit(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const body: Record<string, unknown> = {
        origin: this.origin().trim(),
        dest: this.dest().trim(),
        originLat: Number(this.originLat()),
        originLng: Number(this.originLng()),
        destLat: Number(this.destLat()),
        destLng: Number(this.destLng()),
        seats: Number(this.seats()),
        price: Number(this.price()),
        vehicleId: this.vehicleId(),
        notes: this.notes().trim() || undefined,
      };

      if (this.recurring()) {
        if (this.weekdays().length === 0) {
          this.error.set('Selecciona al menos un día de la semana');
          this.loading.set(false);
          return;
        }
        body['recurrence'] = {
          weekdays: this.weekdays(),
          time: this.recurTime(),
          endDate: this.recurEnd(),
        };
      } else {
        if (!this.datetime()) {
          this.error.set('Indica la fecha y hora de salida');
          this.loading.set(false);
          return;
        }
        body['datetime'] = new Date(this.datetime()).toISOString();
      }

      const ride = await lastValueFrom(this.http.post<Ride>('/api/rides', body));
      this.toast.success(`Viaje publicado · ${ride.distanceKm?.toFixed(1) ?? '?'} km`);
      await this.router.navigate(['/rides', ride.id]);
    } catch (err) {
      this.error.set(apiError(err));
    } finally {
      this.loading.set(false);
    }
  }
}
