import { PageHeader, Screen } from '@/components/ui';
import AdminOnly from '@/components/shared/AdminOnly';
import VehicleForm from '@/components/fleet/VehicleForm';

export default function NewUnit() {
  return (
    <AdminOnly>
      <Screen maxWidth={640}>
        <PageHeader title="Agregar unidad" back="/fleet" subtitle="El GPS es opcional; puedes vincularlo después" />
        <VehicleForm />
      </Screen>
    </AdminOnly>
  );
}
