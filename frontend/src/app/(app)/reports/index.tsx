import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { BarChart3, BookOpen, Download } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { api } from '@/lib/api';
import { eventTypeLabel, formatDate, formatDayLabel, formatHours, formatTime, shiftDate, toDateInput } from '@/lib/format';
import { type ExportTable } from '@/lib/exporters';
import type { ReportRow, TrackingEvent } from '@/lib/types';
import { Button, Card, EmptyState, ErrorBanner, Loading, PageHeader, Screen } from '@/components/ui';
import DayStepper from '@/components/shared/DayStepper';
import FilterSelect from '@/components/shared/FilterSelect';
import EventRow from '@/components/events/EventRow';
import EventPreviewSheet from '@/components/events/EventPreviewSheet';
import { summarize } from '@/components/reports/summary';
import SummaryTable from '@/components/reports/SummaryTable';
import ReportTotals from '@/components/reports/ReportTotals';
import UnitReportList from '@/components/reports/UnitReportList';
import ExportSheet from '@/components/reports/ExportSheet';
import Segmented from '@/components/reports/Segmented';
import { SORT_OPTIONS, sortSummaries, type SortKey } from '@/components/reports/sorting';
import Pagination from '@/components/shared/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { useOffHours } from '@/hooks/useOffHours';
import { usePlan } from '@/hooks/usePlan';

type Tab = 'daily' | 'hours' | 'log';
type Range = 7 | 30;

const TABS: { value: Tab; label: string }[] = [
  { value: 'daily', label: 'Diario' },
  { value: 'hours', label: 'Por periodo' },
  { value: 'log', label: 'Bitácora' },
];

const RANGES: { value: Range; label: string }[] = [
  { value: 7, label: '7 días' },
  { value: 30, label: '30 días' },
];

