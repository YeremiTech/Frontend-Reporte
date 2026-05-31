import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  Type,
} from '@angular/core';
import type { ChartOptions } from '../../../core/models/chart.model';
import type { ApexChartInnerComponent } from './apex-chart-inner.component';

@Component({
  selector: 'app-apex-chart',
  standalone: true,
  imports: [NgComponentOutlet],
  template: `
    @if (innerComponent(); as component) {
      <ng-container *ngComponentOutlet="component; inputs: innerInputs()" />
    } @else {
      <p class="apex-chart-loading" aria-hidden="true">Cargando gráfico…</p>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .apex-chart-loading {
        margin: 0;
        padding: 2rem 1rem;
        text-align: center;
        color: #5f6b7a;
        font-size: 0.875rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApexChartComponent {
  readonly options = input<ChartOptions | null>(null);

  readonly innerComponent = signal<Type<ApexChartInnerComponent> | null>(null);

  readonly innerInputs = computed(() => ({ options: this.options() }));

  constructor() {
    void import('./apex-chart-inner.component').then((module) => {
      this.innerComponent.set(module.ApexChartInnerComponent);
    });
  }
}
