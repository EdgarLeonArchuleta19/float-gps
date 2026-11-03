import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Construction, Car, Plus, Truck } from 'lucide-react-native';
import { openUnit } from '@/lib/units';
import { useFleet } from '@/hooks/useFleet';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useCanAdmin } from '@/hooks/useCanAdmin';
import { usePagination } from '@/hooks/usePagination';
import type { FleetUnit } from '@/lib/types';
import { Button, Card, Chip, ChipRow, EmptyState, ErrorBanner, Field, Loading, PageHeader, Screen } from '@/components/ui';
import UnitRow from '@/components/shared/UnitRow';
import Pagination from '@/components/shared/Pagination';
import FleetTable from '@/components/fleet/FleetTable';

type KindFilter = 'all' | 'vehicle' | 'machine';

const STATUS_FILTERS: { key: 'ALL' | FleetUnit['status']; label: string }[] = [
  { key: 'ALL', label: 'Todos los estados' },
  { key: 'MOVING', label: 'En movimiento' },
  { key: 'STOPPED', label: 'Detenidas' },
  { key: 'OFFLINE', label: 'Apagadas' },
  { key: 'ALERT', label: 'Alerta' },
];

export default function Fleet() {
  const isDesktop = useIsDesktop();
  const canAdmin = useCanAdmin();
  const { units, loading, error, refreshing, refresh } = useFleet(30000);
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

  const { pageItems, pager } = usePagination(filtered, `${kind}|${status}|${search}`);
  const vehicles = units.filter((u) => u.kind === 'vehicle').length;

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
        <ChipRow>
          <Chip label="Todo" active={kind === 'all'} onPress={() => setKind('all')} />
          <Chip label="Vehículos" icon={Car} active={kind === 'vehicle'} onPress={() => setKind('vehicle')} />
          <Chip label="Maquinaria" icon={Construction} active={kind === 'machine'} onPress={() => setKind('machine')} />
        </ChipRow>
        <ChipRow>
          {STATUS_FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} active={status === f.key} onPress={() => setStatus(f.key)} />
          ))}
        </ChipRow>
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
            <FleetTable units={pageItems} />
          ) : (
            <Card className="py-1">
              {pageItems.map((u) => (
                <UnitRow key={u.id} unit={u} onPress={() => openUnit(u)} showChevron />
              ))}
            </Card>
          )}
          <Pagination {...pager} />
        </>
      )}
    </Screen>
  );
}
