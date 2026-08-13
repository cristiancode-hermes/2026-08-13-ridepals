import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RideOccurrence } from '../interfaces/models';

@Component({
  selector: 'app-ride-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a
      [routerLink]="['/rides', occ().rideId]"
      class="ride-card group block no-underline"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <span class="truncate">{{ occ().ride?.origin }}</span>
            <svg class="shrink-0 text-ink-faint" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            <span class="truncate">{{ occ().ride?.dest }}</span>
          </div>
          <p class="text-xs text-ink-muted mt-1 font-mono">
            {{ occ().date }} · {{ occ().time }}
          </p>
          @if (occ().ride?.notes) {
            <p class="text-[13px] text-ink-muted mt-2 line-clamp-2">{{ occ().ride!.notes }}</p>
          }
        </div>
        <div class="text-right shrink-0">
          <p class="font-mono font-semibold text-base flash-accent">
            {{ occ().ride?.price != null ? occ().ride!.price.toFixed(2) + ' €' : '—' }}
          </p>
          <p class="text-xs text-ink-muted mt-1">
            {{ occ().availableSeats }} plazas
          </p>
        </div>
      </div>
      @if (occ().ride?.driver) {
        <div class="flex items-center gap-2 mt-3 pt-3 border-t border-border">
          <span class="w-6 h-6 rounded-full bg-surface-muted border border-border flex items-center justify-center text-[11px] font-semibold uppercase">
            {{ occ().ride!.driver!.username.charAt(0) }}
          </span>
          <span class="text-xs text-ink-muted">{{ occ().ride!.driver!.username }}</span>
          @if (occ().ride?.vehicle) {
            <span class="ml-auto font-mono text-[11px] text-ink-faint">
              {{ occ().ride!.vehicle!.brand }} {{ occ().ride!.vehicle!.model }} · {{ occ().ride!.vehicle!.plate }}
            </span>
          }
        </div>
      }
    </a>
  `,
})
export class RideCardComponent {
  readonly occ = input.required<RideOccurrence>();
}
