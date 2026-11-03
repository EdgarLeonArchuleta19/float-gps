import { Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { formatHours } from '@/lib/format';
import { Card } from '@/components/ui';
import { NUMERIC } from './sorting';

export interface Totals {
  units: number;
  km: number;
  hours: number;
  idle: number;
  offHoursKm: number;
  alerts: number;
}

export default function ReportTotals({ totals }: { totals: Totals }) {
  const { t } = useTheme();
  const isDesktop = useIsDesktop();
  const columns = isDesktop ? 6 : 3;
  const idleShare = totals.hours > 0 ? Math.round((totals.idle / totals.hours) * 100) : 0;
  const cells: { label: string; value: string; hint?: string }[] = [
    { label: 'Unidades', value: String(totals.units) },
    { label: 'Km recorridos', value: totals.km.toFixed(1) },
    { label: 'Horas motor', value: formatHours(totals.hours) },
    { label: 'Ralentí', value: formatHours(totals.idle), hint: `${idleShare}% del motor` },
    { label: 'Fuera horario', value: `${totals.offHoursKm.toFixed(1)} km` },
    { label: 'Alertas', value: String(totals.alerts) },
  ];
  return (
    <Card className="flex-row flex-wrap overflow-hidden mb-4">
      {cells.map((c, i) => (
        <View
          key={c.label}
          className={`px-3.5 py-3 ${i % columns ? `border-l ${t.border}` : ''} ${i >= columns ? `border-t ${t.border}` : ''}`}
          style={{ width: `${100 / columns}%` }}
        >
          <Text className={`text-[10.5px] font-semibold uppercase tracking-wide ${t.subtle}`} numberOfLines={1}>
            {c.label}
          </Text>
          <Text
            className={`text-[18px] font-bold mt-0.5 ${c.label === 'Alertas' && totals.alerts ? 'text-accent' : t.text}`}
            style={NUMERIC}
            numberOfLines={1}
          >
            {c.value}
          </Text>
          {c.hint ? <Text className={`text-[10.5px] ${t.muted}`}>{c.hint}</Text> : null}
        </View>
      ))}
    </Card>
  );
}
