const prefetchedRoutes = new Set<string>();

export function prefetchRouteChunk(route: string): void {
  if (prefetchedRoutes.has(route)) {
    return;
  }
  prefetchedRoutes.add(route);

  switch (route) {
    case '/':
      void import('../../features/rgfm/pages/rgfm-dashboard/rgfm-dashboard.component');
      break;
    case '/resumen':
      void import('../../features/summary/pages/vendor-summary/vendor-summary.component');
      break;
    case '/graficos':
      void import('../../features/charts/pages/charts-dashboard/charts-dashboard.component');
      break;
    case '/configuracion':
      void import('../../features/settings/pages/settings-dashboard/settings-dashboard.component');
      break;
    default:
      prefetchedRoutes.delete(route);
  }
}
