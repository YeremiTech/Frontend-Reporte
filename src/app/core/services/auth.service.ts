import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { resolveApiError } from '../utils/api-error.resolver';
import { ResolvedApiError } from '../models/api-response.model';
import { environment } from '../../../environments/environment';
import { AuthResponse, AuthUser, LoginRequest } from '../models/auth.model';
import { ReportDataStoreService } from './report-data-store.service';

const TOKEN_KEY = 'comisiones_token';
const USER_KEY = 'comisiones_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly reportDataStore = inject(ReportDataStoreService);

  readonly currentUser = signal<AuthUser | null>(this.loadUser());

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap((response) => {
          localStorage.setItem(TOKEN_KEY, response.token);
          const user: AuthUser = { username: response.username, role: response.role };
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          this.currentUser.set(user);
        }),
        catchError((error) => {
          const resolved: ResolvedApiError = resolveApiError(error);
          return throwError(() => resolved);
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
    return !!this.getToken();
  }

  private loadUser(): AuthUser | null {
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
