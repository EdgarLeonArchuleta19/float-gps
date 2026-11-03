import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, ParkingCircle } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { markerColor, shortTimeAgo } from '@/lib/format';
import { Card, EmptyState } from '@/components/ui';
import VehicleIcon from '@/components/shared/VehicleIcon';

export interface LiveUnit {
  id: string;
  name: string;
  plate: string;
  status: string;
  unitType: 'vehicle' | 'machine';
  kmToday: number;
  heading?: number;
  lastReport: string;
}

export default function MovingNow({ units }: { units: LiveUnit[] }) {
  const { t } = useTheme();
  if (!units.length) {
    return (
      <Card>
        <EmptyState icon={ParkingCircle} title="Nadie en movimiento" message="Todas las unidades están detenidas o apagadas." />
      </Card>
    );
  }
  return (
    <Card className="py-1">
      {units.map((u, i) => (
        <Pressable
          key={u.id}
          onPress={() => router.replace(`/live-map?unit=${u.id}` as never)}
          className={`flex-row items-center gap-3 px-4 py-3 ${i < units.length - 1 ? `border-b ${t.border}` : ''} active:opacity-70`}
        >
          <VehicleIcon kind={u.unitType} color={markerColor(u.status)} size={30} heading={u.heading ?? 0} />
          <View className="flex-1 min-w-0">
            <Text className={`text-[14px] font-semibold ${t.text}`} numberOfLines={1}>
              {u.name}
            </Text>
            <Text className={`text-[12px] ${t.muted}`}>
              {u.plate} · hace {shortTimeAgo(u.lastReport)}
            </Text>
          </View>
          <View className="items-end">
            <Text className={`text-[16px] font-bold ${t.text}`}>{u.kmToday.toFixed(1)}</Text>
            <Text className={`text-[10px] ${t.subtle}`}>km hoy</Text>
          </View>
          <ChevronRight size={16} color={t.hex.muted} />
        </Pressable>
      ))}
    </Card>
  );
}
