import app from './app';
import { config } from './config';
import { startTrackerServer } from './tracker/server';

app.listen(config.port, () => {
  console.log(`Backend running on port ${config.port}`);
});

startTrackerServer();