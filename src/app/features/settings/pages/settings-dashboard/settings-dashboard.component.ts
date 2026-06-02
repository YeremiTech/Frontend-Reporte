import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserAdminApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  AppRole,
  CreateUsuarioRequest,
  UpdateUsuarioRequest,
  UsuarioSummary,
} from '../../../../core/models/user.model';
import { ToastService } from '../../../../core/services/toast.service';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { TailgridsAlertComponent } from '../../../../shared/components/tailgrids-alert/tailgrids-alert.component';
import { ApiErrorCode } from '../../../../core/constants';
import { ResolvedApiError } from '../../../../core/models/api-response.model';
import { resolvedError } from '../../../../core/utils/api-error.resolver';

type FormMode = 'create' | 'edit';

@Component({
  selector: 'app-settings-dashboard',
  standalone: true,
  imports: [NgClass, FormsModule, PageShellComponent, LoaderComponent, TailgridsAlertComponent],
  templateUrl: './settings-dashboard.component.html',
  styleUrl: './settings-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsDashboardComponent implements OnInit {
  private readonly userApi = inject(UserAdminApiService);
  private readonly auth = inject(AuthService);
  protected readonly toast = inject(ToastService);

  readonly users = signal<UsuarioSummary[]>([]);
  readonly loading = signal(false);
  readonly submitting = signal(false);

  readonly formMode = signal<FormMode>('create');
  readonly editingUserId = signal<number | null>(null);

  readonly isEditing = computed(() => this.formMode() === 'edit');
  readonly formTitle = computed(() =>
    this.isEditing() ? 'Editar usuario' : 'Nuevo usuario'
  );
  readonly submitLabel = computed(() =>
    this.isEditing() ? 'Guardar cambios' : 'Crear usuario'
  );
  readonly loaderActionMessage = computed(() => {
    if (!this.submitting()) {
      return 'Cargando usuarios...';
    }
    return this.isEditing() ? 'Guardando cambios...' : 'Creando usuario...';
  });

  formUsername = '';
  formPassword = '';
  formEmail = '';
  formRole: AppRole = 'USER';

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.userApi.listUsers().subscribe({
      next: (list) => {
        this.users.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.showError(err as ResolvedApiError);
        this.loading.set(false);
      },
    });
  }

  startCreate(): void {
    this.formMode.set('create');
    this.editingUserId.set(null);
    this.resetForm();
  }

  startEdit(user: UsuarioSummary): void {
    this.formMode.set('edit');
    this.editingUserId.set(user.id);
    this.formUsername = user.username;
    this.formEmail = user.email;
    this.formRole = user.role;
    this.formPassword = '';
    this.toast.dismiss();
  }

  cancelEdit(): void {
    this.startCreate();
  }

  submitForm(): void {
    if (this.isEditing()) {
      this.saveUser();
    } else {
      this.createUser();
    }
  }

  createUser(): void {
    const payload = this.buildCreatePayload();
    if (!payload) {
      return;
    }

    this.submitting.set(true);
    this.userApi.createUser(payload).subscribe({
      next: (created) => {
        this.upsertUserInList(created);
        this.resetForm();
        this.toast.showSuccess('Usuario creado', created.username);
        this.submitting.set(false);
      },
      error: (err) => {
        this.toast.showError(err as ResolvedApiError);
        this.submitting.set(false);
      },
    });
  }

  saveUser(): void {
    const id = this.editingUserId();
    const payload = this.buildUpdatePayload();
    if (id == null || !payload) {
      return;
    }

    this.submitting.set(true);
    this.userApi.updateUser(id, payload).subscribe({
      next: (updated) => {
        this.upsertUserInList(updated);
        this.startCreate();
        this.toast.showSuccess('Usuario actualizado', updated.username);
        this.submitting.set(false);
      },
      error: (err) => {
        this.toast.showError(err as ResolvedApiError);
        this.submitting.set(false);
      },
    });
  }

  deleteUser(user: UsuarioSummary): void {
    if (!confirm(`¿Eliminar al usuario "${user.username}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.submitting.set(true);
    this.userApi.deleteUser(user.id).subscribe({
      next: () => {
        this.users.update((list) => list.filter((u) => u.id !== user.id));
        if (this.editingUserId() === user.id) {
          this.startCreate();
        }
        this.toast.showSuccess('Usuario eliminado', user.username);
        this.submitting.set(false);
      },
      error: (err) => {
        this.toast.showError(err as ResolvedApiError);
        this.submitting.set(false);
      },
    });
  }

  isCurrentUser(user: UsuarioSummary): boolean {
    const current = this.auth.currentUser()?.username;
    return !!current && current.toLowerCase() === user.username.toLowerCase();
  }

  formatDate(iso: string): string {
    if (!iso) {
      return '—';
    }
    try {
      return new Date(iso).toLocaleString('es-PE', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  }

  private buildCreatePayload(): CreateUsuarioRequest | null {
    const username = this.formUsername.trim();
    const email = this.formEmail.trim();
    const password = this.formPassword;

    if (!username || !email || !password) {
      this.toast.showError(
        resolvedError(ApiErrorCode.VALIDATION_ERROR, 'Complete usuario, correo y contraseña.')
      );
      return null;
    }

    return { username, password, email, role: this.formRole };
  }

  private buildUpdatePayload(): UpdateUsuarioRequest | null {
    const username = this.formUsername.trim();
    const email = this.formEmail.trim();
    const password = this.formPassword.trim();

    if (!username || !email) {
      this.toast.showError(
        resolvedError(ApiErrorCode.VALIDATION_ERROR, 'Complete usuario y correo.')
      );
      return null;
    }

    if (password && password.length < 4) {
      this.toast.showError(
        resolvedError(ApiErrorCode.VALIDATION_ERROR, 'La contraseña debe tener al menos 4 caracteres.')
      );
      return null;
    }

    const payload: UpdateUsuarioRequest = {
      username,
      email,
      role: this.formRole,
    };

    if (password) {
      payload.password = password;
    }

    return payload;
  }

  private upsertUserInList(user: UsuarioSummary): void {
    this.users.update((list) => {
      const without = list.filter((u) => u.id !== user.id);
      return [...without, user].sort((a, b) => a.username.localeCompare(b.username, 'es'));
    });
  }

  private resetForm(): void {
    this.formUsername = '';
    this.formPassword = '';
    this.formEmail = '';
    this.formRole = 'USER';
  }
}
