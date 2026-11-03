import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { BatteryLow, Bell, CircleDot, Gauge, Power, Radio, Siren } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatDayLabel, shiftDate, toDateInput } from '@/lib/format';
import type { TrackingEvent } from '@/lib/types';
import { Card, Chip, ChipRow, EmptyState, ErrorBanner, Loading, PageHeader, Screen } from '@/components/ui';
import EventRow from '@/components/events/EventRow';
import EventPreviewSheet from '@/components/events/EventPreviewSheet';
import AlarmCard from '@/components/notifications/AlarmCard';
import Pagination from '@/components/shared/Pagination';
import { usePagination } from '@/hooks/usePagination';

interface Filter {
  key: string;
  label: string;
  icon?: LucideIcon;
  match: (type: string) => boolean;
}

const FILTERS: Filter[] = [
  { key: 'all', label: 'Todas', match: () => true },
  { key: 'speed', label: 'Velocidad', icon: Gauge, match: (ty) => ty === 'OVERSPEED' },
  { key: 'geofence', label: 'Geocercas', icon: CircleDot, match: (ty) => ty.startsWith('GEOFENCE') },
  { key: 'engine', label: 'Motor', icon: Power, match: (ty) => ty.startsWith('IGNITION') || ty.startsWith('ENGINE') },
  { key: 'battery', label: 'Batería', icon: BatteryLow, match: (ty) => ty === 'LOW_BATTERY' },
  { key: 'gps', label: 'GPS', icon: Radio, match: (ty) => ty.startsWith('GPS') },
  { key: 'sos', label: 'SOS', icon: Siren, match: (ty) => ty === 'SOS' },
];

function groupByDay(events: TrackingEvent[]) {
  const groups: { day: string; items: TrackingEvent[] }[] = [];
  events.forEach((e) => {
    const day = toDateInput(new Date(e.timestamp));
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  });
  return groups;
}

export default function Notifications() {
  const { t } = useTheme();
  const [filter, setFilter] = useState('all');
  const [preview, setPreview] = useState<TrackingEvent | null>(null);
  const today = toDateInput(new Date());

  const { data, loading, error, refreshing, refresh } = useApi(
    () => api.events.list({ startDate: `${shiftDate(today, -6)}T00:00:00`, limit: '300' }),
    [],
    { pollMs: 30000 }
  );

  const all = data?.data || [];
  const active = FILTERS.find((f) => f.key === filter) || FILTERS[0];
  const filtered = useMemo(() => all.filter((e) => active.match(e.type)), [all, active]);
  const { pageItems, pager } = usePagination(filtered, filter, 15);
  const groups = useMemo(() => groupByDay(pageItems), [pageItems]);
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, all.filter((e) => f.match(e.type)).length])), [all]);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} maxWidth={860}>
      <PageHeader title="Alertas" back="/more" subtitle="Últimos 7 días · toca una alerta para verla en el mapa" />
      <AlarmCard />
      <View className="mb-4">
        <ChipRow>
          {FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} icon={f.icon} count={counts[f.key]} active={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </ChipRow>
      </View>
      {error ? <ErrorBanner message={error} /> : null}
      {loading && !data ? (
        <Loading />
      ) : groups.length ? (
        groups.map((g) => (
          <View key={g.day} className="mb-4">
            <Text className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${t.subtle}`}>
              {g.day === today ? 'Hoy' : formatDayLabel(g.day)}
            </Text>
            <Card className="py-1">
              {g.items.map((e) => (
                <EventRow key={e.id} event={e} onPress={() => setPreview(e)} />
              ))}
            </Card>
          </View>
        ))
      ) : (
        <Card>
          <EmptyState icon={Bell} title="Sin notificaciones" message="No hay eventos con este filtro." />
        </Card>
      )}
      <Pagination {...pager} />
      <EventPreviewSheet event={preview} onClose={() => setPreview(null)} />
    </Screen>
  );
}
