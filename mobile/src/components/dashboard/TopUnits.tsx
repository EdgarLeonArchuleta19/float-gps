import { Text, View } from 'react-native';
import { BarChart3 } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { formatHours } from '@/lib/format';
import { Card, EmptyState } from '@/components/ui';
import KmBar from './KmBar';
import type { UnitSummary } from '@/components/reports/summary';

export default function TopUnits({ items }: { items: UnitSummary[] }) {
  const { t } = useTheme();
  if (!items.length) {
    return (
      <Card>
        <EmptyState icon={BarChart3} title="Sin recorridos hoy" />
      </Card>
    );
  }
  const max = items[0].km;
  return (
    <Card className="p-4 gap-4">
      {items.map((s, i) => (
        <View key={s.unitName} className="gap-1.5">
          <View className="flex-row items-center justify-between">
            <Text className={`text-[13.5px] font-semibold flex-1 ${t.text}`} numberOfLines={1}>
              {i + 1}. {s.unitName}
            </Text>
            <Text className={`text-[12px] ${t.muted}`}>
              <Text className={`font-bold ${t.text}`}>{s.km.toFixed(1)} km</Text> · {formatHours(s.hours)}
            </Text>
          </View>
          <KmBar km={s.km} maxKm={max} />
        </View>
      ))}
    </Card>
  );
}
