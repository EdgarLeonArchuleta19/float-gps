import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { CircleDot, Pencil, Plus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useApi } from '@/hooks/useApi';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useCanAdmin } from '@/hooks/useCanAdmin';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/shared/Pagination';
import LifecycleActions from '@/components/shared/LifecycleActions';
import StatusFilter, { InactiveBadge, type StatusView } from '@/components/shared/StatusFilter';
import { api } from '@/lib/api';
import type { Geofence } from '@/lib/types';
import FleetMap from '@/components/map/FleetMap';
import type { MapCamera, MapCircle } from '@/components/map/types';
import { Button, Card, EmptyState, ErrorBanner, Loading, PageHeader, Screen } from '@/components/ui';

const ALERT_LABELS = { ENTER: 'avisa al entrar', EXIT: 'avisa al salir', BOTH: 'avisa al entrar y salir' };

function watchLabel(g: Geofence) {
  if (g.allUnits) return 'todas las unidades';
  const units = g.vehicleIds.length + g.machineIds.length;
  return [g.groupIds.length ? `${g.groupIds.length} grupo${g.groupIds.length === 1 ? '' : 's'}` : null, units ? `${units} unidad${units === 1 ? '' : 'es'}` : null].filter(Boolean).join(' y ');
}

function formatRadius(radius?: number) {
  if (!radius) return '—';
  return radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${Math.round(radius)} m`;
}

export default function Geofences() {
  const { t } = useTheme();
  const isDesktop = useIsDesktop();
  const canAdmin = useCanAdmin();
  const { data, loading, error, refreshing, refresh } = useApi(() => api.geofences.list(), []);
  const [focus, setFocus] = useState<Geofence | null>(null);
  const [view, setView] = useState<StatusView>('active');

  const all = data || [];
  const geofences = useMemo(() => all.filter((g) => g.isActive === (view === 'active')), [all, view]);
  const { pageItems, pager } = usePagination(geofences, view, 10);

  const circles: MapCircle[] = useMemo(
    () =>
      all
        .filter((g) => g.isActive)
        .filter((g) => g.centerLat != null && g.centerLng != null && g.radius)
        .map((g) => ({ lat: g.centerLat!, lng: g.centerLng!, radius: g.radius!, color: g.color || '#f87203' })),
    [all]
  );

  const camera: MapCamera | null = useMemo(() => {
    if (focus?.centerLat != null && focus.centerLng != null) {
      const zoom = focus.radius && focus.radius > 1500 ? 13 : 15;
      return { key: `focus-${focus.id}`, type: 'center', lat: focus.centerLat, lng: focus.centerLng, zoom };
    }
    return circles.length ? { key: `fit-${circles.length}`, type: 'fit' } : null;
  }, [focus, circles.length]);

  const list = (
    <View>
    {canAdmin ? (
      <View className="mb-3 flex-row">
        <StatusFilter
          value={view}
          onChange={setView}
          activeCount={all.filter((g) => g.isActive).length}
          inactiveCount={all.filter((g) => !g.isActive).length}
          feminine
        />
      </View>
    ) : null}
    <Card className="py-1">
      {geofences.length ? (
        pageItems.map((g) => (
          <Pressable
            key={g.id}
            onPress={() => setFocus(g)}
            className={`flex-row items-center gap-3 px-4 py-3.5 ${focus?.id === g.id ? t.selected : t.press}`}
          >
            <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: `${g.color}1f` }}>
              <CircleDot size={18} color={g.color} />
            </View>
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-2">
                <Text className={`text-[14px] font-semibold ${t.text} flex-shrink`} numberOfLines={1}>
                  {g.name}
                </Text>
                {g.isActive ? null : <InactiveBadge feminine />}
              </View>
              <Text className={`text-[12px] ${t.muted}`} numberOfLines={1}>
                {g.type} · radio {formatRadius(g.radius)} · {g.unitsInside || 0} dentro ahora
              </Text>
              <Text className={`text-[12px] ${t.subtle}`} numberOfLines={1}>
                Vigila {watchLabel(g)} · {ALERT_LABELS[g.alertOn] || ALERT_LABELS.BOTH}
              </Text>
            </View>
            {canAdmin ? (
              <Pressable onPress={() => router.push(`/geofences/${g.id}` as never)} accessibilityLabel={`Editar ${g.name}`} className="p-2 rounded-lg active:opacity-60">
                <Pencil size={16} color={t.hex.muted} />
              </Pressable>
            ) : null}
            {canAdmin ? (
              <LifecycleActions
                noun={{ label: 'geocerca', feminine: true }}
                name={g.name}
                active={g.isActive}
                deactivateHint="Dejará de mostrarse en el mapa y de generar alertas."
                onSetActive={(active) => api.geofences.setActive(g.id, active)}
                onDelete={() => api.geofences.remove(g.id)}
                onChanged={() => {
                  if (focus?.id === g.id) setFocus(null);
                  refresh();
                }}
              />
            ) : null}
          </Pressable>
        ))
      ) : (
        <EmptyState
          icon={CircleDot}
          title={view === 'inactive' ? 'Sin geocercas desactivadas' : 'Sin geocercas'}
          message={view === 'inactive' ? undefined : 'Crea zonas para recibir alertas de entrada y salida.'}
        />
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
        subtitle={`${all.filter((g) => g.isActive).length} zonas activas`}
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
