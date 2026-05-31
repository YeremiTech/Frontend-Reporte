export type ConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'primary';

export interface ConfirmDialogConfig {
  variant?: ConfirmDialogVariant;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const SAVE_TO_DB_CONFIRM: ConfirmDialogConfig = {
  variant: 'danger',
  title: 'Guardar en base de datos',
  message:
    'Se eliminarán todos los datos anteriores en la base de datos y se guardará esta importación. ¿Desea continuar?',
  confirmLabel: 'Guardar en BD',
  cancelLabel: 'Cancelar',
};
