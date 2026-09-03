import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app';

let initialized = false;

async function initDb() {
  if (initialized) return;

  process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:/tmp/prod.db';

  const { execSync } = require('child_process');
  const path = require('path');

  try {
    console.log('[INIT] Generating Prisma client...');
    execSync('npx prisma generate', { cwd: process.cwd(), stdio: 'inherit' });
  } catch (e: any) {
    console.error('[INIT] prisma generate failed:', e.message);
  }

  try {
    console.log('[INIT] Pushing schema...');
    execSync('npx prisma db push --skip-generate', { cwd: process.cwd(), stdio: 'inherit' });
  } catch (e: any) {
    console.error('[INIT] prisma db push failed:', e.message);
  }

  try {
    console.log('[INIT] Seeding database...');
    const seedPath = path.join(process.cwd(), 'dist', 'prisma', 'seed.js');
    execSync(`node "${seedPath}"`, { cwd: process.cwd(), stdio: 'inherit', timeout: 55000 });
    console.log('[INIT] Seed completed!');
  } catch (e: any) {
    console.error('[INIT] Seed failed (will use empty DB):', e.message);
  }

  initialized = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await initDb();
  return app(req, res);
}