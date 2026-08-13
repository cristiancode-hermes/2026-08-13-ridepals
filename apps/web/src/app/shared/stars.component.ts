import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stars',
  standalone: true,
  template: `
    <span class="inline-flex items-center gap-0.5" [attr.aria-label]="rating() + ' de 5 estrellas'">
      @for (i of [1, 2, 3, 4, 5]; track i) {
        <svg
          width="15" height="15" viewBox="0 0 24 24"
          [attr.fill]="i <= rating() ? 'currentColor' : 'none'"
          [attr.stroke]="i <= rating() ? 'currentColor' : 'currentColor'"
          stroke-width="1.6" stroke-linejoin="round"
          class="text-warning" aria-hidden="true"
        ><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      }
      @if (count() !== null && count() !== undefined) {
        <span class="text-xs text-ink-muted ml-1">({{ count() }})</span>
      }
    </span>
  `,
})
export class StarsComponent {
  readonly rating = input.required<number>();
  readonly count = input<number | null>(null);
}
