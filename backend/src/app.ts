import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { errorHandler } from './middleware/errorHandler';
import { authRequired, adminRequired, superAdminRequired, ownerIpAllowed, permissionRequired } from './middleware/auth';
import { config } from './config';
import authRoutes from './routes/auth.routes';
import ownerRoutes from './routes/owner.routes';
import dashboardRoutes from './routes/dashboard.routes';
import vehicleRoutes from './routes/vehicle.routes';
import machineRoutes from './routes/machine.routes';
import gpsRoutes from './routes/gps.routes';
import eventRoutes from './routes/event.routes';
import geofenceRoutes from './routes/geofence.routes';
import reportRoutes from './routes/report.routes';
import userRoutes from './routes/user.routes';
import ingestRoutes from './routes/ingest.routes';
import companyRoutes from './routes/company.routes';
import roleRoutes from './routes/role.routes';
import { handleEngineCommand } from './controllers/commands.controller';

const app = express();

app.set('trust proxy', config.trustProxy);

// Auth travels in the Authorization header (no cookies), so credentials stay off.
// Without CORS_ORIGINS, production only accepts same-origin browser calls; the
// native app sends no Origin header and is unaffected.
const corsOptions: cors.CorsOptions = {
  origin: config.corsOrigins.length ? config.corsOrigins : !config.isProduction,
  credentials: false,
};
app.use(cors(corsOptions));

const MAP_HOSTS = ['https://tiles.openfreemap.org', 'https://*.cartocdn.com', 'https://server.arcgisonline.com'];
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  `img-src 'self' data: blob: ${MAP_HOSTS.join(' ')}`,
  "font-src 'self' data:",
  `connect-src 'self' ${[...MAP_HOSTS, 'https://router.project-osrm.org', ...config.cspConnectSrc].join(' ')}`,
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');
app.use(express.json({ limit: '1mb' }));
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (config.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use('/api/owner', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.get('/api', (_req, res) => {
  res.json({ name: 'Floa GPS API', status: 'running', health: '/api/health' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use('/api/ingest', ingestRoutes);
app.use('/api/auth/owner-login', ownerIpAllowed);
app.use('/api/auth', authRoutes);
app.use('/api/owner', ownerIpAllowed, authRequired, superAdminRequired, ownerRoutes);
app.use('/api/dashboard', authRequired, permissionRequired('dashboard', 'alerts'), dashboardRoutes);
app.use('/api/vehicles', authRequired, vehicleRoutes);
app.use('/api/machines', authRequired, machineRoutes);
app.use('/api/gps', authRequired, gpsRoutes);
app.use('/api/events', authRequired, permissionRequired('alerts', 'dashboard'), eventRoutes);
app.use('/api/geofences', authRequired, geofenceRoutes);
app.use('/api/reports', authRequired, reportRoutes);
app.use('/api/users', authRequired, adminRequired, userRoutes);
app.use('/api/roles', authRequired, adminRequired, roleRoutes);
app.use('/api/company', authRequired, companyRoutes);
app.post('/api/commands/engine-stop', authRequired, permissionRequired('engine'), handleEngineCommand);

// The client app is the Expo universal build in frontend/ (`npx expo export -p web`).
const webDistPath = path.resolve(__dirname, '../../frontend/dist');
const localDistPath = path.resolve(__dirname, '../public');

let staticPath: string | null = null;
if (fs.existsSync(webDistPath)) {
  staticPath = webDistPath;
} else if (fs.existsSync(localDistPath)) {
  staticPath = localDistPath;
}

if (staticPath) {
  app.use(express.static(staticPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(staticPath!, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({
      name: 'Floa GPS API',
      version: '1.0.0',
      status: 'running',
      message: 'Build web no detectado. Corre `npx expo export -p web` en frontend para servirlo desde aquí.',
    });
  });
}

app.use(errorHandler);

export default app;
