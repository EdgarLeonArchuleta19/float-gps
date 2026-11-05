import { Pressable, Text, View } from 'react-native';
import { ArrowDown } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { formatHours } from '@/lib/format';
import { Card } from '@/components/ui';
import { NUMERIC, type SortKey } from './sorting';
import type { Totals } from './ReportTotals';
import type { UnitSummary } from './summary';
import { usePlan } from '@/hooks/usePlan';

type Column = { label: string; flex: number; sort?: SortKey; value: (s: UnitSummary) => string };

const COLUMNS: Column[] = [
  { label: 'Días', flex: 1, value: (s) => String(s.days) },
  { label: 'Km', flex: 2, sort: 'km', value: (s) => s.km.toFixed(1) },
  { label: 'Horas motor', flex: 2, sort: 'hours', value: (s) => formatHours(s.hours) },
  { label: 'Movimiento', flex: 2, value: (s) => formatHours(s.moving) },
  { label: 'Ralentí', flex: 2, sort: 'idle', value: (s) => formatHours(s.idle) },
  { label: 'Km fuera horario', flex: 2, sort: 'offHoursKm', value: (s) => s.offHoursKm.toFixed(1) },
  { label: 'Alertas', flex: 1, sort: 'alerts', value: (s) => String(s.alerts) },
];

export default function SummaryTable({
  items,
  totals,
  sort,
  onSort,
}: {
  items: UnitSummary[];
  totals: Totals & { moving: number; days: number };
  sort: SortKey;
  onSort: (key: SortKey) => void;
}) {
  const { t } = useTheme();
  const { isPersonal } = usePlan();
  const columns = isPersonal ? COLUMNS.filter((c) => c.sort !== 'offHoursKm') : COLUMNS;
  const head = `text-[11px] font-semibold uppercase tracking-wide`;
  const cell = `text-[13px] text-right ${t.text}`;
  const totalRow: UnitSummary = { unitName: 'Total', ...totals };
  return (
    <Card className="overflow-hidden">
      <View className={`flex-row items-center px-4 py-2.5 border-b ${t.border} ${t.input}`}>
        <Text className={`${head} flex-[3] ${t.muted}`}>Unidad</Text>
        {columns.map((c) => {
          const active = c.sort === sort;
          const label = (
            <Text className={`${head} text-right ${active ? t.text : t.muted}`} numberOfLines={1}>
              {c.label}
            </Text>
          );
          return c.sort ? (
            <Pressable key={c.label} onPress={() => onSort(c.sort!)} className="flex-row items-center justify-end gap-1 active:opacity-60" style={{ flex: c.flex }}>
              {active ? <ArrowDown size={11} color={t.hex.text} /> : null}
              {label}
            </Pressable>
          ) : (
            <View key={c.label} style={{ flex: c.flex }}>
              {label}
            </View>
          );
        })}
      </View>
      {items.map((s) => (
        <View key={s.unitName} className={`flex-row items-center px-4 py-2.5 border-b ${t.border}`}>
          <Text className={`text-[13px] font-semibold flex-[3] ${t.text}`} numberOfLines={1}>
            {s.unitName}
          </Text>
          {columns.map((c) => (
            <Text
              key={c.label}
              className={`${cell} ${c.sort === 'alerts' && s.alerts ? 'text-accent font-semibold' : ''}`}
              style={[NUMERIC, { flex: c.flex }]}
              numberOfLines={1}
            >
              {c.value(s)}
            </Text>
          ))}
        </View>
      ))}
      <View className={`flex-row items-center px-4 py-3 ${t.input}`}>
        <Text className={`text-[13px] font-bold flex-[3] ${t.text}`}>Total ({totals.units})</Text>
        {columns.map((c) => (
          <Text key={c.label} className={`${cell} font-bold`} style={[NUMERIC, { flex: c.flex }]} numberOfLines={1}>
            {c.label === 'Días' ? '' : c.value(totalRow)}
          </Text>
        ))}
      </View>
    </Card>
  );
}
