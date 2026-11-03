import app from './app';
import { config } from './config';
import { startTraccarBridge } from './tracker/traccar';
import { ensureOwnerAndDefaultCompany } from './bootstrapOwner';

ensureOwnerAndDefaultCompany().finally(() => {
  app.listen(config.port, () => {
    console.log(`Backend running on port ${config.port}`);
  });

  if (config.traccarUrl && config.traccarPollEnabled) {
    startTraccarBridge();
  }
});
