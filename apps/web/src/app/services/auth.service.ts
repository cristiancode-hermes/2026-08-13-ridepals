import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { AuthResponse, AuthUser } from '../interfaces/models';

const TOKEN_KEY = 'rp_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly user = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => this.token() !== null);

  /** Login acepta username O email (preferencia de Cristian). */
  async login(identifier: string, password: string): Promise<void> {
    const res = await lastValueFrom(
      this.http.post<AuthResponse>('/api/auth/login', { identifier, password }),
    );
    this.setSession(res);
  }

  async register(username: string, email: string, password: string): Promise<void> {
    const res = await lastValueFrom(
      this.http.post<AuthResponse>('/api/auth/register', { username, email, password }),
    );
    this.setSession(res);
  }

  async loadProfile(): Promise<void> {
    if (!this.token()) return;
    try {
      const user = await lastValueFrom(this.http.get<AuthUser>('/api/auth/profile'));
      this.user.set(user);
    } catch {
      this.logout();
    }
  }

  async updateProfile(profile: { bio?: string }): Promise<AuthUser> {
    const user = await lastValueFrom(this.http.patch<AuthUser>('/api/auth/profile', profile));
    this.user.set(user);
    return user;
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
    this.user.set(null);
    void this.router.navigate(['/login']);
  }

  private setSession(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    this.token.set(res.token);
    this.user.set(res.user);
  }
}
