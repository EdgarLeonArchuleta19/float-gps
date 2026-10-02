import { setWorkerUrl } from 'maplibre-gl';

let applied = false;

export function setupMapLibreWorker(): void {
  if (applied) return;
  applied = true;

  const base = import.meta.env.BASE_URL || '/';
  const path = base.endsWith('/') ? base : `${base}/`;

  setWorkerUrl(new URL(`${path}maplibre-gl-worker.mjs`, window.location.origin).href);
}