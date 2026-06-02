export const environment = {
  production: true,
  /** Actualizar con la URL de tu Web Service en Render tras desplegar el backend. */
  apiUrl: 'https://backend-reporte-sev.onrender.com',
  /**
   * En Render (static site sin rewrite /* → index.html) el hash evita 404 al actualizar.
   * URLs: https://frontend-reporte.onrender.com/#/graficos
   * Si configura rewrite en Render, puede poner useHashRouting en false.
   */
  useHashRouting: false,
};
