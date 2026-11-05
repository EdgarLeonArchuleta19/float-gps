import { useLocalSearchParams } from 'expo-router';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { ErrorBanner, Loading, PageHeader, Screen } from '@/components/ui';
import AdminOnly from '@/components/shared/AdminOnly';
import VehicleForm from '@/components/fleet/VehicleForm';

export default function EditUnit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error } = useApi(() => api.vehicles.get(String(id)), [id]);
  return (
    <AdminOnly>
      <Screen maxWidth={640}>
        <PageHeader title="Editar unidad" back={`/units/${id}?kind=vehicle`} subtitle={data?.name} />
        {error ? <ErrorBanner message={error} /> : null}
        {loading && !data ? <Loading /> : data ? <VehicleForm key={data.id} initial={data} /> : null}
      </Screen>
    </AdminOnly>
  );
}
