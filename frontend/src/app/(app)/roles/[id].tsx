import { useLocalSearchParams } from 'expo-router';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { ErrorBanner, Loading, PageHeader, Screen } from '@/components/ui';
import AdminOnly from '@/components/shared/AdminOnly';
import RoleForm from '@/components/roles/RoleForm';

export default function EditRole() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error } = useApi(() => api.roles.get(String(id)), [id]);
  return (
    <AdminOnly>
      <Screen maxWidth={720}>
        <PageHeader
          title={data?.systemKey ? data.name : 'Editar rol'}
          back="/roles"
          subtitle={data ? `${data.userCount} ${data.userCount === 1 ? 'usuario tiene' : 'usuarios tienen'} este rol` : undefined}
        />
        {error ? <ErrorBanner message={error} /> : null}
        {loading && !data ? <Loading /> : data ? <RoleForm key={data.id} initial={data} /> : null}
      </Screen>
    </AdminOnly>
  );
}
