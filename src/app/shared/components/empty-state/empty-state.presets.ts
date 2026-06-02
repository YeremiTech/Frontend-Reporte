import type { EmptyStateIconType } from './empty-state.component';

export interface EmptyStatePreset {
  iconType?: EmptyStateIconType;
  title: string;
  description: string;
  buttonLabel?: string;
  actionRoute?: string;
}

export const EMPTY_STATE_PRESETS = {
  resumen: {
    iconType: 'bootstrap',
    title: 'Sin datos para mostrar',
    description: 'Importe un Excel en Reportes y use Guardar para persistir los datos en la base.',
    buttonLabel: 'Ir a Reportes',
    actionRoute: '/reportes',
  },
  graficos: {
    iconType: 'bootstrap',
    title: 'Sin datos para mostrar',
    description: 'Importe un Excel en Reportes y use Guardar para persistir los datos en la base.',
    buttonLabel: 'Ir a Reportes',
    actionRoute: '/reportes',
  },
} as const satisfies Record<string, EmptyStatePreset>;
