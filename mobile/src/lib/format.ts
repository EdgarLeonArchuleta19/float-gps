export function formatDate(d: string | Date): string {
  const date = new Date(d);
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatTime(d: string | Date): string {
  const date = new Date(d);
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDateTime(d: string | Date): string {
  return `${formatDate(d)} ${formatTime(d)}`;
}

export function formatHours(h: number): string {
  const hours = Math.floor(h);
  const minutes = Math.round((h - hours) * 60);
  return `${hours}h ${minutes}m`;
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'MOVING': return 'En movimiento';
    case 'STOPPED': return 'Detenido';
    case 'OFFLINE': return 'Apagado';
    case 'ALERT': return 'Alerta';
    default: return status;
  }
}

export function markerColor(status: string): string {
  switch (status) {
    case 'MOVING': return '#22C55E';
    case 'STOPPED': return '#EAB308';
    case 'OFFLINE': return '#9CA3AF';
    case 'ALERT': return '#EF4444';
    default: return '#9CA3AF';
  }
}

export function eventTypeLabel(type: string): string {
  switch (type) {
    case 'IGNITION_ON': return 'Motor encendido';
    case 'IGNITION_OFF': return 'Motor apagado';
    case 'GEOFENCE_ENTER': return 'Entrada a geocerca';
    case 'GEOFENCE_EXIT': return 'Salida de geocerca';
    case 'OVERSPEED': return 'Exceso de velocidad';
    case 'LOW_BATTERY': return 'Batería baja';
    case 'ENGINE_STOP': return 'Paro de motor';
    case 'ENGINE_STOP_SENT': return 'Paro de motor enviado';
    case 'ENGINE_RESUME_SENT': return 'Reanudación enviada';
    case 'GPS_DISCONNECTED': return 'GPS desconectado';
    case 'GPS_CONNECTED': return 'GPS conectado';
    case 'SOS': return 'Botón de pánico';
    default: return type.replace(/_/g, ' ').toLowerCase();
  }
}

export function severityHex(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return '#EF4444';
    case 'WARNING': return '#EAB308';
    case 'INFO': return '#3B82F6';
    default: return '#9CA3AF';
  }
}

export function shortTimeAgo(d: string | Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

export function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function shiftDate(value: string, days: number): string {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toDateInput(date);
}

export function formatDayLabel(value: string): string {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}
