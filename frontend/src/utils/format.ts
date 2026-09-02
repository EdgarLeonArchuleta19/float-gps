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

export function timeAgo(d: string | Date): string {
  const now = new Date();
  const date = new Date(d);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `Hace ${seconds} segundos`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} minutos`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} horas`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} días`;
}

export function formatHours(h: number): string {
  const hours = Math.floor(h);
  const minutes = Math.round((h - hours) * 60);
  return `${hours}h ${minutes}m`;
}

export function formatKm(km: number): string {
  return `${km.toFixed(1)} km`;
}

export function statusColor(status: string): string {
  switch (status) {
    case 'MOVING': return 'bg-green-100 text-green-800';
    case 'STOPPED': return 'bg-yellow-100 text-yellow-800';
    case 'OFFLINE': return 'bg-gray-100 text-gray-600';
    case 'ALERT': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-600';
  }
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

export function eventTypeIcon(type: string): string {
  switch (type) {
    case 'IGNITION_ON': return '🟢';
    case 'IGNITION_OFF': return '🔴';
    case 'GEOFENCE_ENTER': return '🔵';
    case 'GEOFENCE_EXIT': return '🟠';
    case 'OVERSPEED': return '🟡';
    case 'LOW_BATTERY': return '🔴';
    case 'ENGINE_STOP': return '⛔';
    case 'GPS_DISCONNECTED': return '⚫';
    case 'GPS_CONNECTED': return '🟢';
    case 'SOS': return '🆘';
    default: return '📍';
  }
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return 'bg-red-100 text-red-800';
    case 'WARNING': return 'bg-yellow-100 text-yellow-800';
    case 'INFO': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-600';
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

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
