import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { PublicUser, Review, UserStats } from '../../interfaces/models';
import { StarsComponent } from '../../shared/stars.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ToastService } from '../../services/toast.service';
import { apiError } from '../../utils/errors';

@Component({
  selector: 'app-public-profile-page',
  standalone: true,
  imports: [RouterLink, StarsComponent, EmptyStateComponent],
  template: `
    @if (user()) {
      <div class="max-w-2xl mx-auto space-y-6">
        <header class="card p-6">
          <div class="flex items-center gap-4">
            <span class="w-16 h-16 rounded-full bg-surface-muted border border-border flex items-center justify-center font-display font-bold text-2xl uppercase">
              {{ user()!.username.charAt(0) }}
            </span>
            <div>
              <h1 class="font-display font-bold text-2xl">{{ user()!.username }}</h1>
              <p class="text-sm text-ink-muted">
                Miembro desde {{ user()!.createdAt.slice(0, 10) }} · {{ user()!.vehicleCount }} vehículo(s)
              </p>
              @if (stats()) {
                <div class="flex items-center gap-3 mt-2">
                  <app-stars [rating]="stats()!.avgRating" [count]="stats()!.reviewCount" />
                  <span class="text-xs text-ink-faint font-mono">
                    {{ stats()!.ridesGiven }} viajes dados · {{ stats()!.ridesTaken }} tomados
                  </span>
                </div>
              }
            </div>
          </div>
          @if (user()!.bio) {
            <p class="text-sm mt-4">{{ user()!.bio }}</p>
          }
          @if (isSelf()) {
            <a routerLink="/profile" class="btn-ghost !h-10 text-sm mt-4">Editar mi perfil</a>
          }
        </header>

        <section aria-label="Reseñas recibidas">
          <h2 class="font-display font-semibold text-lg mb-3">Reseñas recibidas</h2>
          @if (reviews().length === 0) {
            <app-empty-state title="Sin reseñas todavía" message="Las reseñas llegan tras completar viajes." />
          } @else {
            <div class="space-y-3">
              @for (r of reviews(); track r.id) {
                <div class="card p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <app-stars [rating]="r.rating" />
                      @if (r.author) {
                        <span class="text-sm text-ink-muted">{{ r.author.username }}</span>
                      }
                    </div>
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
      </div>
    }
  `,
})
export class PublicProfilePageComponent implements OnInit {
  readonly id = input.required<string>();

  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  readonly user = signal<PublicUser | null>(null);
  readonly reviews = signal<Review[]>([]);
  readonly stats = signal<UserStats | null>(null);
  private readonly selfId = signal<string | null>(null);

  readonly isSelf = () => this.selfId() === this.user()?.id;

  ngOnInit(): void {
    const token = localStorage.getItem('rp_token');
    try {
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.selfId.set(payload.sub ?? null);
      }
    } catch {
      /* token inválido: se ignora */
    }
    void this.load();
  }

  async load(): Promise<void> {
    try {
      const [user, reviews, stats] = await Promise.all([
        lastValueFrom(this.http.get<PublicUser>(`/api/users/${this.id()}`)),
        lastValueFrom(this.http.get<Review[]>(`/api/users/${this.id()}/reviews`)),
        lastValueFrom(this.http.get<UserStats>(`/api/users/${this.id()}/stats`)).catch(() => null),
      ]);
      this.user.set(user);
      this.reviews.set(reviews);
      this.stats.set(stats);
    } catch (err) {
      this.toast.error(apiError(err));
    }
  }
}