export default function Reports() {
  const { t } = useTheme();
  const isDesktop = useIsDesktop();
  const { user } = useAuth();
  const { isPersonal } = usePlan();
  const today = toDateInput(new Date());
  const [tab, setTab] = useState<Tab>('daily');
  const [day, setDay] = useState(today);
  const [range, setRange] = useState<Range>(7);
  const [preview, setPreview] = useState<TrackingEvent | null>(null);
  const [sort, setSort] = useState<SortKey>('km');
  const [exporting, setExporting] = useState(false);

  const from = tab === 'daily' ? day : shiftDate(today, -(range - 1));
  const to = tab === 'daily' ? day : today;

  const { data, loading, error, refreshing, refresh } = useApi(
    async () => {
      const events = await api.reports.events(from, to);
      if (tab === 'log') return { rows: [] as ReportRow[], events };
      const rows = tab === 'daily' ? await api.reports.daily(day) : await api.reports.hours(from, to);
      return { rows, events };
    },
    [tab, from, to]
  );

  const offHours = useOffHours(from, to);
  const summaries = useMemo(() => (data ? sortSummaries(summarize(data.rows, data.events, offHours.byName), sort) : []), [data, offHours.byName, sort]);
  const events = data?.events || [];
  const periodLabel = from === to ? formatDayLabel(from) : `${formatDayLabel(from)} – ${formatDayLabel(to)}`;

  const totals = useMemo(
    () =>
      summaries.reduce(
        (acc, x) => ({
          ...acc,
          km: acc.km + x.km,
          hours: acc.hours + x.hours,
          moving: acc.moving + x.moving,
          idle: acc.idle + x.idle,
          offHoursKm: acc.offHoursKm + x.offHoursKm,
          alerts: acc.alerts + x.alerts,
          days: acc.days + x.days,
        }),
        { units: summaries.length, km: 0, hours: 0, moving: 0, idle: 0, offHoursKm: 0, alerts: 0, days: 0 }
      ),
    [summaries]
  );

  const table: ExportTable = useMemo(() => {
    const base = { subtitle: periodLabel, company: user?.companyName, author: user?.name };
    if (tab === 'log') {
      const critical = events.filter((e) => e.severity === 'CRITICAL').length;
      const units = new Set(events.map((e) => e.unitName).filter(Boolean)).size;
      return {
        ...base,
        title: 'Bitácora de eventos',
        columns: ['Fecha', 'Hora', 'Unidad', 'Evento', 'Velocidad'],
        numeric: [false, false, false, false, true],
        highlights: [
          { label: 'Eventos', value: String(events.length) },
          { label: 'Críticos', value: String(critical) },
          { label: 'Unidades', value: String(units) },
        ],
        rows: events.map((e) => [
          formatDate(e.timestamp),
          formatTime(e.timestamp),
          e.unitName || '',
          eventTypeLabel(e.type),
          e.speed ? `${Math.round(e.speed)} km/h` : '—',
        ]),
      };
    }
    return {
      ...base,
      title: tab === 'daily' ? 'Reporte diario' : 'Reporte de horas',
      columns: ['Unidad', 'Días', 'Km', 'Horas motor', 'En movimiento', 'Ralentí', 'Km fuera de horario', 'Alertas'],
      numeric: [false, true, true, true, true, true, true, true],
      highlights: [
        { label: 'Unidades', value: String(totals.units) },
        { label: 'Km recorridos', value: totals.km.toFixed(1) },
        { label: 'Horas motor', value: formatHours(totals.hours) },
        { label: 'Ralentí', value: formatHours(totals.idle) },
        { label: 'Fuera de horario', value: `${totals.offHoursKm.toFixed(1)} km` },
        { label: 'Alertas', value: String(totals.alerts) },
      ],
      rows: summaries.map((s) => [s.unitName, s.days, s.km.toFixed(1), formatHours(s.hours), formatHours(s.moving), formatHours(s.idle), s.offHoursKm.toFixed(1), s.alerts]),
      totals: ['Total', totals.days, totals.km.toFixed(1), formatHours(totals.hours), formatHours(totals.moving), formatHours(totals.idle), totals.offHoursKm.toFixed(1), totals.alerts],
    };
  }, [tab, summaries, events, periodLabel, totals, user?.companyName, user?.name]);

  const summaryPage = usePagination(summaries, `${tab}|${from}|${to}`, 10);
  const logPage = usePagination(events, `${tab}|${from}|${to}`, 15);

  const content = () => {
    if (loading && !data) return <Loading />;
    if (tab === 'log') {
      return events.length ? (
        <>
          <Card className="py-1">
            {logPage.pageItems.map((e) => (
              <EventRow key={e.id} event={e} onPress={() => setPreview(e)} />
            ))}
          </Card>
          <Pagination {...logPage.pager} />
        </>
      ) : (
        <Card>
          <EmptyState icon={BookOpen} title="Bitácora vacía" message="No hay eventos en este periodo." />
        </Card>
      );
    }
    if (!summaries.length) {
      return (
        <Card>
          <EmptyState icon={BarChart3} title="Sin actividad" message="No hay sesiones de trabajo registradas en este periodo." />
        </Card>
      );
    }
    return (
      <>
        <ReportTotals totals={totals} />
        {isDesktop ? (
          <SummaryTable items={summaryPage.pageItems} totals={totals} sort={sort} onSort={setSort} />
        ) : (
          <>
            <View className="flex-row mb-2">
              <FilterSelect label="Ordenar" value={sort} onChange={(v) => setSort(v as SortKey)} options={isPersonal ? SORT_OPTIONS.filter((o) => o.value !== 'offHoursKm') : SORT_OPTIONS} />
            </View>
            <UnitReportList items={summaryPage.pageItems} />
          </>
        )}
        <Pagination {...summaryPage.pager} />
      </>
    );
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <PageHeader title="Reportes" back="/more" subtitle={periodLabel} />
      <View className="gap-2.5 mb-4 w-full max-w-[640px]">
        <Segmented options={TABS} value={tab} onChange={setTab} />
        <View className="flex-row items-center gap-2.5">
          <View className="flex-1">
            {tab === 'daily' ? <DayStepper value={day} onChange={setDay} /> : <Segmented options={RANGES} value={range} onChange={setRange} />}
          </View>
          {isPersonal ? null : (
            <Button label="Exportar" icon={Download} compact onPress={() => setExporting(true)} disabled={!table.rows.length} className="py-2.5" />
          )}
        </View>
      </View>
      {error ? <ErrorBanner message={error} /> : null}
      {content()}
      {tab !== 'log' && summaries.length ? (
        <Text className={`text-[11px] mt-3 ${t.subtle}`}>Alertas: eventos críticos o de advertencia del periodo.</Text>
      ) : null}
      <ExportSheet table={table} visible={exporting} onClose={() => setExporting(false)} />
      <EventPreviewSheet event={preview} onClose={() => setPreview(null)} />
    </Screen>
  );
}
