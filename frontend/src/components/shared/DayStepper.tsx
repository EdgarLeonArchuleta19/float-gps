import { Pressable, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { formatDayLabel, shiftDate, toDateInput } from '@/lib/format';

export default function DayStepper({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTheme();
  const today = toDateInput(new Date());
  const isToday = value === today;
  return (
    <View className={`flex-row items-center rounded-xl border ${t.card} ${t.border}`}>
      <Pressable onPress={() => onChange(shiftDate(value, -1))} accessibilityLabel="Día anterior" className="p-2.5 active:opacity-60">
        <ChevronLeft size={18} color={t.hex.text} />
      </Pressable>
      <Pressable onPress={() => onChange(today)} className="flex-1 items-center py-2">
        <Text className={`text-[13px] font-semibold ${t.text}`}>{isToday ? 'Hoy' : formatDayLabel(value)}</Text>
      </Pressable>
      <Pressable
        onPress={() => !isToday && onChange(shiftDate(value, 1))}
        disabled={isToday}
        accessibilityLabel="Día siguiente"
        className={`p-2.5 ${isToday ? 'opacity-30' : 'active:opacity-60'}`}
      >
        <ChevronRight size={18} color={t.hex.text} />
      </Pressable>
    </View>
  );
}
