import { Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AlertTriangle, BatteryLow, CircleDot, Gauge, MapPin, Power, PowerOff, Radio, Siren } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { eventTypeLabel, formatTime, severityHex, shortTimeAgo } from '@/lib/format';
import type { TrackingEvent } from '@/lib/types';

const ICONS: Record<string, LucideIcon> = {
  IGNITION_ON: Power,
  IGNITION_OFF: PowerOff,
  GEOFENCE_ENTER: CircleDot,
  GEOFENCE_EXIT: CircleDot,
  OVERSPEED: Gauge,
  LOW_BATTERY: BatteryLow,
  ENGINE_STOP: PowerOff,
  ENGINE_STOP_SENT: PowerOff,
  ENGINE_RESUME_SENT: Power,
  GPS_DISCONNECTED: Radio,
  GPS_CONNECTED: Radio,
  SOS: Siren,
};

export function eventUnitName(e: TrackingEvent): string {
  return e.unitName || e.gpsDevice?.vehicle?.name || e.gpsDevice?.machine?.name || 'Unidad';
}

export default function EventRow({ event, onPress }: { event: TrackingEvent; onPress?: () => void }) {
  const { t } = useTheme();
  const color = severityHex(event.severity);
  const Icon = ICONS[event.type] || (event.severity === 'CRITICAL' ? AlertTriangle : MapPin);
  const hasLocation = event.latitude !== undefined && event.latitude !== null && event.longitude !== undefined && event.longitude !== null;
  return (
    <Pressable onPress={onPress} disabled={!onPress} className="flex-row items-center gap-3 px-4 py-3 active:opacity-70">
      <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: `${color}1f` }}>
        <Icon size={18} color={color} />
      </View>
      <View className="flex-1 min-w-0">
        <Text className={`text-[13.5px] font-semibold ${t.text}`} numberOfLines={1}>
          {eventTypeLabel(event.type)}
        </Text>
        <Text className={`text-[12px] ${t.muted}`} numberOfLines={1}>
          {eventUnitName(event)}
          {event.speed ? ` · ${Math.round(event.speed)} km/h` : ''}
        </Text>
      </View>
      <View className="items-end gap-0.5">
        <Text className={`text-[11px] ${t.muted}`}>{formatTime(event.timestamp).slice(0, 5)}</Text>
        <Text className={`text-[10.5px] ${t.subtle}`}>{shortTimeAgo(event.timestamp)}</Text>
        {hasLocation && onPress ? <MapPin size={12} color={t.hex.muted} /> : null}
      </View>
    </Pressable>
  );
}
