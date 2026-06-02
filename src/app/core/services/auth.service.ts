import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, AuthUser, LoginRequest } from '../models/auth.model';
import { ReportDataStoreService } from './report-data-store.service';
import { AuthApiService, PresenceApiService } from './api.service';

const TOKEN_KEY = 'comisiones_token';
const USER_KEY = 'comisiones_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly reportDataStore = inject(ReportDataStoreService);
  private readonly authApi = inject(AuthApiService);
  private readonly presenceApi = inject(PresenceApiService);

  readonly currentUser = signal<AuthUser | null>(this.loadUser());

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.authApi.login(credentials).pipe(
      tap((authResponse) => {
        localStorage.setItem(TOKEN_KEY, authResponse.token);
        const user: AuthUser = { username: authResponse.username, role: authResponse.role };
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.currentUser.set(user);
      })
    );
  }

  logout(): void {
    const token = this.getToken();
    const finish = () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      this.currentUser.set(null);
      this.reportDataStore.clear();
      this.router.navigate(['/login']);
    };

    if (!token) {
      finish();
      return;
    }

    this.presenceApi.offline().subscribe({
      next: () => finish(),
      error: () => finish(),
    });
  }

  /**
   * Cierra sesión local sin llamar al backend (útil cuando el backend ya respondió 401).
   */
  forceLogout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.reportDataStore.clear();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.currentUser();
  }

  isAdmin(): boolean {
    return this.currentUser()?.role === 'ADMIN';
  }

  canEditReports(): boolean {
    return this.isAdmin();
  }

  private loadUser(): AuthUser | null {
    if (!localStorage.getItem(TOKEN_KEY)) {
      return null;
    }

    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
