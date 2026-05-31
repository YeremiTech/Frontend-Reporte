import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ChartComponent } from 'ng-apexcharts';
import type { ChartOptions } from '../../../core/models/chart.model';

@Component({
  selector: 'app-apex-chart-inner',
  standalone: true,
  imports: [ChartComponent],
  templateUrl: './apex-chart.component.html',
  styleUrl: './apex-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApexChartInnerComponent {
  readonly options = input<ChartOptions | null>(null);
}
