import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  readonly collapsed = signal(this.initialCollapsed());

  toggle(): void {
    this.collapsed.update((value) => !value);
  }

  collapse(): void {
    this.collapsed.set(true);
  }

  expand(): void {
    this.collapsed.set(false);
  }

  private initialCollapsed(): boolean {
    if (typeof globalThis.window === 'undefined') {
      return true;
    }
    return globalThis.window.innerWidth < 992;
  }
}
