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

export const config = {
  ownerMasterKey,
  ownerTokenTtl: process.env.OWNER_TOKEN_TTL || '8h',
  ownerAllowedIps: process.env.OWNER_ALLOWED_IPS
    ? process.env.OWNER_ALLOWED_IPS.split(',').map((s) => s.trim()).filter(Boolean)
    : [],
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: jwtSecret || 'demo-jwt-secret',
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim()) : null,
  trackerPort: parseInt(process.env.TRACKER_PORT || '5001', 10),
  trackerHost: process.env.TRACKER_HOST || '0.0.0.0',
  traccarWebhookSecret: process.env.TRACCAR_WEBHOOK_SECRET || '',
  traccarUrl: process.env.TRACCAR_URL || '',
  traccarToken: process.env.TRACCAR_TOKEN || '',
  traccarUser: process.env.TRACCAR_USER || '',
  traccarPassword: process.env.TRACCAR_PASSWORD || '',
  traccarPollEnabled: process.env.TRACCAR_POLL_ENABLED === 'true',
  traccarPollMs: parseInt(process.env.TRACCAR_POLL_MS || '15000', 10),
  traccarLookbackMs: parseInt(process.env.TRACCAR_LOOKBACK_MS || '3600000', 10),
};
