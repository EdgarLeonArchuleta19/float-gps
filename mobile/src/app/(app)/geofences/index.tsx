import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { CircleDot, Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useApi } from '@/hooks/useApi';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useCanAdmin } from '@/hooks/useCanAdmin';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/shared/Pagination';
import { api } from '@/lib/api';
import type { Geofence } from '@/lib/types';
import FleetMap from '@/components/map/FleetMap';
import type { MapCamera, MapCircle } from '@/components/map/types';
import { Button, Card, EmptyState, ErrorBanner, Loading, PageHeader, Screen } from '@/components/ui';

function confirmDelete(name: string): Promise<boolean> {
  const message = `¿Eliminar la geocerca "${name}"? Esta acción no se puede deshacer.`;
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) =>
    Alert.alert('Eliminar geocerca', message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Eliminar', style: 'destructive', onPress: () => resolve(true) },
    ])
  );
}

function formatRadius(radius?: number) {
  if (!radius) return '—';
  return radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${Math.round(radius)} m`;
}

export default function Geofences() {
  const { t } = useTheme();
  const toast = useToast();
  const isDesktop = useIsDesktop();
  const canAdmin = useCanAdmin();
  const { data, loading, error, refreshing, refresh } = useApi(() => api.geofences.list(), []);
  const [focus, setFocus] = useState<Geofence | null>(null);

  const geofences = data || [];
  const { pageItems, pager } = usePagination(geofences, '', 10);

  const circles: MapCircle[] = useMemo(
    () =>
      geofences
        .filter((g) => g.centerLat != null && g.centerLng != null && g.radius)
        .map((g) => ({ lat: g.centerLat!, lng: g.centerLng!, radius: g.radius!, color: g.color || '#f87203' })),
    [geofences]
  );

  const camera: MapCamera | null = useMemo(() => {
    if (focus?.centerLat != null && focus.centerLng != null) {
      const zoom = focus.radius && focus.radius > 1500 ? 13 : 15;
      return { key: `focus-${focus.id}`, type: 'center', lat: focus.centerLat, lng: focus.centerLng, zoom };
    }
    return circles.length ? { key: `fit-${circles.length}`, type: 'fit' } : null;
  }, [focus, circles.length]);

  const remove = async (g: Geofence) => {
    if (!(await confirmDelete(g.name))) return;
    try {
      await api.geofences.remove(g.id);
      toast('Geocerca eliminada', 'success');
      if (focus?.id === g.id) setFocus(null);
      refresh();
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  const list = (
    <View>
    <Card className="py-1">
      {geofences.length ? (
        pageItems.map((g) => (
          <Pressable
            key={g.id}
            onPress={() => setFocus(g)}
            className={`flex-row items-center gap-3 px-4 py-3 ${focus?.id === g.id ? t.active : ''} active:opacity-70`}
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: `${g.color}1f` }}>
              <CircleDot size={18} color={g.color} />
            </View>
            <View className="flex-1 min-w-0">
              <Text className={`text-[14px] font-semibold ${t.text}`} numberOfLines={1}>
                {g.name}
              </Text>
              <Text className={`text-[12px] ${t.muted}`}>
                {g.type} · radio {formatRadius(g.radius)}
              </Text>
            </View>
            {canAdmin ? (
              <Pressable onPress={() => remove(g)} accessibilityLabel={`Eliminar ${g.name}`} className="p-2 rounded-lg active:opacity-60">
                <Trash2 size={17} color="#ef4444" />
              </Pressable>
            ) : null}
          </Pressable>
        ))
      ) : (
        <EmptyState icon={CircleDot} title="Sin geocercas" message="Crea zonas para recibir alertas de entrada y salida." />
      )}
    </Card>
    <Pagination {...pager} />
    </View>
  );

  const map = (
    <Card className="overflow-hidden">
      <View style={{ height: isDesktop ? 520 : 260 }}>
        <FleetMap circles={circles} camera={camera} />
      </View>
    </Card>
  );

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        title="Geocercas" back="/more"
        subtitle={`${geofences.length} zonas configuradas`}
        right={canAdmin ? <Button label="Nueva" icon={Plus} compact onPress={() => router.push('/geofences/new')} /> : undefined}
      />
      {error ? <ErrorBanner message={error} /> : null}
      {loading && !data ? (
        <Loading />
      ) : isDesktop ? (
        <View className="flex-row gap-4 items-start">
          <View className="flex-[3]">{map}</View>
          <View className="flex-[2]">{list}</View>
        </View>
      ) : (
        <View className="gap-4">
          {map}
          {list}
        </View>
      )}
    </Screen>
  );
}
