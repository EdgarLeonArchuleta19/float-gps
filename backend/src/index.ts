import app from './app';
import { config } from './config';
import { startTraccarBridge } from './tracker/traccar';
import { ensureOwnerAndDefaultCompany } from './bootstrapOwner';
import { syncSystemRoles } from './services/systemRoles';

ensureOwnerAndDefaultCompany()
  .then(syncSystemRoles)
  .catch((err) => console.error('[ROLES] Error sincronizando roles predeterminados:', err))
  .finally(() => {
    app.listen(config.port, () => {
      console.log(`Backend running on port ${config.port}`);
    });

    if (config.traccarUrl && config.traccarPollEnabled) {
      startTraccarBridge();
    }
  });
