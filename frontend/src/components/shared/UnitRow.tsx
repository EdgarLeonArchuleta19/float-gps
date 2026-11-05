import type React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { markerColor, shortTimeAgo } from '@/lib/format';
import type { FleetUnit } from '@/lib/types';
import { kmToday } from '@/lib/units';
import { UnitIcon } from './VehicleIcon';

export default function UnitRow({
  unit,
  onPress,
  selected,
  showChevron,
  trailing,
}: {
  unit: FleetUnit;
  onPress: () => void;
  selected?: boolean;
  showChevron?: boolean;
  trailing?: React.ReactNode;
}) {
  const { t } = useTheme();
  const color = markerColor(unit.status);
  const km = kmToday(unit);
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 ${trailing ? 'pl-4 pr-3' : 'px-4'} py-3 rounded-2xl ${selected ? t.selected : t.press}`}
    >
      <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: `${color}1f` }}>
        <UnitIcon unit={unit} size={30} />
      </View>
      <View className="flex-1 min-w-0">
        <Text numberOfLines={1} className={`text-[15px] font-semibold ${t.text}`}>
          {unit.name}
        </Text>
        <Text numberOfLines={1} className={`text-[12.5px] mt-0.5 ${t.muted}`}>
          {unit.plate}
          {unit.group ? ` · ${unit.group.name}` : ''}
          {unit.position ? ` · hace ${shortTimeAgo(unit.position.timestamp)}` : ' · sin reporte'}
        </Text>
      </View>
      <View className="items-end">
        <Text className={`text-[15px] font-extrabold ${t.text}`}>{km.toFixed(1)}</Text>
        <Text className={`text-[11px] ${t.muted}`}>km hoy</Text>
      </View>
      {trailing}
      {showChevron && !trailing ? <ChevronRight size={16} color={t.hex.muted} /> : null}
    </Pressable>
  );
}
