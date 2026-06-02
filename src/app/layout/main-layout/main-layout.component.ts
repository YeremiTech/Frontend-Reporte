import { afterNextRender, ChangeDetectionStrategy, Component, computed, inject, OnDestroy } from '@angular/core';
import { NgClass } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AppViewSettingsService } from '../../core/services/app-view-settings.service';
import { AuthService } from '../../core/services/auth.service';
import { PresenceApiService } from '../../core/services/api.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { prefetchRouteChunk } from '../../core/utils/route-prefetch';
import { environment } from '../../../environments/environment';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgClass],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent implements OnDestroy {
  readonly auth = inject(AuthService);
  readonly sidebar = inject(SidebarService);
  private readonly router = inject(Router);
  private readonly viewSettings = inject(AppViewSettingsService);
  private readonly presenceApi = inject(PresenceApiService);

  private routerSub?: Subscription;
  private refreshIntervalId?: ReturnType<typeof setInterval>;
  private presenceIntervalId?: ReturnType<typeof setInterval>;
  private beforeUnloadHandler?: () => void;

  private readonly baseNavItems: NavItem[] = [
    { label: 'Reportes', route: '/reportes', icon: 'bi-grid-1x2-fill' },
    { label: 'Resumen', route: '/resumen', icon: 'bi-clipboard-data-fill' },
    { label: 'Gráficos', route: '/graficos', icon: 'bi-bar-chart-fill' },
  ];

  readonly navItems = computed(() => {
    const items = [...this.baseNavItems];
    if (this.auth.isAdmin()) {
      items.push({ label: 'Configuración', route: '/configuracion', icon: 'bi-gear-fill' });
    }
    return items;
  });

  readonly userDisplayName = computed(() => {
    const user = this.auth.currentUser();
    return user?.username?.toUpperCase() ?? 'USUARIO';
  });

  readonly userEmail = computed(() => {
    const user = this.auth.currentUser();
    if (!user) {
      return 'usuario@reportes.local';
    }
    return `${user.username}@reportes.local`;
  });

  readonly userRole = computed(() => this.auth.currentUser()?.role ?? 'USER');

  constructor() {
    afterNextRender(() => {
      this.viewSettings.load().subscribe();

      this.routerSub = this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(() => {
          this.viewSettings.refreshIfNewer().subscribe();
        });

      if (typeof globalThis.window !== 'undefined') {
        this.refreshIntervalId = globalThis.window.setInterval(() => {
          if (typeof document !== 'undefined' && document.hidden) {
            return;
          }
          this.viewSettings.refreshIfNewer().subscribe();
        }, 5_000);

        this.presenceIntervalId = globalThis.window.setInterval(() => {
          if (!this.auth.isAuthenticated()) {
            return;
          }
          this.presenceApi.ping().subscribe({ error: () => undefined });
        }, 30_000);

        this.beforeUnloadHandler = () => {
          const token = this.auth.getToken();
          if (!token) {
            return;
          }
          // Best-effort: mark offline when tab closes (keepalive allows request during unload).
          fetch(`${environment.apiUrl}/api/presence/offline`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: '{}',
            keepalive: true,
          }).catch(() => undefined);
        };

        globalThis.window.addEventListener('beforeunload', this.beforeUnloadHandler);
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    if (this.refreshIntervalId != null && typeof globalThis.window !== 'undefined') {
      globalThis.window.clearInterval(this.refreshIntervalId);
    }
    if (this.presenceIntervalId != null && typeof globalThis.window !== 'undefined') {
      globalThis.window.clearInterval(this.presenceIntervalId);
    }
    if (this.beforeUnloadHandler && typeof globalThis.window !== 'undefined') {
      globalThis.window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }
  }

  onNavigate(): void {
    if (typeof globalThis.window !== 'undefined' && globalThis.window.innerWidth < 992) {
      this.sidebar.collapse();
    }
  }

  prefetchRoute(route: string): void {
    prefetchRouteChunk(route);
  }

  closeSidebar(): void {
    this.sidebar.collapse();
  }

  logout(): void {
    this.auth.logout();
  }
}
