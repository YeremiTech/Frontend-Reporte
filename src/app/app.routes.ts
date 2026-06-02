import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/rgfm/pages/rgfm-dashboard/rgfm-dashboard.component').then(
            (m) => m.RgfmDashboardComponent
          ),
      },
      {
        path: 'graficos',
        loadComponent: () =>
          import('./features/charts/pages/charts-dashboard/charts-dashboard.component').then(
            (m) => m.ChartsDashboardComponent
          ),
      },
      {
        path: 'resumen',
        loadComponent: () =>
          import('./features/summary/pages/vendor-summary/vendor-summary.component').then(
            (m) => m.VendorSummaryComponent
          ),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/errors/pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
