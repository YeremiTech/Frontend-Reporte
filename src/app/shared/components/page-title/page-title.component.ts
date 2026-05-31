import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { SidebarService } from '../../../core/services/sidebar.service';

@Component({
  selector: 'app-page-title',
  standalone: true,
  templateUrl: './page-title.component.html',
  styleUrl: './page-title.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageTitleComponent {
  /** Texto centrado del encabezado de página (menú lateral). */
  readonly title = input.required<string>();

  /** Clase de animación global (p. ej. rgfm-fade-in-down). */
  readonly animationClass = input('rgfm-fade-in-down');

  readonly sidebar = inject(SidebarService);
}
