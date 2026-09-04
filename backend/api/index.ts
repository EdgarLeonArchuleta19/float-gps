import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app';

// Neon (PostgreSQL) es persistente — no hay que crear/seedear la DB por request.
// El schema/migración y el seed se corren una sola vez durante el build (ver build:vercel).
export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
