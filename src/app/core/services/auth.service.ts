import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiErrorCode } from '../constants';
import { AuthResponse, AuthUser, LoginRequest } from '../models/auth.model';
import { resolvedError } from '../utils/api-error.resolver';
import { ReportDataStoreService } from './report-data-store.service';

const TOKEN_KEY = 'comisiones_token';
const USER_KEY = 'comisiones_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly reportDataStore = inject(ReportDataStoreService);

  readonly currentUser = signal<AuthUser | null>(this.loadUser());

  login(credentials: LoginRequest): Observable<AuthResponse> {
    const username = credentials.username.trim();
    const password = credentials.password;
    const expectedUsername = environment.auth.username;
    const expectedPassword = environment.auth.password;

    const usernameMatches =
      username.localeCompare(expectedUsername, undefined, { sensitivity: 'accent' }) === 0;

    if (!usernameMatches || password !== expectedPassword) {
      return throwError(() => resolvedError(ApiErrorCode.AUTH_INVALID_CREDENTIALS)).pipe(delay(250));
    }

    const response: AuthResponse = {
      token: this.generateLocalToken(expectedUsername),
      username: expectedUsername,
      role: environment.auth.role,
    };

    return of(response).pipe(
      delay(150),
      tap((authResponse) => {
        localStorage.setItem(TOKEN_KEY, authResponse.token);
        const user: AuthUser = { username: authResponse.username, role: authResponse.role };
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.currentUser.set(user);
      })
    );
  }

  logout(): void {
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

  private generateLocalToken(username: string): string {
    return btoa(`${username}:${Date.now()}`);
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
