import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { prefetchRouteChunk } from '../../core/utils/route-prefetch';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  readonly auth = inject(AuthService);
  readonly sidebar = inject(SidebarService);

  readonly navItems: NavItem[] = [
    { label: 'Reportes', route: '/', icon: 'bi-grid-1x2-fill' },
    { label: 'Resumen', route: '/resumen', icon: 'bi-clipboard-data-fill' },
    { label: 'Gráficos', route: '/graficos', icon: 'bi-bar-chart-fill' },
  ];

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
