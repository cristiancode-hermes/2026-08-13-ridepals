import { Component, input } from '@angular/core';
import { BookingStatus, STATUS_LABELS } from '../interfaces/models';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span class="badge" [class]="'badge-' + status()">
      {{ STATUS_LABELS[status()] }}
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<BookingStatus>();
  protected readonly STATUS_LABELS = STATUS_LABELS;
}
