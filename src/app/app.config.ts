import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withHashLocation } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { authExpiryInterceptor } from './core/interceptors/auth-expiry.interceptor';
import { environment } from '../environments/environment';

const routerFeatures = environment.useHashRouting ? [withHashLocation()] : [];

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, ...routerFeatures),
    provideHttpClient(withInterceptors([authInterceptor, authExpiryInterceptor])),
  ],
};
