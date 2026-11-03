import { useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { Plus, Trash2, Users } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useApi } from '@/hooks/useApi';
import { api, type CompanyUser } from '@/lib/api';
import { Button, Card, EmptyState, ErrorBanner, Loading, PageHeader, Screen } from '@/components/ui';
import AdminOnly from '@/components/shared/AdminOnly';
import Pagination from '@/components/shared/Pagination';
import { usePagination } from '@/hooks/usePagination';
import UserFormSheet from '@/components/users/UserFormSheet';

const ROLE_LABELS: Record<string, string> = { admin: 'Administrador', operator: 'Operador', viewer: 'Solo lectura' };

function confirmRemove(u: CompanyUser): Promise<boolean> {
  const message = `${u.name} (${u.email}) perderá el acceso de inmediato.`;
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`¿Eliminar usuario? ${message}`));
  return new Promise((resolve) =>
    Alert.alert('Eliminar usuario', message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Eliminar', style: 'destructive', onPress: () => resolve(true) },
    ])
  );
}

export default function AdminUsers() {
  const { t } = useTheme();
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, error, refreshing, refresh } = useApi(() => api.users.list(), []);
  const [formOpen, setFormOpen] = useState(false);
  const users = data || [];
  const { pageItems, pager } = usePagination(users);

  const remove = async (u: CompanyUser) => {
    if (!(await confirmRemove(u))) return;
    try {
      await api.users.remove(u.id);
      toast('Usuario eliminado', 'success');
      refresh();
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  return (
    <AdminOnly>
      <Screen refreshing={refreshing} onRefresh={refresh} maxWidth={720}>
        <PageHeader
          title="Usuarios" back="/more"
          subtitle={`${users.length} accesos en tu empresa`}
          right={<Button label="Nuevo" icon={Plus} compact onPress={() => setFormOpen(true)} />}
        />
        {error ? <ErrorBanner message={error} /> : null}
        {loading && !data ? (
          <Loading />
        ) : users.length ? (
          <Card className="py-1">
            {pageItems.map((u, i) => (
              <View key={u.id} className={`flex-row items-center gap-3 px-4 py-3 ${i < pageItems.length - 1 ? `border-b ${t.border}` : ''}`}>
                <View className="flex-1 min-w-0">
                  <Text className={`text-[14px] font-semibold ${t.text}`} numberOfLines={1}>
                    {u.name}
                    {u.id === user?.id ? ' (tú)' : ''}
                  </Text>
                  <Text className={`text-[12px] ${t.muted}`} numberOfLines={1}>
                    {u.email} · {ROLE_LABELS[u.role] || u.role}
                  </Text>
                </View>
                {u.id !== user?.id ? (
                  <Pressable onPress={() => remove(u)} accessibilityLabel={`Eliminar ${u.name}`} className="p-2 active:opacity-60">
                    <Trash2 size={17} color="#ef4444" />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </Card>
        ) : null}
        {users.length ? <Pagination {...pager} /> : null}
        {!loading && !users.length ? (
          <Card>
            <EmptyState icon={Users} title="Sin usuarios" />
          </Card>
        ) : null}
        <UserFormSheet visible={formOpen} onClose={() => setFormOpen(false)} onSaved={refresh} />
      </Screen>
    </AdminOnly>
  );
}
