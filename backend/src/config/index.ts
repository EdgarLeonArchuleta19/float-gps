import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET || (isProduction ? '' : 'demo-jwt-secret');

if (isProduction && (!jwtSecret || jwtSecret === 'demo-jwt-secret' || jwtSecret.includes('change-in-production'))) {
  throw new Error('FATAL: JWT_SECRET debe estar configurado con un valor seguro en producción.');
}

const ownerMasterKey = process.env.OWNER_MASTER_KEY || (isProduction ? '' : 'FLOA-MASTER-DEV-2026');

if (isProduction && (!ownerMasterKey || ownerMasterKey.length < 16)) {
  throw new Error('FATAL: OWNER_MASTER_KEY debe estar configurada (mínimo 16 caracteres) en producción.');
}

const traccarWebhookSecret = process.env.TRACCAR_WEBHOOK_SECRET || '';

if (isProduction && traccarWebhookSecret.length < 24) {
  throw new Error('FATAL: TRACCAR_WEBHOOK_SECRET debe estar configurada (mínimo 24 caracteres) en producción.');
}

// Express only trusts X-Forwarded-For when the direct peer is a private or
// loopback address (the reverse proxy), so a client exposed straight to the
// internet can't spoof its IP to dodge rate limits. Override with TRUST_PROXY.
function parseTrustProxy(value: string | undefined): boolean | number | string {
  if (!value) return 'loopback, linklocal, uniquelocal';
  if (value === 'true' || value === 'false') return value === 'true';
  return /^\d+$/.test(value) ? parseInt(value, 10) : value;
}

function parseList(value: string | undefined): string[] {
  return (value || '').split(',').map((s) => s.trim()).filter(Boolean);
}

export const config = {
  ownerMasterKey,
  ownerTokenTtl: process.env.OWNER_TOKEN_TTL || '8h',
  ownerAllowedIps: process.env.OWNER_ALLOWED_IPS
    ? process.env.OWNER_ALLOWED_IPS.split(',').map((s) => s.trim()).filter(Boolean)
    : [],
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: jwtSecret || 'demo-jwt-secret',
  corsOrigins: parseList(process.env.CORS_ORIGINS),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  cspConnectSrc: parseList(process.env.CSP_CONNECT_SRC),
  trackerPort: parseInt(process.env.TRACKER_PORT || '5001', 10),
  trackerHost: process.env.TRACKER_HOST || '0.0.0.0',
  traccarWebhookSecret,
  traccarUrl: process.env.TRACCAR_URL || '',
  traccarToken: process.env.TRACCAR_TOKEN || '',
  traccarUser: process.env.TRACCAR_USER || '',
  traccarPassword: process.env.TRACCAR_PASSWORD || '',
  traccarPollEnabled: process.env.TRACCAR_POLL_ENABLED === 'true',
  traccarPollMs: parseInt(process.env.TRACCAR_POLL_MS || '15000', 10),
  traccarLookbackMs: parseInt(process.env.TRACCAR_LOOKBACK_MS || '3600000', 10),
};
