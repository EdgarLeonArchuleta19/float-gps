import { trackerEnv } from './load-tracker-env';
import { config } from '../src/config';
import { startTrackerServer, trackerState } from '../src/tracker/server';

const argv = process.argv.slice(2);
const withApi = argv.includes('--api');
const forceLocal = argv.includes('--force-local');

async function verifyDatabase(): Promise<void> {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const count = await prisma.gpsDevice.count();
    console.log(`[TRACKER] Base de datos accesible: ${count} dispositivo(s) registrado(s)`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[TRACKER] No se pudo conectar a la base de datos: ${message}`);
    console.error('[TRACKER] Revisa DATABASE_URL en el archivo de entorno que se indica arriba');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function banner(): void {
  const target = trackerEnv.host
    ? `${trackerEnv.host}/${trackerEnv.database || '?'}`
    : 'NO CONFIGURADA';
  const entorno = trackerEnv.source === 'production' ? 'PRODUCCION' : 'local (desarrollo)';

  console.log('');
  console.log('=================================================');
  console.log('  Floa GPS - Receptor TCP GT06');
  console.log('=================================================');
  console.log(`  Entorno            : ${entorno}`);
  console.log(`  Archivo            : ${trackerEnv.envFile}`);
  console.log(`  Base de datos      : ${target}`);
  console.log(`  Escuchando en      : ${config.trackerHost}:${config.trackerPort}`);
  console.log(`  API local          : ${withApi ? `activada en :${config.port}` : 'desactivada (usa --api)'}`);
  console.log('=================================================');
  console.log('');
}

async function main(): Promise<void> {
  banner();

  if (!trackerEnv.databaseUrl) {
    console.error('[TRACKER] Falta DATABASE_URL. Copia .env.production.example a .env.production y pega la URL de Neon.');
    process.exit(1);
  }

  const looksLocal = /\blocalhost\b|\b127\.0\.0\.1\b/.test(trackerEnv.databaseUrl);
  if (looksLocal && !forceLocal) {
    console.error('[TRACKER] Esta configuracion apunta a una base de datos LOCAL.');
    console.error('[TRACKER] Si es a proposito, reinicia con:  npm run tracker -- --force-local');
    process.exit(1);
  }
  if (looksLocal) {
    console.warn('[TRACKER] Modo local forzado: los GPS escribiran en tu Postgres de desarrollo.');
  }

  await verifyDatabase();

  startTrackerServer();

  if (withApi) {
    const app = (await import('../src/app')).default;
    app.listen(config.port, () => {
      console.log(`[TRACKER] API local escuchando en puerto ${config.port}`);
    });
  }

  setInterval(() => {
    const s = trackerState;
    console.log(
      `[TRACKER] status: conexiones=${s.connections} dispositivos=${s.onlineDevices.length} ` +
        `frames=${s.totalFrames} inserts=${s.inserted} ultimo=${s.lastImei || '-'} (${s.lastCommand || '-'})`,
    );
  }, 60000).unref();
}

main().catch((err: Error) => {
  console.error(`[TRACKER] Error fatal: ${err.message}`);
  process.exit(1);
});
