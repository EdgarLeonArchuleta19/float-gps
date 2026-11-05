import app from './app';
import { config } from './config';
import { startTraccarBridge } from './tracker/traccar';
import { bootstrap } from './bootstrap';
import { syncSystemRoles } from './services/systemRoles';
import { startMaintenanceWatch } from './services/maintenance.service';

bootstrap()
  .then(syncSystemRoles)
  .catch((err) => console.error('[ROLES] Error sincronizando roles predeterminados:', err))
  .finally(() => {
    app.listen(config.port, () => {
      console.log(`Backend running on port ${config.port}`);
    });

    startMaintenanceWatch();

    if (config.traccarUrl && config.traccarPollEnabled) {
      startTraccarBridge();
    }
  });
