import app from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`Backend running on port ${config.port}`);
});