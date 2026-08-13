import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen flex flex-col bg-bg">
      <nav
        class="h-16 sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-sm"
        aria-label="Navegación principal"
      >
        <div class="max-w-[1200px] mx-auto px-4 md:px-8 h-full flex items-center gap-2 md:gap-6">
          <a routerLink="/rides" class="flex items-center gap-2 shrink-0">
            <span
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white font-display font-bold text-sm"
              aria-hidden="true"
              >R</span
            >
            <span class="font-display font-bold text-lg tracking-tight hidden sm:block"
              >Ride<span class="text-accent">Pals</span></span
            >
          </a>

          @if (auth.isAuthenticated()) {
            <div class="hidden md:flex items-center gap-1 text-sm font-medium">
              <a routerLink="/rides" routerLinkActive="text-accent-hover" class="px-3 py-2 rounded-md hover:text-accent-hover transition-colors">Buscar viajes</a>
              <a routerLink="/rides/new" routerLinkActive="text-accent-hover" class="px-3 py-2 rounded-md hover:text-accent-hover transition-colors">Publicar</a>
              <a routerLink="/bookings" routerLinkActive="text-accent-hover" class="px-3 py-2 rounded-md hover:text-accent-hover transition-colors">Reservas</a>
              <a routerLink="/favorites" routerLinkActive="text-accent-hover" class="px-3 py-2 rounded-md hover:text-accent-hover transition-colors">Favoritas</a>
              <a routerLink="/dashboard" routerLinkActive="text-accent-hover" class="px-3 py-2 rounded-md hover:text-accent-hover transition-colors">Panel</a>
            </div>

            <div class="flex-1"></div>

            <a routerLink="/vehicles" routerLinkActive="text-accent-hover" class="hidden sm:block px-3 py-2 rounded-md text-sm font-medium hover:text-accent-hover transition-colors">Vehículos</a>

            <button
              (click)="theme.toggle()"
              class="w-11 h-11 rounded-md border border-border hover:border-accent-hover transition-colors flex items-center justify-center"
              [attr.aria-label]="theme.isDark() ? 'Activar modo claro' : 'Activar modo oscuro'"
            >
              @if (theme.isDark()) {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"/></svg>
              } @else {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
              }
            </button>

            <a
              routerLink="/profile"
              class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-muted transition-colors"
              [attr.aria-label]="'Mi perfil: ' + (auth.user()?.username ?? '')"
            >
              <span
                class="w-8 h-8 rounded-full bg-surface-muted border border-border flex items-center justify-center text-sm font-semibold uppercase"
                >{{ auth.user()?.username?.charAt(0) ?? '?' }}</span
              >
              <span class="hidden lg:block text-sm font-medium">{{ auth.user()?.username }}</span>
            </a>

            <button
              (click)="auth.logout()"
              class="w-11 h-11 rounded-md text-ink-muted hover:text-danger transition-colors flex items-center justify-center"
              aria-label="Cerrar sesión"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          } @else {
            <div class="flex-1"></div>
            <a routerLink="/login" class="btn-ghost !h-10">Entrar</a>
            <a routerLink="/register" class="btn-accent !h-10">Crear cuenta</a>
          }
        </div>
      </nav>

      <!-- Nav móvil -->
      @if (auth.isAuthenticated()) {
        <nav class="md:hidden border-b border-border bg-bg overflow-x-auto" aria-label="Navegación móvil">
          <div class="flex items-center gap-1 px-2 text-sm font-medium whitespace-nowrap">
            <a routerLink="/rides" routerLinkActive="text-accent-hover" class="px-3 py-3 hover:text-accent-hover">Buscar</a>
            <a routerLink="/rides/new" routerLinkActive="text-accent-hover" class="px-3 py-3 hover:text-accent-hover">Publicar</a>
            <a routerLink="/bookings" routerLinkActive="text-accent-hover" class="px-3 py-3 hover:text-accent-hover">Reservas</a>
            <a routerLink="/favorites" routerLinkActive="text-accent-hover" class="px-3 py-3 hover:text-accent-hover">Favoritas</a>
            <a routerLink="/vehicles" routerLinkActive="text-accent-hover" class="px-3 py-3 hover:text-accent-hover">Vehículos</a>
            <a routerLink="/dashboard" routerLinkActive="text-accent-hover" class="px-3 py-3 hover:text-accent-hover">Panel</a>
          </div>
        </nav>
      }

      <main class="flex-1 w-full max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <router-outlet />
      </main>

      <footer class="border-t border-border py-6 mt-8">
        <div class="max-w-[1200px] mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-ink-muted">
          <p>RidePals — coche compartido comunitario.</p>
          <p class="font-mono text-xs">Demo: demo@ridepals.dev / demo1234</p>
        </div>
      </footer>

      <!-- Toasts -->
      <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">
        @for (t of toasts.toasts(); track t.id) {
          <div class="toast-base animate-toast-in flex items-center gap-2" [class.!border-l-0]="true">
            @if (t.kind === 'success') {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
            } @else if (t.kind === 'error') {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            } @else {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            }
            <span>{{ t.message }}</span>
          </div>
        }
      </div>
    </div>
  `,
})
export class AppComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly toasts = inject(ToastService);

  constructor() {
    void this.auth.loadProfile();
  }
}
