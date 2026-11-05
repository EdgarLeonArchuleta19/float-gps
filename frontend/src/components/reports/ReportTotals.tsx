import { Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { formatHours } from '@/lib/format';
import { Card } from '@/components/ui';
import { NUMERIC } from './sorting';
import { usePlan } from '@/hooks/usePlan';

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
  const { isPersonal } = usePlan();
  const idleShare = totals.hours > 0 ? Math.round((totals.idle / totals.hours) * 100) : 0;
  const cells: { label: string; value: string; hint?: string }[] = [
    { label: 'Unidades', value: String(totals.units) },
    { label: 'Km recorridos', value: totals.km.toFixed(1) },
    { label: 'Horas motor', value: formatHours(totals.hours) },
    { label: 'Ralentí', value: formatHours(totals.idle), hint: `${idleShare}% del motor` },
    { label: 'Fuera horario', value: `${totals.offHoursKm.toFixed(1)} km` },
    { label: 'Alertas', value: String(totals.alerts) },
  ].filter((c) => !isPersonal || c.label !== 'Fuera horario');
  const columns = isDesktop ? cells.length : 3;
  return (
    <Card className="flex-row flex-wrap overflow-hidden mb-4">
      {cells.map((c, i) => (
        <View
          key={c.label}
          className={`px-4 py-3.5 ${i % columns ? `border-l ${t.border}` : ''} ${i >= columns ? `border-t ${t.border}` : ''}`}
          style={{ width: `${100 / columns}%` }}
        >
          <Text className={`text-[12px] font-medium ${t.muted}`} numberOfLines={1}>
            {c.label}
          </Text>
          <Text
            className={`text-[19px] font-extrabold tracking-tight mt-1 ${c.label === 'Alertas' && totals.alerts ? 'text-accent' : t.text}`}
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
