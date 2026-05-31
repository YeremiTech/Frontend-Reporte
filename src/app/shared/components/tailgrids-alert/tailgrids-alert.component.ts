import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type TailgridsAlertVariant = 'success' | 'danger' | 'warning' | 'info' | 'gray';

@Component({
  selector: 'app-tailgrids-alert',
  standalone: true,
  templateUrl: './tailgrids-alert.component.html',
  styleUrl: './tailgrids-alert.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TailgridsAlertComponent {
  readonly variant = input<TailgridsAlertVariant>('success');
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly dismissible = input(true);

  readonly closed = output<void>();

  iconClass(): string {
    switch (this.variant()) {
      case 'danger':
        return 'bi-x-circle-fill';
      case 'warning':
        return 'bi-exclamation-triangle-fill';
      case 'info':
      case 'gray':
        return 'bi-info-circle-fill';
      default:
        return 'bi-check-circle-fill';
    }
  }

  onClose(): void {
    this.closed.emit();
  }
}
