import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import dashboardRoutes from './routes/dashboard.routes';
import vehicleRoutes from './routes/vehicle.routes';
import machineRoutes from './routes/machine.routes';
import gpsRoutes from './routes/gps.routes';
import eventRoutes from './routes/event.routes';
import geofenceRoutes from './routes/geofence.routes';
import reportRoutes from './routes/report.routes';
import userRoutes from './routes/user.routes';
import { startTrackerServer, trackerState } from './tracker/server';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/geofences', geofenceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

app.post('/api/commands/engine-stop', (req, res) => {
  const { unitId, unitType } = req.body;
  console.log(`Engine stop command sent to ${unitType} ${unitId}`);
  res.json({
    success: true,
    message: 'Comando de paro de motor enviado correctamente',
    command: { unitId, unitType, type: 'ENGINE_STOP', timestamp: new Date() },
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/tracker/status', (_req, res) => {
  res.json(trackerState);
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Backend running on port ${config.port}`);
});

startTrackerServer();

export default app;
