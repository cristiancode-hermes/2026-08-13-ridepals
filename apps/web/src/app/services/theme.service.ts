import { Injectable, signal } from '@angular/core';

const THEME_KEY = 'rp_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal<boolean>(
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  constructor() {
    if (typeof document === 'undefined') return;
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') {
      this.apply(stored === 'dark');
    } else {
      this.apply(false); // default: light (Open Road diurno)
    }
  }

  toggle(): void {
    this.apply(!this.isDark());
  }

  private apply(dark: boolean): void {
    this.isDark.set(dark);
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  }
}
