import { Injectable, signal } from '@angular/core';
import { TailgridsAlertVariant } from '../../shared/components/tailgrids-alert/tailgrids-alert.component';
import { resolveApiError } from '../utils/api-error.resolver';

export interface ToastState {
  variant: TailgridsAlertVariant;
  title: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly state = signal<ToastState | null>(null);

  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  show(variant: TailgridsAlertVariant, title: string, message: string, autoHideMs = 4500): void {
    this.clearTimer();
    this.state.set({ variant, title, message });
    if (autoHideMs > 0) {
      this.hideTimer = setTimeout(() => this.dismiss(), autoHideMs);
    }
  }

  showSuccess(title: string, message: string): void {
    this.show('success', title, message);
  }

  showError(err: unknown): void {
    const resolved = resolveApiError(err);
    this.show('danger', resolved.title, resolved.message, 5000);
  }

  dismiss(): void {
    this.clearTimer();
    this.state.set(null);
  }

  private clearTimer(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
