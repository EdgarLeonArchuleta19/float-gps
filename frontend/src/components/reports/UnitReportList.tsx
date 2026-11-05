import { Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { formatHours } from '@/lib/format';
import { Card } from '@/components/ui';
import { NUMERIC } from './sorting';
import type { UnitSummary } from './summary';
import { usePlan } from '@/hooks/usePlan';

export default function UnitReportList({ items }: { items: UnitSummary[] }) {
  const { t } = useTheme();
  const { isPersonal } = usePlan();
  return (
    <Card>
      {items.map((s, i) => {
        const cells = [
          { label: 'Motor', value: formatHours(s.hours) },
          { label: 'Movimiento', value: formatHours(s.moving) },
          { label: 'Ralentí', value: formatHours(s.idle) },
          { label: 'F. horario', value: `${s.offHoursKm.toFixed(1)} km` },
        ].filter((c) => !isPersonal || c.label !== 'F. horario');
        return (
          <View key={s.unitName} className={`px-4 py-3 ${i < items.length - 1 ? `border-b ${t.border}` : ''}`}>
            <View className="flex-row items-baseline gap-3">
              <Text className={`text-[14px] font-semibold flex-1 ${t.text}`} numberOfLines={1}>
                {s.unitName}
              </Text>
              <Text className={`text-[15px] font-bold ${t.text}`} style={NUMERIC}>
                {s.km.toFixed(1)} <Text className={`text-[11px] font-medium ${t.muted}`}>km</Text>
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <Text className={`text-[11.5px] font-semibold ${s.alerts ? 'text-accent' : t.muted}`}>
                {s.alerts === 1 ? '1 alerta' : `${s.alerts} alertas`}
              </Text>
              {s.days > 1 ? <Text className={`text-[11.5px] ${t.muted}`}>· {s.days} días</Text> : null}
            </View>
            <View className="flex-row mt-2">
              {cells.map((c) => (
                <View key={c.label} className="flex-1">
                  <Text className={`text-[11px] ${t.muted}`} numberOfLines={1}>
                    {c.label}
                  </Text>
                  <Text className={`text-[12.5px] font-semibold ${t.text}`} style={NUMERIC} numberOfLines={1}>
                    {c.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </Card>
  );
}
