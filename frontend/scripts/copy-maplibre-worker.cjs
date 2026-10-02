/**
 * Copia el worker de MapLibre a public/ para que Vite lo sirva sin transformarlo.
 *
 * Motivo: Vite inyecta su runtime (/@vite/client) en el .mjs del worker, y ese
 * codigo no existe dentro de un Web Worker, por lo que el worker no arranca y
 * el mapa se queda sin tiles. Servantelo desde public/ como asset estatico lo
 * evita; ver src/components/map/setupMapLibre.ts, que lo registra con
 * setWorkerUrl.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(
  fs.readFileSync(path.join(root, 'node_modules', 'maplibre-gl', 'package.json'), 'utf8')
);

const version = pkg.version;
const dist = path.join(root, 'node_modules', 'maplibre-gl', 'dist');
const src = path.join(dist, 'maplibre-gl-worker.mjs');
const outDir = path.join(root, 'public');
const dest = path.join(outDir, 'maplibre-gl-worker.mjs');

if (!fs.existsSync(src)) {
  console.error(`No se encontro el worker en ${src}. Ejecuta npm install primero.`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(src, dest);

console.log(`maplibre-gl@${version}: worker copiado a public/maplibre-gl-worker.mjs`);