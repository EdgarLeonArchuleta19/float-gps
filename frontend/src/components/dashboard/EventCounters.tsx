import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { BatteryLow, CircleDot, Gauge, Power } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import type { TrackingEvent } from '@/lib/types';

const COUNTERS: { label: string; icon: LucideIcon; match: (type: string) => boolean }[] = [
  { label: 'Velocidad', icon: Gauge, match: (ty) => ty === 'OVERSPEED' },
  { label: 'Geocercas', icon: CircleDot, match: (ty) => ty.startsWith('GEOFENCE') },
  { label: 'Encendidos', icon: Power, match: (ty) => ty === 'IGNITION_ON' },
  { label: 'Batería / SOS', icon: BatteryLow, match: (ty) => ty === 'LOW_BATTERY' || ty === 'SOS' },
];

export default function EventCounters({ events }: { events: TrackingEvent[] }) {
  const { t } = useTheme();
  return (
    <View className="flex-row flex-wrap gap-2">
      {COUNTERS.map((c) => {
        const count = events.filter((e) => c.match(e.type)).length;
        return (
          <Pressable
            key={c.label}
            onPress={() => router.push('/notifications')}
            className={`flex-1 min-w-[44%] flex-row items-center gap-3 rounded-2xl p-3.5 ${t.card} ${t.press}`}
          >
            <View className={`w-11 h-11 rounded-full items-center justify-center ${t.tonal}`}>
              <c.icon size={18} color={t.hex.brand} />
            </View>
            <View className="flex-1">
              <Text className={`text-[22px] font-extrabold tracking-tight ${t.text}`}>{count}</Text>
              <Text className={`text-[12px] ${t.muted}`} numberOfLines={1}>
                {c.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
