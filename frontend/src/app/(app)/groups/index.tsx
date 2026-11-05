import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Boxes, Pencil, Plus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useApi } from '@/hooks/useApi';
import { useFleet } from '@/hooks/useFleet';
import { useCanAdmin } from '@/hooks/useCanAdmin';
import { usePagination } from '@/hooks/usePagination';
import { api } from '@/lib/api';
import type { UnitGroup } from '@/lib/types';
import Tappable from '@/components/shared/Tappable';
import Pagination from '@/components/shared/Pagination';
import StatusFilter, { InactiveBadge, type StatusView } from '@/components/shared/StatusFilter';
import { ActionIcon } from '@/components/shared/LifecycleActions';
import { UnitIcon } from '@/components/shared/VehicleIcon';
import { Button, Card, EmptyState, ErrorBanner, Field, Loading, PageHeader, Screen } from '@/components/ui';
import GroupFormSheet from '@/components/groups/GroupFormSheet';

export default function Groups() {
  const { t } = useTheme();
  const canAdmin = useCanAdmin();
  const { data, loading, error, refreshing, refresh } = useApi(() => api.groups.list(), []);
  const { units, refresh: refreshUnits } = useFleet();
  const [view, setView] = useState<StatusView>('active');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{ open: boolean; group: UnitGroup | null }>({ open: false, group: null });

  const all = data || [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((g) => g.isActive === (view === 'active') && (!q || g.name.toLowerCase().includes(q)));
  }, [all, view, search]);
  const { pageItems, pager } = usePagination(filtered, `${view}|${search}`);
  const ungrouped = units.filter((u) => !u.group).length;

  const saved = () => {
    refresh();
    refreshUnits();
  };

  return (
    <Screen maxWidth={900} refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title="Grupos"
        back="/more"
        subtitle={`${all.filter((g) => g.isActive).length} grupos · ${ungrouped} unidades sin grupo`}
        right={canAdmin ? <Button label="Nuevo" icon={Plus} compact onPress={() => setForm({ open: true, group: null })} /> : undefined}
      />
      <View className="gap-3 mb-4">
        <Field search placeholder="Buscar grupo" value={search} onChangeText={setSearch} />
        {canAdmin ? (
          <View className="flex-row">
            <StatusFilter value={view} onChange={setView} activeCount={all.filter((g) => g.isActive).length} inactiveCount={all.filter((g) => !g.isActive).length} />
          </View>
        ) : null}
      </View>
      {error ? <ErrorBanner message={error} /> : null}
      {loading && !data ? (
        <Loading />
      ) : !filtered.length ? (
        <Card>
          <EmptyState icon={Boxes} title="Sin grupos" message={canAdmin ? 'Agrupa tus unidades, por ejemplo "Repartidores" o "Ventas", para filtrarlas y asignarles geocercas.' : 'Tu empresa aún no tiene grupos.'} />
        </Card>
      ) : (
        <>
          <Card className="py-1">
            {pageItems.map((g, i) => {
              const members = units.filter((u) => u.group?.id === g.id);
              return (
                <Tappable
                  key={g.id}
                  onPress={() => (canAdmin ? setForm({ open: true, group: g }) : undefined)}
                  disabled={!canAdmin}
                  className={`flex-row items-center gap-3 px-4 py-3.5 ${i < pageItems.length - 1 ? `border-b ${t.border}` : ''}`}
                >
                  <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: `${g.color}22` }}>
                    <Boxes size={18} color={g.color} />
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2">
                      <Text className={`text-[14.5px] font-bold flex-shrink ${t.text}`} numberOfLines={1}>
                        {g.name}
                      </Text>
                      {g.isActive ? null : <InactiveBadge />}
                    </View>
                    <Text className={`text-[12.5px] ${t.muted}`} numberOfLines={1}>
                      {g.unitCount} {g.unitCount === 1 ? 'unidad' : 'unidades'}
                      {members.length ? ` · ${members.slice(0, 3).map((u) => u.name).join(', ')}${members.length > 3 ? '…' : ''}` : ''}
                    </Text>
                  </View>
                  <View className="flex-row -space-x-2">
                    {members.slice(0, 3).map((u) => (
                      <View key={u.id} className={`w-8 h-8 rounded-full items-center justify-center ${t.tonal}`}>
                        <UnitIcon unit={u} size={20} />
                      </View>
                    ))}
                  </View>
                  {canAdmin ? <ActionIcon icon={Pencil} label={`Editar ${g.name}`} onPress={() => setForm({ open: true, group: g })} /> : null}
                </Tappable>
              );
            })}
          </Card>
          <Pagination {...pager} />
        </>
      )}
      <GroupFormSheet visible={form.open} editing={form.group} units={units} onClose={() => setForm({ open: false, group: null })} onSaved={saved} />
    </Screen>
  );
}
