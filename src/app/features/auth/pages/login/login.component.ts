import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { validateLoginForm } from '../../../../core/utils/api-error.resolver';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { TailgridsAlertComponent } from '../../../../shared/components/tailgrids-alert/tailgrids-alert.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, LoaderComponent, TailgridsAlertComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly toast = inject(ToastService);

  username = '';
  password = '';
  loading = signal(false);

  submit(): void {
    this.toast.dismiss();

    const validationError = validateLoginForm(this.username, this.password);
    if (validationError) {
      this.toast.show('danger', validationError.title, validationError.message, 5000);
      return;
    }

    this.loading.set(true);

    this.auth.login({ username: this.username.trim(), password: this.password }).subscribe({
      next: () => {
        this.loading.set(false);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const target =
          returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')
            ? returnUrl
            : '/';
        void this.router.navigateByUrl(target);
      },
      error: (err) => {
        this.toast.showError(err);
        this.loading.set(false);
      },
    });
  }
}
