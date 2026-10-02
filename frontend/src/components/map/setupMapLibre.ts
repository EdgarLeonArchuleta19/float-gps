import { setWorkerUrl } from 'maplibre-gl';

/**
 * MapLibre resuelve su worker con new URL('./maplibre-gl-worker.mjs', import.meta.url),
 * lo que en Vite pasa por su pipeline y termina inyectando /@vite/client. Ese
 * codigo pertenece a la ventana, no al worker, asi que el worker no arranca y el
 * mapa se queda sin tiles.
 *
 * Sirviendo el .mjs desde public/ como asset estatico se evita esa transformacion.
 * El archivo lo copia scripts/copy-maplibre-worker.cjs en dev, build y postinstall.
 *
 * BASE_URL hace que funcione tambien bajo un subpath en produccion.
 */
let applied = false;

export function setupMapLibreWorker(): void {
  if (applied) return;
  applied = true;

  const base = import.meta.env.BASE_URL || '/';
  const workerUrl = new URL(
    `${base.endsWith('/') ? base : `${base}/`}maplibre-gl-worker.mjs`,
    window.location.origin
  ).href;

  setWorkerUrl(workerUrl);
}