import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { markerColor, shortTimeAgo } from '@/lib/format';
import type { FleetUnit } from '@/lib/types';
import { kmToday } from '@/lib/units';
import VehicleIcon from './VehicleIcon';

export default function UnitRow({
  unit,
  onPress,
  selected,
  showChevron,
}: {
  unit: FleetUnit;
  onPress: () => void;
  selected?: boolean;
  showChevron?: boolean;
}) {
  const { t } = useTheme();
  const color = markerColor(unit.status);
  const km = kmToday(unit);
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 px-4 py-3 rounded-2xl ${selected ? t.active : ''} active:opacity-70`}
    >
      <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: `${color}1f` }}>
        <VehicleIcon kind={unit.kind} color={color} size={30} />
      </View>
      <View className="flex-1 min-w-0">
        <Text numberOfLines={1} className={`text-[14px] font-semibold ${t.text}`}>
          {unit.name}
        </Text>
        <Text numberOfLines={1} className={`text-[12px] ${t.muted}`}>
          {unit.plate}
          {unit.position ? ` · hace ${shortTimeAgo(unit.position.timestamp)}` : ' · sin reporte'}
        </Text>
      </View>
      <View className="items-end">
        <Text className={`text-[14px] font-bold ${t.text}`}>{km.toFixed(1)}</Text>
        <Text className={`text-[10px] ${t.subtle}`}>km hoy</Text>
      </View>
      {showChevron ? <ChevronRight size={16} color={t.hex.muted} /> : null}
    </Pressable>
  );
}
