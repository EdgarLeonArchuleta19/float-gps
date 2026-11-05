import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Plus, Wrench } from 'lucide-react-native';
import { useApi } from '@/hooks/useApi';
import { useFleet } from '@/hooks/useFleet';
import { usePagination } from '@/hooks/usePagination';
import { api } from '@/lib/api';
import type { Maintenance, MaintenanceStatus } from '@/lib/types';
import FilterSelect from '@/components/shared/FilterSelect';
import StatusFilter, { type StatusView } from '@/components/shared/StatusFilter';
import Pagination from '@/components/shared/Pagination';
import { Button, Card, EmptyState, ErrorBanner, Loading, PageHeader, Screen } from '@/components/ui';
import MaintenanceCard from '@/components/maintenance/MaintenanceCard';
import MaintenanceFormSheet from '@/components/maintenance/MaintenanceFormSheet';
import CompleteMaintenanceSheet from '@/components/maintenance/CompleteMaintenanceSheet';
import { MAINTENANCE_STATUS } from '@/components/maintenance/maintenanceKinds';

export default function MaintenanceScreen() {
  const params = useLocalSearchParams<{ unit?: string }>();
  const [view, setView] = useState<StatusView>('active');
  const { data, loading, error, refreshing, refresh } = useApi(() => api.maintenance.list(view === 'inactive' ? { state: 'inactive' } : {}), [view]);
  const inactive = useApi(() => api.maintenance.list({ state: 'inactive' }), []);
  const { units } = useFleet();
  const [status, setStatus] = useState<'ALL' | MaintenanceStatus>('ALL');
  const [unit, setUnit] = useState(typeof params.unit === 'string' ? params.unit : 'all');
  const [form, setForm] = useState<{ open: boolean; item: Maintenance | null }>({ open: false, item: null });
  const [completing, setCompleting] = useState<Maintenance | null>(null);

  const all = data || [];
  const filtered = useMemo(
    () => all.filter((m) => (status === 'ALL' || m.status === status) && (unit === 'all' || m.vehicleId === unit || m.machineId === unit)),
    [all, status, unit]
  );
  const { pageItems, pager } = usePagination(filtered, `${view}|${status}|${unit}`, 12);
  const due = all.filter((m) => m.status === 'DUE').length;
  const soon = all.filter((m) => m.status === 'SOON').length;
  const unitsWithItems = units.filter((u) => all.some((m) => m.vehicleId === u.id || m.machineId === u.id));

  const saved = () => {
    refresh();
    inactive.refresh();
  };

  return (
    <Screen maxWidth={900} refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title="Mantenimiento"
        back="/more"
        subtitle={due || soon ? `${due} vencidos · ${soon} próximos` : 'Todo al día'}
        right={<Button label="Nuevo" icon={Plus} compact onPress={() => setForm({ open: true, item: null })} />}
      />
      <View className="flex-row flex-wrap gap-2 mb-4">
        <StatusFilter value={view} onChange={setView} activeCount={view === 'active' ? all.length : 0} inactiveCount={inactive.data?.length || 0} />
        <FilterSelect
          label="Situación"
          value={status}
          onChange={(v) => setStatus(v as typeof status)}
          options={[
            { value: 'ALL', label: 'Todos', count: all.length },
            ...(['DUE', 'SOON', 'OK'] as MaintenanceStatus[]).map((s) => ({ value: s, label: MAINTENANCE_STATUS[s].label, count: all.filter((m) => m.status === s).length })),
          ]}
        />
        {unitsWithItems.length > 1 ? (
          <FilterSelect
            label="Unidad"
            value={unit}
            onChange={setUnit}
            options={[{ value: 'all', label: 'Todas' }, ...unitsWithItems.map((u) => ({ value: u.id, label: u.name }))]}
          />
        ) : null}
      </View>
      {error ? <ErrorBanner message={error} /> : null}
      {loading && !data ? (
        <Loading />
      ) : !filtered.length ? (
        <Card>
          <EmptyState icon={Wrench} title="Sin recordatorios" message="Crea uno para que te avisemos del cambio de aceite, el seguro o la verificación de cada unidad." />
        </Card>
      ) : (
        <>
          <View className="gap-3">
            {pageItems.map((m) => (
              <MaintenanceCard key={m.id} item={m} onComplete={setCompleting} onEdit={(item) => setForm({ open: true, item })} />
            ))}
          </View>
          <Pagination {...pager} />
        </>
      )}
      <MaintenanceFormSheet
        visible={form.open}
        editing={form.item}
        units={units}
        unitId={unit !== 'all' ? unit : undefined}
        onClose={() => setForm({ open: false, item: null })}
        onSaved={saved}
      />
      <CompleteMaintenanceSheet item={completing} onClose={() => setCompleting(null)} onSaved={refresh} />
    </Screen>
  );
}
