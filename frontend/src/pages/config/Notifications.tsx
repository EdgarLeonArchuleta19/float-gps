import React, { useState } from 'react';
import { Bell, RefreshCw, Zap, Volume2, AlertTriangle } from 'lucide-react';
import SettingsPageHeader from '../../components/SettingsPageHeader';
import SettingToggle from '../../components/SettingToggle';
import { useLayout } from '../../context/LayoutContext';

export default function Notifications() {
  const { darkMode } = useLayout();
  const [notifications, setNotifications] = useState(() => {
    return localStorage.getItem('cfg_notif') !== 'false';
  });
  const [autoRefresh, setAutoRefresh] = useState(() => {
    return localStorage.getItem('cfg_refresh') !== 'false';
  });
  const [speedAlerts, setSpeedAlerts] = useState(() => {
    return localStorage.getItem('cfg_speed') !== 'false';
  });
  const [sound, setSound] = useState(() => {
    return localStorage.getItem('cfg_sound') !== 'false';
  });
  const [geofenceAlerts, setGeofenceAlerts] = useState(() => {
    return localStorage.getItem('cfg_geo') !== 'false';
  });

  const persist = (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    localStorage.setItem(key, String(value));
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <SettingsPageHeader title="Notificaciones" subtitle="Controla las alertas del sistema" />

      <div className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl p-5`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-[#3b82f6]/15' : 'bg-[#3b82f6]/10'}`}>
            <Bell className={`w-5 h-5 ${darkMode ? 'text-[#3b82f6]' : 'text-[#3b82f6]'}`} />
          </div>
          <h2 className={`text-[15px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>Alertas</h2>
        </div>

        <div className="space-y-1">
          <SettingToggle
            icon={<Bell className="w-4 h-4" />}
            label="Notificaciones"
            description="Recibe alertas por eventos importantes"
            checked={notifications}
            onChange={() => persist('cfg_notif', !notifications, setNotifications)}
          />
          <SettingToggle
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Alertas de exceso de velocidad"
            description="Notificar cuando una unidad supere el límite"
            checked={speedAlerts}
            onChange={() => persist('cfg_speed', !speedAlerts, setSpeedAlerts)}
          />
          <SettingToggle
            icon={<Zap className="w-4 h-4" />}
            label="Alertas de geocerca"
            description="Avisar al entrar o salir de una zona"
            checked={geofenceAlerts}
            onChange={() => persist('cfg_geo', !geofenceAlerts, setGeofenceAlerts)}
          />
          <SettingToggle
            icon={<Volume2 className="w-4 h-4" />}
            label="Sonido"
            description="Reproducir sonido cuando llega una alerta"
            checked={sound}
            onChange={() => persist('cfg_sound', !sound, setSound)}
            last
          />
        </div>
      </div>

      <div className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl p-5`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-[#8b5cf6]/15' : 'bg-[#8b5cf6]/10'}`}>
            <RefreshCw className={`w-5 h-5 ${darkMode ? 'text-[#8b5cf6]' : 'text-[#8b5cf6]'}`} />
          </div>
          <h2 className={`text-[15px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>Mapa</h2>
        </div>
        <div className="space-y-1">
          <SettingToggle
            icon={<RefreshCw className="w-4 h-4" />}
            label="Actualización automática"
            description="Refrescar posiciones cada 10 segundos"
            checked={autoRefresh}
            onChange={() => persist('cfg_refresh', !autoRefresh, setAutoRefresh)}
            last
          />
        </div>
      </div>
    </div>
  );
}