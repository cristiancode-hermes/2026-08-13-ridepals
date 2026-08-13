import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Message } from '../../interfaces/models';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { apiError } from '../../utils/errors';

@Component({
  selector: 'app-messages-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="max-w-2xl mx-auto space-y-6">
      <header>
        <h1 class="font-display font-bold text-3xl tracking-tight">Mensajes del viaje</h1>
        <p class="text-ink-muted mt-1">Conversa con los participantes antes de salir.</p>
      </header>

      <div class="card p-5 space-y-4">
        @if (loading()) {
          <div class="space-y-3 animate-pulse">
            <div class="h-12 bg-surface-muted rounded w-2/3"></div>
            <div class="h-12 bg-surface-muted rounded w-1/2 ml-auto"></div>
            <div class="h-12 bg-surface-muted rounded w-3/4"></div>
          </div>
        } @else if (messages().length === 0) {
          <p class="text-sm text-ink-muted text-center py-8">Todavía no hay mensajes en este hilo.</p>
        } @else {
          <div class="space-y-3">
            @for (m of messages(); track m.id) {
              <div
                class="max-w-[85%] rounded-lg px-4 py-2.5 text-sm"
                [class]="m.senderId === auth.user()?.id
                  ? 'ml-auto bg-primary text-white rounded-br-sm'
                  : 'bg-surface-muted text-ink rounded-bl-sm'"
              >
                <p class="text-xs font-semibold mb-0.5 opacity-80">{{ m.sender?.username ?? '…' }}</p>
                <p class="whitespace-pre-wrap break-words">{{ m.body }}</p>
                <p class="text-[11px] opacity-60 mt-1">{{ m.createdAt.slice(0, 16).replace('T', ' ') }}</p>
              </div>
            }
          </div>
        }

        <form (ngSubmit)="send()" class="flex gap-2 pt-2 border-t border-border">
          <input
            class="input-base flex-1" [(ngModel)]="draft" name="draft" required
            placeholder="Escribe un mensaje…" autocomplete="off"
            [attr.aria-label]="'Mensaje'"
          />
          <button type="submit" class="btn-primary" [disabled]="sending() || !draft().trim()">
            @if (sending()) { Enviando… } @else { Enviar }
          </button>
        </form>
      </div>
    </div>
  `,
})
export class MessagesPageComponent {
  readonly rideId = input.required<string>();

  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  readonly messages = signal<Message[]>([]);
  readonly loading = signal(true);
  readonly sending = signal(false);
  readonly draft = signal('');

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const msgs = await lastValueFrom(this.http.get<Message[]>(`/api/messages/${this.rideId()}`));
      this.messages.set(msgs);
      if (msgs.length === 0) {
        // Conductor sin mensajes aún: busca su reserva de este viaje (as-driver incluye ride)
        const asDriver = await lastValueFrom(
          this.http.get<Array<{ id: string; rideId: string }>>('/api/bookings/as-driver'),
        ).catch(() => []);
        const mine = asDriver.find((b) => b.rideId === this.rideId());
        if (mine) localStorage.setItem('rp_last_booking', mine.id);
      } else {
        localStorage.setItem('rp_last_booking', msgs[0].bookingId);
      }
    } catch (err) {
      this.toast.error(apiError(err));
    } finally {
      this.loading.set(false);
    }
  }

  async send(): Promise<void> {
    const body = this.draft().trim();
    if (!body) return;
    this.sending.set(true);
    try {
      const msg = await lastValueFrom(
        this.http.post<Message>('/api/messages', {
          rideId: this.rideId(),
          bookingId: this.guessBookingId(),
          body,
        }),
      );
      this.messages.update((m) => [...m, msg]);
      this.draft.set('');
    } catch (err) {
      this.toast.error(apiError(err));
    } finally {
      this.sending.set(false);
    }
  }

  /**
   * El hilo pertenece a una reserva concreta; si el usuario es el conductor y hay
   * varias reservas, usamos la primera del hilo (el servidor valida la pertenencia).
   */
  private guessBookingId(): string {
    const first = this.messages()[0];
    if (first) return first.bookingId;
    const fromStorage = localStorage.getItem('rp_last_booking');
    return fromStorage ?? '';
  }
}
