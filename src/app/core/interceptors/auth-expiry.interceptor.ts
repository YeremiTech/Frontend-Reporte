import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authExpiryInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isApiRequest = req.url.startsWith(environment.apiUrl);

  return next(req).pipe(
    catchError((err) => {
      if (isApiRequest && err instanceof HttpErrorResponse && err.status === 401 && auth.isAuthenticated()) {
        auth.forceLogout();
      }
      return throwError(() => err);
    })
  );
};

