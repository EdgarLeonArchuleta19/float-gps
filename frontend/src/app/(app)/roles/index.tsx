import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Lock, Plus, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useApi } from '@/hooks/useApi';
import { usePagination } from '@/hooks/usePagination';
import { api, type Role } from '@/lib/api';
import { permissionSummary } from '@/lib/permissions';
import { Button, Card, EmptyState, ErrorBanner, Field, Loading, PageHeader, Screen } from '@/components/ui';
import AdminOnly from '@/components/shared/AdminOnly';
import Pagination from '@/components/shared/Pagination';
import LifecycleActions from '@/components/shared/LifecycleActions';
import StatusFilter, { InactiveBadge, type StatusView } from '@/components/shared/StatusFilter';

function unitSummary(role: Role) {
  if (role.allUnits) return 'Todas las unidades';
  const count = role.vehicleIds.length + role.machineIds.length;
  return `${count} ${count === 1 ? 'unidad' : 'unidades'}`;
}

export default function Roles() {
  const { t } = useTheme();
  const { data, loading, error, refreshing, refresh } = useApi(() => api.roles.list(), []);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<StatusView>('active');
  const roles = data || [];
  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => roles.filter((r) => r.isActive === (view === 'active') && (!q || r.name.toLowerCase().includes(q))),
    [roles, view, q]
  );
  const { pageItems, pager } = usePagination(filtered, `${view}|${q}`);

  return (
    <AdminOnly>
      <Screen refreshing={refreshing} onRefresh={refresh} maxWidth={720}>
        <PageHeader
          title="Roles"
          back="/more"
          subtitle="Qué opciones y qué unidades ve cada usuario"
          right={<Button label="Nuevo" icon={Plus} compact onPress={() => router.push('/roles/new' as never)} />}
        />
        {error ? <ErrorBanner message={error} /> : null}
        <View className="gap-3 mb-3">
          <Field search placeholder="Buscar rol" value={query} onChangeText={setQuery} />
          <View className="flex-row">
          <StatusFilter
            value={view}
            onChange={setView}
            activeCount={roles.filter((r) => r.isActive).length}
            inactiveCount={roles.filter((r) => !r.isActive).length}
          />
          </View>
        </View>
        {loading && !data ? (
          <Loading />
        ) : filtered.length ? (
          <Card className="py-1">
            {pageItems.map((r, i) => (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/roles/${r.id}` as never)}
                className={`flex-row items-center gap-3 px-4 py-3.5 ${t.press}`}
              >
                <View className={`w-10 h-10 rounded-full items-center justify-center ${t.tonal}`}>
                  <ShieldCheck size={18} color={t.hex.brand} />
                </View>
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-2">
                    <Text className={`text-[14px] font-semibold ${t.text} flex-shrink`} numberOfLines={1}>
                      {r.name}
                    </Text>
                    {r.systemKey ? (
                      <View className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${t.input}`}>
                        <Lock size={10} color={t.hex.muted} />
                        <Text className={`text-[10.5px] font-semibold ${t.muted}`}>Predeterminado</Text>
                      </View>
                    ) : null}
                    {r.isActive ? null : <InactiveBadge />}
                  </View>
                  <Text className={`text-[12px] ${t.muted}`} numberOfLines={1}>
                    {r.systemKey === 'admin' ? 'Todo, incluye usuarios, roles y configuración' : permissionSummary(r.permissions)}
                  </Text>
                  <Text className={`text-[11.5px] ${t.subtle}`} numberOfLines={1}>
                    {unitSummary(r)} · {r.userCount} {r.userCount === 1 ? 'usuario' : 'usuarios'}
                  </Text>
                </View>
                {!r.systemKey ? (
                  <LifecycleActions
                    noun={{ label: 'rol' }}
                    name={r.name}
                    active={r.isActive}
                    deactivateHint="No se podrá asignar a usuarios nuevos."
                    onSetActive={(active) => api.roles.setActive(r.id, active)}
                    onDelete={() => api.roles.remove(r.id)}
                    onChanged={refresh}
                  />
                ) : null}
                <ChevronRight size={16} color={t.hex.muted} />
              </Pressable>
            ))}
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon={ShieldCheck}
              title={view === 'inactive' && !q ? 'Sin roles desactivados' : 'Sin resultados'}
            />
          </Card>
        )}
        <Pagination {...pager} />
      </Screen>
    </AdminOnly>
  );
}
