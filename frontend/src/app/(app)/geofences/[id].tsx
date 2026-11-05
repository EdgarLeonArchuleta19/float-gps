import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { ErrorBanner, Loading } from '@/components/ui';
import AdminOnly from '@/components/shared/AdminOnly';
import GeofenceForm from '@/components/geofences/GeofenceForm';

export default function EditGeofence() {
  const { t } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error } = useApi(() => api.geofences.get(String(id)), [id]);
  return (
    <AdminOnly>
      {data ? (
        <GeofenceForm key={data.id} initial={data} />
      ) : (
        <View className={`flex-1 p-4 ${t.screen}`}>{loading ? <Loading /> : <ErrorBanner message={error || 'Geocerca no encontrada'} />}</View>
      )}
    </AdminOnly>
  );
}
