import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { authRequired, adminRequired } from './middleware/auth';
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import vehicleRoutes from './routes/vehicle.routes';
import machineRoutes from './routes/machine.routes';
import gpsRoutes from './routes/gps.routes';
import eventRoutes from './routes/event.routes';
import geofenceRoutes from './routes/geofence.routes';
import reportRoutes from './routes/report.routes';
import userRoutes from './routes/user.routes';
import { trackerState } from './tracker/server';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    name: 'Floa GPS API',
    version: '1.0.0',
    status: 'running',
    endpoints: ['/api/auth/login', '/api/health', '/api/dashboard', '/api/vehicles', '/api/machines', '/api/gps/:id/positions', '/api/gps/:id/tracking', '/api/events', '/api/geofences', '/api/reports'],
  });
});

app.get('/api', (_req, res) => {
  res.json({ name: 'Floa GPS API', status: 'running', health: '/api/health' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use('/api/auth', authRoutes);

app.use('/api/dashboard', authRequired, dashboardRoutes);
app.use('/api/vehicles', authRequired, vehicleRoutes);
app.use('/api/machines', authRequired, machineRoutes);
app.use('/api/gps', authRequired, gpsRoutes);
app.use('/api/events', authRequired, eventRoutes);
app.use('/api/geofences', authRequired, geofenceRoutes);
app.use('/api/reports', authRequired, reportRoutes);
app.use('/api/users', authRequired, adminRequired, userRoutes);

app.post('/api/commands/engine-stop', authRequired, (req, res) => {
  const { unitId, unitType } = req.body;
  console.log(`Engine stop command sent to ${unitType} ${unitId}`);
  res.json({
    success: true,
    message: 'Comando de paro de motor enviado correctamente',
    command: { unitId, unitType, type: 'ENGINE_STOP', timestamp: new Date() },
  });
});

app.get('/api/tracker/status', authRequired, (_req, res) => {
  res.json(trackerState);
});

app.use(errorHandler);

export default app;