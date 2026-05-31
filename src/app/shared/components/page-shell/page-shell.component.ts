import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PageTitleComponent } from '../page-title/page-title.component';

@Component({
  selector: 'app-page-shell',
  standalone: true,
  imports: [PageTitleComponent],
  templateUrl: './page-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'page-shell-host',
  },
})
export class PageShellComponent {
  readonly title = input.required<string>();
  readonly animationClass = input('rgfm-fade-in-down');
}
