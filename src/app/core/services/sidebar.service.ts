import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  readonly collapsed = signal(this.initialCollapsed());

  constructor() {
    this.attachResizeListener();
  }

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
    return this.isMobileViewport();
  }

  private attachResizeListener(): void {
    if (typeof globalThis.window === 'undefined') {
      return;
    }

    globalThis.window.addEventListener(
      'resize',
      () => {
        if (this.isMobileViewport()) {
          this.collapse();
        } else {
          this.expand();
        }
      },
      { passive: true }
    );
  }

  private isMobileViewport(): boolean {
    return globalThis.window.innerWidth < 992;
  }
}
