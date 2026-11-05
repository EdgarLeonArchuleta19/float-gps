import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { KeyRound, Plus, ShieldCheck, Users } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useToast } from '@/context/ToastContext';
import { useApi } from '@/hooks/useApi';
import { api, type CompanyUser, type Role } from '@/lib/api';
import { Button, Card, EmptyState, ErrorBanner, Field, Loading, PageHeader, Screen } from '@/components/ui';
import FilterSelect from '@/components/shared/FilterSelect';
import AdminOnly from '@/components/shared/AdminOnly';
import Pagination from '@/components/shared/Pagination';
import { usePagination } from '@/hooks/usePagination';
import UserFormSheet from '@/components/users/UserFormSheet';
import LifecycleActions, { ActionIcon } from '@/components/shared/LifecycleActions';
import AccessResultSheet, { type AccessResult } from '@/components/users/AccessResultSheet';
import StatusFilter, { InactiveBadge, type StatusView } from '@/components/shared/StatusFilter';

const ALL = 'all';

function matchesFilter(u: CompanyUser, filter: string) {
  return filter === ALL || u.roleId === filter;
}

export default function AdminUsers() {
  const { t } = useTheme();
  const { user } = useAuth();
  const { data, loading, error, refreshing, refresh } = useApi(() => Promise.all([api.users.list(), api.roles.list()]), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyUser | null>(null);
  const [filter, setFilter] = useState(ALL);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<StatusView>('active');
  const [access, setAccess] = useState<AccessResult | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  const users = data?.[0] || [];
  const roles: Role[] = data?.[1] || [];
  const q = query.trim().toLowerCase();
  const inView = useMemo(() => users.filter((u) => u.isActive === (view === 'active')), [users, view]);
  const filtered = useMemo(
    () => inView.filter((u) => matchesFilter(u, filter) && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))),
    [inView, filter, q]
  );
  const { pageItems, pager } = usePagination(filtered, `${view}|${filter}|${q}`);

  const resetPassword = async (target: CompanyUser) => {
    const ok = await confirm({
      title: 'Restablecer contraseña',
      message: `Le enviaremos a ${target.name} una contraseña temporal a ${target.email}. Se cerrarán sus sesiones y al entrar tendrá que crear una nueva.`,
      confirmLabel: 'Restablecer',
      icon: KeyRound,
    });
    if (!ok) return;
    setResetting(target.id);
    try {
      const res = await api.users.resetPassword(target.id);
      setAccess({ ...res, name: target.name, email: target.email, reset: true });
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setResetting(null);
    }
  };

  const openForm = (target: CompanyUser | null) => {
    setEditing(target);
    setFormOpen(true);
  };

  const filters = [
    { value: ALL, label: 'Todos', count: inView.length },
    ...roles.map((r) => ({ value: r.id, label: r.name, count: inView.filter((u) => u.roleId === r.id).length })),
  ];

  return (
    <AdminOnly>
      <Screen refreshing={refreshing} onRefresh={refresh} maxWidth={720}>
        <PageHeader
          title="Usuarios"
          back="/more"
          subtitle={`${users.length} accesos en tu empresa`}
          right={
            <View className="flex-row gap-2">
              <Button label="Roles" icon={ShieldCheck} variant="surface" compact onPress={() => router.push('/roles' as never)} />
              <Button label="Nuevo" icon={Plus} compact onPress={() => openForm(null)} />
            </View>
          }
        />
        {error ? <ErrorBanner message={error} /> : null}
        <View className="gap-3 mb-3">
          <Field search placeholder="Buscar por nombre o correo" value={query} onChangeText={setQuery} autoCapitalize="none" />
          <View className="flex-row flex-wrap gap-2">
            <StatusFilter
              value={view}
              onChange={setView}
              activeCount={users.filter((u) => u.isActive).length}
              inactiveCount={users.filter((u) => !u.isActive).length}
            />
            <FilterSelect label="Rol" value={filter} options={filters} onChange={setFilter} />
          </View>
        </View>
        {loading && !data ? (
          <Loading />
        ) : filtered.length ? (
          <Card className="py-1">
            {pageItems.map((u, i) => (
              <Pressable
                key={u.id}
                onPress={() => openForm(u)}
                className={`flex-row items-center gap-3 px-4 py-3.5 ${t.press}`}
              >
                <View className="flex-1 min-w-0">
                  <Text className={`text-[14px] font-semibold ${t.text}`} numberOfLines={1}>
                    {u.name}
                    {u.id === user?.id ? ' (tú)' : ''}
                  </Text>
                  <Text className={`text-[12px] ${t.muted}`} numberOfLines={1}>
                    {u.email}
                  </Text>
                </View>
                {u.isActive ? null : <InactiveBadge />}
                <View className={`rounded-full px-2.5 py-1 ${t.input}`}>
                  <Text className={`text-[11px] font-semibold ${t.text}`} numberOfLines={1}>
                    {u.roleName}
                  </Text>
                </View>
                {u.id !== user?.id && u.isActive ? (
                  <ActionIcon icon={KeyRound} label={`Restablecer contraseña de ${u.name}`} color={t.hex.brand} busy={resetting === u.id} onPress={() => resetPassword(u)} />
                ) : null}
                {u.id !== user?.id ? (
                  <LifecycleActions
                    noun={{ label: 'usuario' }}
                    name={u.name}
                    active={u.isActive}
                    deactivateHint="No podrá entrar al sistema y se cerrarán sus sesiones."
                    onSetActive={(active) => api.users.setActive(u.id, active)}
                    onDelete={() => api.users.remove(u.id)}
                    onChanged={refresh}
                  />
                ) : null}
              </Pressable>
            ))}
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon={Users}
              title={view === 'inactive' && !q ? 'Sin usuarios desactivados' : users.length ? 'Sin resultados' : 'Sin usuarios'}
              message={view === 'inactive' && !q ? undefined : users.length ? 'Prueba con otro filtro.' : undefined}
            />
          </Card>
        )}
        <Pagination {...pager} />
        <UserFormSheet visible={formOpen} editing={editing} roles={roles} onClose={() => setFormOpen(false)} onSaved={refresh} onCreated={setAccess} />
        <AccessResultSheet result={access} onClose={() => setAccess(null)} />
      </Screen>
    </AdminOnly>
  );
}
