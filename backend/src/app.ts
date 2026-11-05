import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { errorHandler } from './middleware/errorHandler';
import { authRequired, adminRequired, permissionRequired, historyWindow, planRequired } from './middleware/auth';
import { staffNetworkAllowed, staffNetworkRequired } from './middleware/staffAuth';
import { config } from './config';
import authRoutes from './routes/auth.routes';
import staffRoutes from './routes/staff.routes';
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
import groupRoutes from './routes/group.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import notificationRoutes from './routes/notification.routes';
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
app.use('/api/staff', (_req, res, next) => {
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
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffNetworkRequired, staffRoutes);
app.use('/api/dashboard', authRequired, permissionRequired('dashboard', 'alerts'), dashboardRoutes);
app.use('/api/vehicles', authRequired, vehicleRoutes);
app.use('/api/machines', authRequired, machineRoutes);
app.use('/api/gps', authRequired, historyWindow, gpsRoutes);
app.use('/api/events', authRequired, permissionRequired('alerts', 'dashboard'), historyWindow, eventRoutes);
app.use('/api/geofences', authRequired, geofenceRoutes);
app.use('/api/reports', authRequired, historyWindow, reportRoutes);
app.use('/api/users', authRequired, adminRequired, planRequired('EMPRESA'), userRoutes);
app.use('/api/roles', authRequired, adminRequired, planRequired('EMPRESA'), roleRoutes);
app.use('/api/company', authRequired, companyRoutes);
app.use('/api/groups', authRequired, planRequired('EMPRESA'), groupRoutes);
app.use('/api/maintenance', authRequired, permissionRequired('maintenance'), maintenanceRoutes);
app.use('/api/notifications', authRequired, notificationRoutes);
app.post('/api/commands/engine-stop', authRequired, permissionRequired('engine'), handleEngineCommand);

// Two web builds from frontend/: dist is the customer app (the console is
// stubbed out of it) and dist-console is the floaGPS team console. With
// STAFF_HOST set, that host only serves the console and the customer host
// never serves it; without it (local dev or a single tunnel) the console
// lives under /console on the same host.
const clientDist = path.resolve(__dirname, '../../frontend/dist');
const consoleDist = path.resolve(__dirname, '../../frontend/dist-console');
const hasClient = fs.existsSync(clientDist);
const hasConsole = fs.existsSync(consoleDist);
const serveClient = express.static(clientDist);
const serveConsole = express.static(consoleDist, { index: false });
const CONSOLE_PATH = /^\/console(-login)?(\/|$)/;

function isConsoleHost(req: express.Request) {
  return !!config.staffHost && req.hostname.toLowerCase() === config.staffHost;
}

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (isConsoleHost(req)) {
    if (!hasConsole || !staffNetworkAllowed(req)) return res.status(404).end();
    return serveConsole(req, res, next);
  }
  if (!hasClient) return next();
  return serveClient(req, res, () => {
    if (!config.staffHost && hasConsole && staffNetworkAllowed(req)) return serveConsole(req, res, next);
    next();
  });
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (isConsoleHost(req)) {
    if (!CONSOLE_PATH.test(req.path)) return res.redirect('/console');
    return res.sendFile(path.join(consoleDist, 'index.html'));
  }
  if (CONSOLE_PATH.test(req.path)) {
    if (config.staffHost || !hasConsole || !staffNetworkAllowed(req)) return res.status(404).end();
    return res.sendFile(path.join(consoleDist, 'index.html'));
  }
  if (hasClient) return res.sendFile(path.join(clientDist, 'index.html'));
  res.json({
    name: 'Floa GPS API',
    status: 'running',
    message: 'Build web no detectado. Corre `npm run build:web` en frontend para servirlo desde aquí.',
  });
});

app.use(errorHandler);

export default app;
