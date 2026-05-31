import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoaderComponent {
  /** Tamaño del icono en píxeles. */
  readonly size = input(40);

  /** Color del loader (CSS). */
  readonly color = input('#a5a5b0');

  /** Pantalla completa centrada en la ventana (position: fixed). */
  readonly overlay = input(false);

  /** Texto bajo el loader en modo overlay. */
  readonly message = input<string | undefined>(undefined);

  readonly ariaLabel = computed(() => this.message() ?? 'Cargando');
}
