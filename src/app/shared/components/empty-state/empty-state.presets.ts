import type { EmptyStateIconType } from './empty-state.component';

export interface EmptyStatePreset {
  iconType?: EmptyStateIconType;
  icon?: string;
  title: string;
  description: string;
  buttonLabel?: string;
  actionRoute?: string;
}

export const EMPTY_STATE_PRESETS = {
  resumen: {
    iconType: 'database',
    title: 'Sin datos para mostrar',
    description: 'Importe un Excel en Reportes para ver el resumen por vendedor.',
    buttonLabel: 'Ir a Reportes',
    actionRoute: '/',
  },
  graficos: {
    iconType: 'database',
    title: 'Sin datos para mostrar',
    description:
      'Importe un Excel en Reportes. Las columnas y filas estarán disponibles aquí automáticamente.',
    buttonLabel: 'Ir a Reportes',
    actionRoute: '/',
  },
} as const satisfies Record<string, EmptyStatePreset>;
