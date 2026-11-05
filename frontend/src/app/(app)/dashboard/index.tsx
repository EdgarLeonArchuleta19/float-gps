import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BellRing, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAlarm } from '@/context/AlarmContext';
import { useApi } from '@/hooks/useApi';
import { useFleet } from '@/hooks/useFleet';
import { useOffHours } from '@/hooks/useOffHours';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { api } from '@/lib/api';
import { formatHours, toDateInput } from '@/lib/format';
import { hasPosition, kmToday, openUnit } from '@/lib/units';
import type { TrackingEvent } from '@/lib/types';
import { ErrorBanner, Loading, Screen, SectionTitle } from '@/components/ui';
import EventPreviewSheet from '@/components/events/EventPreviewSheet';
import FleetStatusCard from '@/components/dashboard/FleetStatusCard';
import EventCounters from '@/components/dashboard/EventCounters';
import QuickActions from '@/components/dashboard/QuickActions';
import MovingNow, { type LiveUnit } from '@/components/dashboard/MovingNow';
import TopUnits from '@/components/dashboard/TopUnits';
import AttentionList, { attentionFromEvent, type AttentionItem } from '@/components/dashboard/AttentionList';
import MetricTile from '@/components/reports/MetricTile';
import PersonalHome from '@/components/dashboard/PersonalHome';
import { usePlan } from '@/hooks/usePlan';
import { summarize } from '@/components/reports/summary';

interface AlertUnit {
  id: string;
  name: string;
  plate?: string;
  unitType: 'vehicle' | 'machine';
}

function SeeAll({ label, onPress }: { label: string; onPress: () => void }) {
  const { t } = useTheme();
  return (
    <Pressable onPress={onPress} className={`flex-row items-center gap-0.5 rounded-full pl-3 pr-2 py-1.5 ${t.card}`}>
      <Text className={`text-[12.5px] font-bold ${t.brandText}`}>{label}</Text>
      <ChevronRight size={14} color={t.hex.brand} />
    </Pressable>
  );
}

export default function Dashboard() {
  const { isPersonal } = usePlan();
  return isPersonal ? <PersonalHome /> : <BusinessDashboard />;
}

function BusinessDashboard() {
  const { t } = useTheme();
  const alarm = useAlarm();
  const isDesktop = useIsDesktop();
  const todayKey = toDateInput(new Date());
  const { data, loading, error, refreshing, refresh } = useApi(() => api.dashboard.getStats(), [], { pollMs: 30000 });
  const daily = useApi(() => api.reports.daily(todayKey), [], { pollMs: 60000 });
  const todayEvents = useApi(() => api.events.list({ startDate: `${todayKey}T00:00:00`, limit: '500' }), [], { pollMs: 60000 });
  const { units } = useFleet(30000);
  const offHours = useOffHours(todayKey);
  const [preview, setPreview] = useState<TrackingEvent | null>(null);

  const alertCount = (data?.vehicleStatus?.alert ?? 0) + (data?.machineStatus?.alert ?? 0);

  const moving: LiveUnit[] = useMemo(
    () =>
      units
        .filter(hasPosition)
        .filter((u) => u.status === 'MOVING')
        .sort((a, b) => b.position.speed - a.position.speed)
        .slice(0, 5)
        .map((u) => ({
          id: u.id,
          name: u.name,
          plate: u.plate,
          status: u.status,
          unitType: u.kind,
          kmToday: kmToday(u),
          heading: u.position.heading,
          lastReport: u.position.timestamp,
        })),
    [units]
  );

  const summaries = useMemo(() => summarize(daily.data || [], []), [daily.data]);
  const totals = useMemo(
    () => summaries.reduce((acc, s) => ({ km: acc.km + s.km, hours: acc.hours + s.hours, idle: acc.idle + s.idle }), { km: 0, hours: 0, idle: 0 }),
    [summaries]
  );
  const utilization = data?.totalUnits ? Math.round((summaries.length / data.totalUnits) * 100) : 0;

  const attention: AttentionItem[] = useMemo(() => {
    if (!data) return [];
    const alertUnits: AttentionItem[] = ((data.alertUnits || []) as AlertUnit[]).map((u) => ({
      key: `unit-${u.id}`,
      title: `${u.name} en alerta`,
      detail: u.plate || 'Revisa la unidad',
      onPress: () => openUnit({ id: u.id, kind: u.unitType }),
    }));
    const events = ((data.recentEvents || []) as TrackingEvent[])
      .filter((e) => e.severity === 'CRITICAL' || e.severity === 'WARNING')
      .map((e) => attentionFromEvent(e, () => setPreview(e)));
    return [...alertUnits, ...events].slice(0, 4);
  }, [data]);

  const today = (
    <>
      <SectionTitle>Hoy</SectionTitle>
      <View className="flex-row flex-wrap gap-2">
        <MetricTile metric="km" value={totals.km.toFixed(1)} />
        <MetricTile metric="hours" value={formatHours(totals.hours)} />
        <MetricTile metric="idle" value={formatHours(totals.idle)} />
        {offHours.enabled ? <MetricTile metric="offHours" value={offHours.total.toFixed(1)} /> : null}
      </View>
      <SectionTitle right={<SeeAll label="Ver alertas" onPress={() => router.push('/notifications')} />}>Eventos de hoy</SectionTitle>
      <EventCounters events={todayEvents.data?.data || []} />
      <Pressable onPress={() => router.push('/notifications')} className={`mt-2 flex-row items-center gap-3 rounded-2xl px-4 py-3.5 ${t.card} ${t.press}`}>
        <View className={`w-10 h-10 rounded-full items-center justify-center ${alarm.active ? t.selected : t.tonal}`}>
          <BellRing size={18} color={alarm.active ? '#f87203' : t.hex.muted} />
        </View>
        <Text className={`flex-1 text-[14px] ${t.text}`}>
          Modo alarma <Text className="font-semibold">{alarm.active ? `activo en ${alarm.unitIds.length} unidades` : 'apagado'}</Text>
        </Text>
        <ChevronRight size={16} color={t.hex.muted} />
      </Pressable>
    </>
  );

  const activity = (
    <>
      <SectionTitle right={<SeeAll label="Ver alertas" onPress={() => router.push('/notifications')} />}>Requiere atención</SectionTitle>
      <AttentionList items={attention} />
      <SectionTitle right={<SeeAll label="Ver mapa" onPress={() => router.replace('/live-map')} />}>En movimiento ahora</SectionTitle>
      <MovingNow units={moving} />
      <SectionTitle right={<SeeAll label="Ver reportes" onPress={() => router.push('/reports')} />}>Más recorridas hoy</SectionTitle>
      <TopUnits items={summaries.slice(0, 3)} />
    </>
  );

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} maxWidth={1080}>
      {error ? <ErrorBanner message={error} /> : null}
      {loading && !data ? (
        <Loading />
      ) : data ? (
        <>
          <FleetStatusCard
            total={data.totalUnits}
            moving={data.totalMoving ?? 0}
            stopped={data.totalStopped ?? 0}
            offline={data.totalOffline ?? 0}
            alert={alertCount}
            working={utilization}
          />
          <View className="mt-5">
            <QuickActions alerts={data.alertsCount ?? 0} />
          </View>
          {isDesktop ? (
            <View className="flex-row gap-4 items-start">
              <View className="flex-1">{today}</View>
              <View className="flex-1">{activity}</View>
            </View>
          ) : (
            <>
              {today}
              {activity}
            </>
          )}
        </>
      ) : null}
      <EventPreviewSheet event={preview} onClose={() => setPreview(null)} />
    </Screen>
  );
}
