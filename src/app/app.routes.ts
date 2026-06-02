import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

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
        pathMatch: 'full',
        redirectTo: 'resumen',
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
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./features/settings/pages/settings-dashboard/settings-dashboard.component').then(
            (m) => m.SettingsDashboardComponent
          ),
        canActivate: [adminGuard],
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/errors/pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
