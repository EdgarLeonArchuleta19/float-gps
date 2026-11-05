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
import AppearanceSheet from '@/components/units/AppearanceSheet';
import { usePlan } from '@/hooks/usePlan';

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
  const { isPersonal, isSupport, maxUnits } = usePlan();
  const canAdmin = useCanAdmin();
  const [lookUnit, setLookUnit] = useState<FleetUnit | null>(null);
  const { units: allUnits, loading, error, refreshing, refresh } = useFleet(30000, isSupport ? 'all' : 'active');
  const [view, setView] = useState<StatusView>('active');
  const units = useMemo(() => allUnits.filter((u) => u.isActive === (view === 'active')), [allUnits, view]);
  const [kind, setKind] = useState<KindFilter>('all');
  const [status, setStatus] = useState<'ALL' | FleetUnit['status']>('ALL');
  const [group, setGroup] = useState('all');
  const groups = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; count: number }>();
    for (const u of units) if (u.group) seen.set(u.group.id, { id: u.group.id, name: u.group.name, count: (seen.get(u.group.id)?.count || 0) + 1 });
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [units]);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return units.filter(
      (u) =>
        (kind === 'all' || u.kind === kind) &&
        (status === 'ALL' || u.status === status) &&
        (group === 'all' || (group === 'none' ? !u.group : u.group?.id === group)) &&
        (!q || [u.name, u.plate, u.brand, u.model, u.gpsDevice?.imei].some((v) => v?.toLowerCase().includes(q)))
    );
  }, [units, kind, status, group, search]);

  const { pageItems, pager } = usePagination(filtered, `${view}|${kind}|${status}|${group}|${search}`);
  const vehicles = units.filter((u) => u.kind === 'vehicle').length;
  const atLimit = maxUnits !== null && allUnits.length >= maxUnits;

  const unitActions = (u: FleetUnit) => {
    const unitApi = u.kind === 'vehicle' ? api.vehicles : api.machines;
    if (!isSupport) {
      return u.kind === 'vehicle' ? <ActionIcon icon={Pencil} label={`Personalizar ${u.name}`} onPress={() => setLookUnit(u)} /> : null;
    }
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
        title={isPersonal ? 'Mis vehículos' : 'Flota'}
        back="/more"
        subtitle={
          isPersonal
            ? `${allUnits.length}${maxUnits !== null ? ` de ${maxUnits}` : ''} vehículos en tu plan`
            : `${vehicles} vehículos · ${units.length - vehicles} máquinas${maxUnits !== null ? ` · límite ${maxUnits}` : ''}`
        }
        right={isSupport ? <Button label="Nueva" icon={Plus} compact onPress={() => router.push('/fleet/new')} disabled={atLimit} /> : undefined}
      />
      <View className="gap-3 mb-4">
        <Field search placeholder="Buscar por nombre, placa o IMEI" value={search} onChangeText={setSearch} />
        <View className="flex-row flex-wrap gap-2">
          {isSupport ? (
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
          {groups.length ? (
            <FilterSelect
              label="Grupo"
              value={group}
              onChange={setGroup}
              options={[
                { value: 'all', label: 'Todos', count: units.length },
                ...groups.map((g) => ({ value: g.id, label: g.name, count: g.count })),
                { value: 'none', label: 'Sin grupo', count: units.filter((u) => !u.group).length },
              ]}
            />
          ) : null}
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
      {lookUnit ? <AppearanceSheet unit={lookUnit} visible={!!lookUnit} onClose={() => setLookUnit(null)} onSaved={refresh} /> : null}
    </Screen>
  );
}
