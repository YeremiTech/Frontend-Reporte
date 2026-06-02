import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'comisiones-frontend', 'browser');
const indexPath = path.join(root, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('postbuild: no se encontró', indexPath);
  process.exit(1);
}

const html = fs.readFileSync(indexPath);

/** Fallback SPA para hosts que sirven 404.html en rutas desconocidas. */
fs.writeFileSync(path.join(root, '404.html'), html);

const appRoutes = ['login', 'resumen', 'graficos'];

for (const route of appRoutes) {
  const dir = path.join(root, route);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

console.log('postbuild: fallbacks SPA (404.html + rutas) generados');
