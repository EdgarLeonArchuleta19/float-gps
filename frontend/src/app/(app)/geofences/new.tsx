import AdminOnly from '@/components/shared/AdminOnly';
import GeofenceForm from '@/components/geofences/GeofenceForm';

export default function NewGeofence() {
  return (
    <AdminOnly>
      <GeofenceForm />
    </AdminOnly>
  );
}
