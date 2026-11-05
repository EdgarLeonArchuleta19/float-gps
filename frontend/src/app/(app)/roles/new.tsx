import { PageHeader, Screen } from '@/components/ui';
import AdminOnly from '@/components/shared/AdminOnly';
import RoleForm from '@/components/roles/RoleForm';

export default function NewRole() {
  return (
    <AdminOnly>
      <Screen maxWidth={720}>
        <PageHeader title="Nuevo rol" back="/roles" subtitle="Decide qué opciones y qué unidades verán sus usuarios" />
        <RoleForm />
      </Screen>
    </AdminOnly>
  );
}
