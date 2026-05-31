import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type LoaderOverlayScope = 'container' | 'viewport';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-overlay-scope]': 'overlay() ? overlayScope() : null',
  },
})
export class LoaderComponent {
  /** Tamaño del icono en píxeles. */
  readonly size = input(40);

  /** Color del loader (CSS). */
  readonly color = input('#a5a5b0');

  /** Overlay centrado sobre el contenedor o la ventana. */
  readonly overlay = input(false);

  /**
   * `container`: centra dentro del bloque de página (Reportes, Gráficos, Resumen).
   * `viewport`: centra en toda la ventana (login u otras pantallas full-screen).
   */
  readonly overlayScope = input<LoaderOverlayScope>('container');

  /** Texto bajo el loader en modo overlay. */
  readonly message = input<string | undefined>(undefined);

  readonly ariaLabel = computed(() => this.message() ?? 'Cargando');
}
