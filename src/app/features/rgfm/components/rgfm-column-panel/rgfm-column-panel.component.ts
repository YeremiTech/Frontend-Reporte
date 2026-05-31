import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-rgfm-column-panel',
  standalone: true,
  templateUrl: './rgfm-column-panel.component.html',
  styleUrl: './rgfm-column-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RgfmColumnPanelComponent {
  readonly columnOrder = input.required<string[]>();
  readonly hiddenColumns = input.required<Set<string>>();
  readonly visibleCount = input.required<number>();

  readonly visibilityChange = output<{ header: string; visible: boolean }>();
  readonly showAll = output<void>();
  readonly hideAll = output<void>();

  isVisible(header: string): boolean {
    return !this.hiddenColumns().has(header);
  }

  onToggle(header: string, visible: boolean): void {
    this.visibilityChange.emit({ header, visible });
  }
}
