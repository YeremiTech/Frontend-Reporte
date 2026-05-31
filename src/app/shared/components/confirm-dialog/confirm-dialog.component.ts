import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { ConfirmDialogVariant } from './confirm-dialog.model';

let confirmDialogTitleCounter = 0;

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly variant = input<ConfirmDialogVariant>('danger');
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  readonly titleId = `confirm-dialog-title-${++confirmDialogTitleCounter}`;

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialogEl');

  constructor() {
    effect(() => {
      const dialog = this.dialogRef()?.nativeElement;
      if (!dialog) {
        return;
      }

      if (this.open()) {
        if (!dialog.open) {
          dialog.showModal();
        }
        return;
      }

      if (dialog.open) {
        dialog.close();
      }
    });
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(event?: Event): void {
    event?.preventDefault();
    this.cancelled.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogRef()?.nativeElement) {
      this.onCancel();
    }
  }
}
