import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { FuelType, FUEL_LABELS, Vehicle } from '../../interfaces/models';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ToastService } from '../../services/toast.service';
import { apiError } from '../../utils/errors';

const FUEL_TYPES: FuelType[] = ['gasolina', 'diesel', 'hibrido', 'electrico'];

@Component({
  selector: 'app-vehicles-page',
  standalone: true,
  imports: [FormsModule, EmptyStateComponent],
  template: `
    <div class="space-y-6">
      <header class="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 class="font-display font-bold text-3xl tracking-tight">Mis vehículos</h1>
          <p class="text-ink-muted mt-1">Añade el coche con el que publicas tus viajes (máx. 4).</p>
        </div>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        @for (v of vehicles(); track v.id) {
          <div class="card p-5 space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="font-display font-semibold text-lg">{{ v.brand }} {{ v.model }}</h2>
                <p class="font-mono text-sm text-ink-muted">{{ v.plate }}</p>
              </div>
              <span class="badge" [class]="v.fuelType === 'electrico' || v.fuelType === 'hibrido' ? 'badge-confirmed' : 'badge-completed'">
                {{ FUEL_LABELS[v.fuelType] }}
              </span>
            </div>
            <div class="flex items-center gap-4 text-sm text-ink-muted">
              <span>{{ v.seats }} plazas</span>
            </div>
            <div class="flex items-center gap-3 pt-3 border-t border-border">
              <button class="btn-ghost !h-9 !px-3 text-xs" (click)="editing.set(editing() === v.id ? null : v.id)">
                {{ editing() === v.id ? 'Cerrar' : 'Editar' }}
              </button>
              <button class="btn-ghost !h-9 !px-3 text-xs !border-danger/50 !text-danger hover:!border-danger" (click)="remove(v)">
                Eliminar
              </button>
            </div>

            @if (editing() === v.id) {
              <form class="grid grid-cols-2 gap-3 pt-2" (ngSubmit)="update(v)">
                <div>
                  <label class="label-base" for="seats-{{ v.id }}">Plazas</label>
                  <input id="seats-{{ v.id }}" type="number" min="2" max="9" class="input-base" [(ngModel)]="editSeats" name="seats" required />
                </div>
                <div>
                  <label class="label-base" for="fuel-{{ v.id }}">Combustible</label>
                  <select id="fuel-{{ v.id }}" class="input-base" [(ngModel)]="editFuel" name="fuel">
                    @for (f of FUEL_TYPES; track f) {
                      <option [value]="f">{{ FUEL_LABELS[f] }}</option>
                    }
                  </select>
                </div>
                <button type="submit" class="btn-primary col-span-2" [disabled]="busy()">Guardar cambios</button>
              </form>
            }
          </div>
        } @empty {
          <div class="md:col-span-2">
            <app-empty-state title="Sin vehículos todavía" message="Añade tu primer coche para poder publicar viajes." />
          </div>
        }
      </div>

      <!-- Añadir vehículo -->
      <section class="card p-5" aria-label="Añadir vehículo">
        <h2 class="font-display font-semibold text-lg mb-4">Añadir vehículo</h2>
        <form (ngSubmit)="add()" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label class="label-base" for="brand">Marca</label>
            <input id="brand" class="input-base" required [(ngModel)]="brand" name="brand" placeholder="Seat" autocomplete="off" />
          </div>
          <div>
            <label class="label-base" for="model">Modelo</label>
            <input id="model" class="input-base" required [(ngModel)]="model" name="model" placeholder="Leon" autocomplete="off" />
          </div>
          <div>
            <label class="label-base" for="plate">Matrícula</label>
            <input id="plate" class="input-base font-mono" required [(ngModel)]="plate" name="plate" placeholder="1234ABC" autocomplete="off" />
          </div>
          <div>
            <label class="label-base" for="vseats">Plazas</label>
            <input id="vseats" type="number" min="2" max="9" class="input-base" required [(ngModel)]="seats" name="vseats" placeholder="5" />
          </div>
          <div>
            <label class="label-base" for="fuel">Combustible</label>
            <select id="fuel" class="input-base" [(ngModel)]="fuel" name="fuel">
              @for (f of FUEL_TYPES; track f) {
                <option [value]="f">{{ FUEL_LABELS[f] }}</option>
              }
            </select>
          </div>
          <div class="sm:col-span-2 lg:col-span-5">
            <button type="submit" class="btn-accent" [disabled]="busy()">Añadir vehículo</button>
          </div>
        </form>
      </section>
    </div>
  `,
})
export class VehiclesPageComponent {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly FUEL_LABELS = FUEL_LABELS;
  protected readonly FUEL_TYPES = FUEL_TYPES;

  readonly vehicles = signal<Vehicle[]>([]);
  readonly editing = signal<string | null>(null);
  readonly busy = signal(false);

  readonly brand = signal('');
  readonly model = signal('');
  readonly plate = signal('');
  readonly seats = signal(5);
  readonly fuel = signal<FuelType>('gasolina');
  readonly editSeats = signal(5);
  readonly editFuel = signal<FuelType>('gasolina');

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.vehicles.set(await lastValueFrom(this.http.get<Vehicle[]>('/api/vehicles')));
    } catch (err) {
      this.toast.error(apiError(err));
    }
  }

  async add(): Promise<void> {
    this.busy.set(true);
    try {
      await lastValueFrom(
        this.http.post<Vehicle>('/api/vehicles', {
          brand: this.brand().trim(),
          model: this.model().trim(),
          plate: this.plate().trim().toUpperCase(),
          seats: Number(this.seats()),
          fuelType: this.fuel(),
        }),
      );
      this.toast.success('Vehículo añadido');
      this.brand.set('');
      this.model.set('');
      this.plate.set('');
      await this.load();
    } catch (err) {
      this.toast.error(apiError(err));
    } finally {
      this.busy.set(false);
    }
  }

  async update(v: Vehicle): Promise<void> {
    this.busy.set(true);
    try {
      await lastValueFrom(
        this.http.patch<Vehicle>(`/api/vehicles/${v.id}`, {
          seats: Number(this.editSeats()),
          fuelType: this.editFuel(),
        }),
      );
      this.toast.success('Vehículo actualizado');
      this.editing.set(null);
      await this.load();
    } catch (err) {
      this.toast.error(apiError(err));
    } finally {
      this.busy.set(false);
    }
  }

  async remove(v: Vehicle): Promise<void> {
    if (!confirm(`¿Eliminar ${v.brand} ${v.model} (${v.plate})?`)) return;
    this.busy.set(true);
    try {
      await lastValueFrom(this.http.delete(`/api/vehicles/${v.id}`));
      this.toast.info('Vehículo eliminado');
      await this.load();
    } catch (err) {
      this.toast.error(apiError(err));
    } finally {
      this.busy.set(false);
    }
  }
}
