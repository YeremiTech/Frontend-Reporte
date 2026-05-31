import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateDatabaseIconComponent } from './empty-state-database-icon.component';

let emptyStateIdSeq = 0;

export type EmptyStateIconType = 'database' | 'bootstrap';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [RouterLink, EmptyStateDatabaseIconComponent],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'page-body-fill empty-state-host',
  },
})
export class EmptyStateComponent {
  /** `database` = SVG reutilizable gris; `bootstrap` = clase bi-* */
  readonly iconType = input<EmptyStateIconType>('database');
  readonly icon = input('bi-inbox');

  readonly title = input.required<string>();
  readonly description = input('');

  readonly buttonLabel = input<string | undefined>(undefined);
  readonly buttonIcon = input('bi-arrow-right-short');
  readonly showButton = input<boolean | undefined>(undefined);
  readonly actionRoute = input<string | undefined>(undefined);

  readonly titleId = `app-empty-state-title-${++emptyStateIdSeq}`;
  readonly descriptionId = `app-empty-state-desc-${emptyStateIdSeq}`;

  readonly hasDescription = computed(() => !!this.description().trim());
  readonly useDatabaseIcon = computed(() => this.iconType() === 'database');

  readonly iconClass = computed(() => this.normalizeBiClass(this.icon()));
  readonly buttonIconClass = computed(() => this.normalizeBiClass(this.buttonIcon()));

  readonly displayButton = computed(() => {
    const explicit = this.showButton();
    if (explicit === false) {
      return false;
    }
    if (explicit === true) {
      return !!this.buttonLabel();
    }
    return !!this.buttonLabel();
  });

  private normalizeBiClass(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'bi bi-inbox';
    }
    return trimmed.startsWith('bi ') ? trimmed : `bi ${trimmed}`;
  }
}
