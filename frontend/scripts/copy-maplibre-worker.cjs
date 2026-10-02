const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'node_modules', 'maplibre-gl', 'dist');
const outDir = path.join(root, 'public');

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[^;\n]*?from\s*["'](\.[^"']+)["']/g;
const copied = [];

function copyWithDeps(fileName) {
  const src = path.join(dist, fileName);
  if (!fs.existsSync(src)) {
    console.error(`Falta ${src}. Ejecuta npm install.`);
    process.exit(1);
  }

  const code = fs.readFileSync(src, 'utf8');
  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync(src, path.join(outDir, fileName));
  copied.push(fileName);

  for (const match of code.matchAll(IMPORT_RE)) {
    const dep = path.basename(match[1]);
    if (!copied.includes(dep)) copyWithDeps(dep);
  }
}

copyWithDeps('maplibre-gl-worker.mjs');

console.log(`maplibre-gl: ${copied.join(', ')} -> public/`);