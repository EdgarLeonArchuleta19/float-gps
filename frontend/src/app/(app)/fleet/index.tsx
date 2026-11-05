import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Pencil, Plus, Truck } from 'lucide-react-native';
import { openUnit } from '@/lib/units';
import { useFleet } from '@/hooks/useFleet';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useCanAdmin } from '@/hooks/useCanAdmin';
import { usePagination } from '@/hooks/usePagination';
import type { FleetUnit } from '@/lib/types';
import { Button, Card, EmptyState, ErrorBanner, Field, Loading, PageHeader, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import FilterSelect from '@/components/shared/FilterSelect';
import LifecycleActions, { ActionIcon } from '@/components/shared/LifecycleActions';
import UnitRow from '@/components/shared/UnitRow';
import Pagination from '@/components/shared/Pagination';
import StatusFilter, { type StatusView } from '@/components/shared/StatusFilter';
import FleetTable from '@/components/fleet/FleetTable';

type KindFilter = 'all' | 'vehicle' | 'machine';

const STATUS_FILTERS: { key: 'ALL' | FleetUnit['status']; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'MOVING', label: 'En movimiento' },
  { key: 'STOPPED', label: 'Detenidas' },
  { key: 'OFFLINE', label: 'Apagadas' },
  { key: 'ALERT', label: 'Alerta' },
];

export default function Fleet() {
  const isDesktop = useIsDesktop();
  const canAdmin = useCanAdmin();
  const { units: allUnits, loading, error, refreshing, refresh } = useFleet(30000, canAdmin ? 'all' : 'active');
  const [view, setView] = useState<StatusView>('active');
  const units = useMemo(() => allUnits.filter((u) => u.isActive === (view === 'active')), [allUnits, view]);
  const [kind, setKind] = useState<KindFilter>('all');
  const [status, setStatus] = useState<'ALL' | FleetUnit['status']>('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return units.filter(
      (u) =>
        (kind === 'all' || u.kind === kind) &&
        (status === 'ALL' || u.status === status) &&
        (!q || [u.name, u.plate, u.brand, u.model, u.gpsDevice?.imei].some((v) => v?.toLowerCase().includes(q)))
    );
  }, [units, kind, status, search]);

  const { pageItems, pager } = usePagination(filtered, `${view}|${kind}|${status}|${search}`);
  const vehicles = units.filter((u) => u.kind === 'vehicle').length;

  const unitActions = (u: FleetUnit) => {
    const unitApi = u.kind === 'vehicle' ? api.vehicles : api.machines;
    return (
      <>
        {u.kind === 'vehicle' ? <ActionIcon icon={Pencil} label={`Editar ${u.name}`} onPress={() => router.push(`/fleet/${u.id}` as never)} /> : null}
        <LifecycleActions
          noun={{ label: 'unidad', feminine: true }}
          name={u.name}
          active={u.isActive}
          deactivateHint="Dejará de verse en el mapa y en las listas; su historial se conserva."
          onSetActive={(active) => unitApi.setActive(u.id, active)}
          onDelete={() => unitApi.remove(u.id)}
          onChanged={refresh}
        />
      </>
    );
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title="Flota"
        back="/more"
        subtitle={`${vehicles} vehículos · ${units.length - vehicles} máquinas`}
        right={canAdmin ? <Button label="Nueva" icon={Plus} compact onPress={() => router.push('/fleet/new')} /> : undefined}
      />
      <View className="gap-3 mb-4">
        <Field search placeholder="Buscar por nombre, placa o IMEI" value={search} onChangeText={setSearch} />
        <View className="flex-row flex-wrap gap-2">
          {canAdmin ? (
            <StatusFilter
              value={view}
              onChange={setView}
              activeCount={allUnits.filter((u) => u.isActive).length}
              inactiveCount={allUnits.filter((u) => !u.isActive).length}
              feminine
            />
          ) : null}
          <FilterSelect
            label="Tipo"
            value={kind}
            onChange={(v) => setKind(v as KindFilter)}
            options={[
              { value: 'all', label: 'Todo', count: units.length },
              { value: 'vehicle', label: 'Vehículos', count: units.filter((u) => u.kind === 'vehicle').length },
              { value: 'machine', label: 'Maquinaria', count: units.filter((u) => u.kind === 'machine').length },
            ]}
          />
          <FilterSelect
            label="Movimiento"
            value={status}
            onChange={(v) => setStatus(v as typeof status)}
            options={STATUS_FILTERS.map((f) => ({ value: f.key, label: f.label }))}
          />
        </View>
      </View>
      {error ? <ErrorBanner message={error} /> : null}
      {loading && !units.length ? (
        <Loading />
      ) : !filtered.length ? (
        <Card>
          <EmptyState icon={Truck} title="Sin resultados" message="Ajusta los filtros o la búsqueda." />
        </Card>
      ) : (
        <>
          {isDesktop ? (
            <FleetTable units={pageItems} actions={canAdmin ? unitActions : undefined} />
          ) : (
            <Card className="py-1">
              {pageItems.map((u) => (
                <UnitRow
                  key={u.id}
                  unit={u}
                  onPress={() => openUnit(u)}
                  showChevron
                  trailing={canAdmin ? <View className="flex-row gap-1.5">{unitActions(u)}</View> : undefined}
                />
              ))}
            </Card>
          )}
          <Pagination {...pager} />
        </>
      )}
    </Screen>
  );
}
