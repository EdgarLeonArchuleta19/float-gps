import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const backendRoot = path.join(__dirname, '..');

/**
 * Configuracion del receptor GT06 (proceso aparte: npm run tracker).
 *
 * El API y el tracker son dos servicios distintos con dos bases distintas:
 *   - .env             -> desarrollo local (Postgres en localhost)
 *   - .env.production  -> produccion (Neon)
 *
 * Precedencia de la base de datos:
 *   1. TRACKER_DATABASE_URL del entorno (CI / one-off)
 *   2. .env.production
 *   3. .env  (solo si no existe .env.production; util para probar en local)
 */

const productionEnvPath = path.join(backendRoot, '.env.production');
const localEnvPath = path.join(backendRoot, '.env');

const envSource = fs.existsSync(productionEnvPath) ? productionEnvPath : localEnvPath;
dotenv.config({ path: envSource });

const override = process.env.TRACKER_DATABASE_URL;
if (override) {
  process.env.DATABASE_URL = override;
}

export type EnvSource = 'production' | 'local';

export interface TrackerEnvInfo {
  source: EnvSource;
  envFile: string;
  databaseUrl: string | undefined;
  host: string | null;
  database: string | null;
  isProductionHost: boolean;
}

function describe(url: string | undefined): { host: string | null; database: string | null } {
  if (!url) return { host: null, database: null };
  try {
    const parsed = new URL(url);
    return { host: parsed.host, database: parsed.pathname.replace(/^\//, '') || null };
  } catch {
    return { host: 'no parseable', database: null };
  }
}

const { host, database } = describe(process.env.DATABASE_URL);

export const trackerEnv: TrackerEnvInfo = {
  source: envSource === productionEnvPath ? 'production' : 'local',
  envFile: envSource,
  databaseUrl: process.env.DATABASE_URL,
  host,
  database,
  isProductionHost: Boolean(host && /neon\.tech$/.test(host)),
};
