import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { Bell, Layers, List, LocateFixed, Maximize, Navigation, Navigation2, Search, X } from 'lucide-react-native';
import FleetMap from '@/components/map/FleetMap';
import type { MapCamera, MapMarker, MapPoint, MapRoute } from '@/components/map/types';
import DraggableSheet, { SheetSnap } from '@/components/live-map/DraggableSheet';
import UnitQuickPanel from '@/components/live-map/UnitQuickPanel';
import UnitRow from '@/components/shared/UnitRow';
import UnitPickerSheet from '@/components/shared/UnitPickerSheet';
import AlarmSheet from '@/components/shared/AlarmSheet';
import EngineCommandSheet from '@/components/shared/EngineCommandSheet';
import NavigateSheet from '@/components/shared/NavigateSheet';
import Pagination from '@/components/shared/Pagination';
import { Chip, ChipRow, EmptyState } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useAlarm } from '@/context/AlarmContext';
import { useFleet } from '@/hooks/useFleet';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useCan } from '@/hooks/useCan';
import { usePagination } from '@/hooks/usePagination';
import { useOffHours } from '@/hooks/useOffHours';
import { api } from '@/lib/api';
import { markerColor, toDateInput } from '@/lib/format';
import { shareLocations } from '@/lib/shareLocation';
import { getMyLocation } from '@/lib/myLocation';
import { drivingRoute, type DrivingRoute } from '@/lib/routing';
import { hasPosition, kmToday } from '@/lib/units';
import { TAB_OVERHANG } from '@/components/layout/FeaturedTab';
import type { FleetUnit } from '@/lib/types';

type StatusFilter = 'ALL' | FleetUnit['status'];

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'Todas' },
  { key: 'MOVING', label: 'En movimiento' },
  { key: 'STOPPED', label: 'Detenidas' },
  { key: 'OFFLINE', label: 'Apagadas' },
  { key: 'ALERT', label: 'Alerta' },
];

const ME_COLOR = '#3b82f6';

let cameraSeq = 0;
const nextKey = () => `cam-${++cameraSeq}`;

function MapButton({ icon: Icon, label, onPress, active, dot }: { icon: LucideIcon; label: string; onPress: () => void; active?: boolean; dot?: boolean }) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      className={`w-11 h-11 rounded-xl items-center justify-center border ${t.card} ${t.border} active:opacity-70`}
    >
      <Icon size={19} color={active ? '#f87203' : t.hex.text} />
      {dot ? <View className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" /> : null}
    </Pressable>
  );
}

export default function LiveMap() {
  const { t } = useTheme();
  const toast = useToast();
  const alarm = useAlarm();
  const isDesktop = useIsDesktop();
  const can = useCan();
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams<{ unit?: string; status?: string }>();

  const [following, setFollowing] = useState(false);
  const { units, error } = useFleet(following ? 5000 : 15000);
  const offHours = useOffHours(toDateInput(new Date()));

  const initialFilter = FILTERS.some((f) => f.key === params.status) ? (params.status as StatusFilter) : 'ALL';
  const [filter, setFilter] = useState<StatusFilter>(initialFilter);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(typeof params.unit === 'string' ? params.unit : null);
  const [listOpen, setListOpen] = useState(false);
  const [snap, setSnap] = useState<SheetSnap>('half');
  const [layer, setLayer] = useState<'street' | 'satellite'>('street');
  const [camera, setCamera] = useState<MapCamera | null>(null);
  const [trail, setTrail] = useState<{ unitId: string; path: [number, number][] } | null>(null);
  const [guide, setGuide] = useState<(DrivingRoute & { unitId: string }) | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [overlay, setOverlay] = useState<'route' | 'alarm' | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [engineUnit, setEngineUnit] = useState<FleetUnit | null>(null);
  const [navTarget, setNavTarget] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [initialFit, setInitialFit] = useState(false);

  const located = useMemo(() => units.filter(hasPosition), [units]);
  const selected = useMemo(() => units.find((u) => u.id === selectedId) || null, [units, selectedId]);
  const sheetVisible = !isDesktop && (listOpen || !!selected);

  useEffect(() => {
    getMyLocation()
      .then(setMe)
      .catch(() => {});
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return units.filter(
      (u) => (filter === 'ALL' || u.status === filter) && (!q || u.name.toLowerCase().includes(q) || u.plate.toLowerCase().includes(q))
    );
  }, [units, filter, search]);
  const { pageItems, pager } = usePagination(visible, `${filter}|${search}`, 10);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: units.length };
    units.forEach((u) => (c[u.status] = (c[u.status] || 0) + 1));
    return c;
  }, [units]);

  const padding = useMemo(
    () =>
      isDesktop
        ? { top: 80, bottom: 60, left: 60, right: 80 }
        : { top: 130, bottom: sheetVisible ? (snap === 'peek' ? 180 : 400) : 100, left: 40, right: 70 },
    [isDesktop, snap, sheetVisible]
  );

  const focusPadding = useMemo(
    () => (isDesktop ? padding : { top: 80, bottom: Math.round(height * 0.52), left: 40, right: 70 }),
    [isDesktop, padding, height]
  );

  useEffect(() => {
    if (initialFit || !located.length) return;
    setInitialFit(true);
    const pre = selectedId ? located.find((u) => u.id === selectedId) : null;
    setCamera(
      pre
        ? { key: nextKey(), type: 'center', lat: pre.position.latitude, lng: pre.position.longitude, zoom: 15, padding: focusPadding }
        : { key: nextKey(), type: 'fit', padding }
    );
  }, [located, initialFit, selectedId, padding, focusPadding]);

  const markers: MapMarker[] = useMemo(
    () =>
      located
        .filter((u) => filter === 'ALL' || u.status === filter || u.id === selectedId)
        .map((u) => ({
          id: u.id,
          lat: u.position.latitude,
          lng: u.position.longitude,
          color: markerColor(u.status),
          name: `${u.name} · ${kmToday(u).toFixed(1)} km hoy`,
          kind: u.kind,
          heading: u.position.heading,
          speed: u.position.speed,
          selected: u.id === selectedId,
        })),
    [located, filter, selectedId]
  );

  const brand = t.isDark ? '#f87203' : '#032347';

  const routes: MapRoute[] = useMemo(() => {
    const list: MapRoute[] = [];
    if (trail && trail.unitId === selectedId) list.push({ path: trail.path, color: brand });
    if (guide) list.push({ path: guide.path, color: '#22c55e', dashed: !guide.byRoad });
    return list;
  }, [trail, guide, selectedId, brand]);

  const points: MapPoint[] = useMemo(() => {
    const list: MapPoint[] = [];
    if (trail && trail.unitId === selectedId && trail.path.length) list.push({ lat: trail.path[0][0], lng: trail.path[0][1], color: '#22c55e' });
    if (me) list.push({ lat: me.lat, lng: me.lng, color: ME_COLOR });
    return list;
  }, [trail, me, selectedId]);

  const guideUnit = guide ? units.find((u) => u.id === guide.unitId) || null : null;

  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      setFollowing(false);
      setSnap('half');
      const u = units.find((x) => x.id === id);
      if (u && hasPosition(u)) {
        setCamera({ key: nextKey(), type: 'center', lat: u.position.latitude, lng: u.position.longitude, zoom: 15, padding: focusPadding });
      }
    },
    [units, focusPadding]
  );

  const closeSelection = () => {
    setSelectedId(null);
    setFollowing(false);
    setTrail(null);
  };

  const locateMe = async () => {
    try {
      const pos = await getMyLocation();
      setMe(pos);
      setFollowing(false);
      setCamera({ key: nextKey(), type: 'center', lat: pos.lat, lng: pos.lng, zoom: 15, padding });
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  const routeToUnit = async (unit: FleetUnit) => {
    if (!hasPosition(unit)) {
      toast('La unidad no tiene posición reciente', 'error');
      return;
    }
    setGuideLoading(true);
    try {
      const pos = me || (await getMyLocation());
      setMe(pos);
      const route = await drivingRoute(pos, { lat: unit.position.latitude, lng: unit.position.longitude });
      if (!route.byRoad) toast('No se pudo calcular la ruta por calles; se muestra en línea recta', 'info');
      setFollowing(false);
      setSelectedId(null);
      setListOpen(false);
      setGuide({ ...route, unitId: unit.id });
      setCamera({ key: nextKey(), type: 'fit', padding });
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setGuideLoading(false);
    }
  };

  const toggleTodayRoute = async () => {
    if (!selected) return;
    if (trail?.unitId === selected.id) {
      setTrail(null);
      return;
    }
    if (!selected.gpsDevice?.id) {
      toast('Esta unidad no tiene GPS vinculado', 'error');
      return;
    }
    setRouteLoading(true);
    try {
      const today = toDateInput(new Date());
      const positions = await api.gps.positions(selected.gpsDevice.id, `${today}T00:00:00`, `${today}T23:59:59`);
      const path = positions.map((p) => [p.latitude, p.longitude] as [number, number]);
      if (path.length < 2) {
        toast('Sin recorrido registrado hoy', 'info');
        return;
      }
      setFollowing(false);
      setTrail({ unitId: selected.id, path });
      setCamera({ key: nextKey(), type: 'fit', padding: focusPadding });
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setRouteLoading(false);
    }
  };

  const toggleFollow = () => {
    if (!selected) return;
    if (!hasPosition(selected)) {
      toast('La unidad no tiene posición reciente', 'error');
      return;
    }
    setFollowing((f) => !f);
  };

  const navigateTo = (unit: FleetUnit | null) => {
    if (!unit || !hasPosition(unit)) {
      toast('La unidad no tiene posición reciente', 'error');
      return;
    }
    setNavTarget({ name: unit.name, lat: unit.position.latitude, lng: unit.position.longitude });
  };

  const share = async () => {
    if (!selected) return;
    try {
      if ((await shareLocations([selected])) === 'copied') toast('Ubicación copiada', 'success');
    } catch (err: any) {
      if (err?.name !== 'AbortError') toast(err.message, 'error');
    }
  };

  const controls = (
    <View className="gap-2">
      <View className={`flex-row items-center gap-2 rounded-2xl border px-3.5 ${t.card} ${t.border}`}>
        <Search size={17} color={t.hex.muted} />
        <TextInput
          value={search}
          onChangeText={(v) => {
            setSearch(v);
            if (v && !isDesktop) setListOpen(true);
          }}
          placeholder="Buscar unidad o placa"
          placeholderTextColor={t.hex.muted}
          className={`flex-1 py-3 text-[14px] ${t.text}`}
          style={{ outlineStyle: 'none' } as any}
        />
      </View>
      <ChipRow>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} count={counts[f.key] || 0} active={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </ChipRow>
    </View>
  );

  const list = (
    <FlatList
      data={pageItems}
      keyExtractor={(u) => u.id}
      contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 16 }}
      renderItem={({ item }) => <UnitRow unit={item} selected={item.id === selectedId} onPress={() => select(item.id)} />}
      ListEmptyComponent={<EmptyState icon={Search} title="Sin unidades" message={error || 'No hay unidades con este filtro.'} />}
      ListFooterComponent={
        <View className="px-2">
          <Pagination {...pager} />
        </View>
      }
    />
  );

  const panel = selected ? (
    <UnitQuickPanel
      unit={selected}
      offHoursKm={offHours.byUnit[selected.id] ?? 0}
      following={following}
      routeShown={trail?.unitId === selected.id}
      routeLoading={routeLoading}
      onClose={closeSelection}
      onFollow={toggleFollow}
      onRoute={toggleTodayRoute}
      onHistory={() => router.push(`/tracking?unit=${selected.id}` as never)}
      onNavigate={() => navigateTo(selected)}
      onShare={can('share') ? share : undefined}
      onEngine={can('engine') ? () => setEngineUnit(selected) : undefined}
    />
  ) : null;

  const mapButtons = (
    <View className="absolute right-4 gap-2" style={{ top: isDesktop ? 16 : 120 }}>
      <MapButton icon={Layers} label="Cambiar capa" active={layer === 'satellite'} onPress={() => setLayer((l) => (l === 'street' ? 'satellite' : 'street'))} />
      <MapButton
        icon={Maximize}
        label="Ver todas las unidades"
        onPress={() => {
          setFollowing(false);
          setCamera({ key: nextKey(), type: 'fit', padding });
        }}
      />
      <MapButton icon={LocateFixed} label="Mi ubicación" active={!!me} onPress={locateMe} />
      <MapButton icon={Navigation2} label="Ruta hacia una unidad" active={!!guide || guideLoading} onPress={() => setOverlay('route')} />
      {can('alerts') ? <MapButton icon={Bell} label="Modo alarma" dot={alarm.active} onPress={() => setOverlay('alarm')} /> : null}
    </View>
  );

  const map = (
    <FleetMap
      markers={markers}
      routes={routes}
      points={points}
      camera={camera}
      follow={following ? selectedId : null}
      layer={layer}
      onMarkerPress={select}
      onUserPan={() => following && setFollowing(false)}
    />
  );

  const guideBanner = guideUnit ? (
    <View className={`flex-row items-center gap-2 rounded-2xl border p-2 pl-4 ${t.card} ${t.border}`}>
      <View className="flex-1">
        <Text className={`text-[13px] font-semibold ${t.text}`} numberOfLines={1}>
          Ruta hacia {guideUnit.name}
        </Text>
        <Text className={`text-[11px] ${t.muted}`}>
          {guide ? `${guide.distanceKm.toFixed(1)} km · ${guide.durationMin} min aprox. ${guide.byRoad ? 'por calles' : 'en línea recta'}` : ''}
        </Text>
      </View>
      <Pressable onPress={() => navigateTo(guideUnit)} className="flex-row items-center gap-1.5 rounded-xl px-3 py-2 active:opacity-80" style={{ backgroundColor: brand }}>
        <Navigation size={15} color="#ffffff" />
        <Text className="text-white text-[12px] font-semibold">Abrir en Maps</Text>
      </Pressable>
      <Pressable onPress={() => setGuide(null)} accessibilityLabel="Quitar ruta" className="p-2">
        <X size={18} color={t.hex.muted} />
      </Pressable>
    </View>
  ) : null;

  const sheets = (
    <>
      <EngineCommandSheet units={engineUnit ? [engineUnit] : []} visible={!!engineUnit} onClose={() => setEngineUnit(null)} />
      <AlarmSheet visible={overlay === 'alarm'} units={units} onClose={() => setOverlay(null)} />
      <UnitPickerSheet visible={overlay === 'route'} units={located} selectedId={guide?.unitId || null} onSelect={routeToUnit} onClose={() => setOverlay(null)} />
      <NavigateSheet target={navTarget} onClose={() => setNavTarget(null)} />
    </>
  );

  if (isDesktop) {
    return (
      <View className={`flex-1 flex-row ${t.screen}`}>
        <View className={`w-[380px] border-r ${t.card} ${t.border}`}>
          {selected ? (
            <View className="pt-4">{panel}</View>
          ) : (
            <>
              <View className="p-4">{controls}</View>
              {list}
            </>
          )}
        </View>
        <View className="flex-1">
          {map}
          {mapButtons}
          {guideBanner ? <View className="absolute left-6 right-20 bottom-4 items-center">{guideBanner}</View> : null}
        </View>
        {sheets}
      </View>
    );
  }

  return (
    <View className="flex-1">
      {map}
      {!selected ? <View className="absolute left-0 right-0 top-0 px-4 pt-3">{controls}</View> : null}
      {!selected ? mapButtons : null}
      {sheetVisible ? (
        <DraggableSheet
          snap={snap}
          onSnapChange={setSnap}
          header={
            selected ? null : (
              <View className="flex-row items-center justify-between px-5 pb-2">
                <Text className={`text-[13px] font-semibold ${t.muted}`}>
                  {visible.length} unidades · {counts.MOVING || 0} en movimiento
                </Text>
                <Pressable onPress={() => setListOpen(false)} accessibilityLabel="Cerrar lista" className="p-1">
                  <X size={18} color={t.hex.muted} />
                </Pressable>
              </View>
            )
          }
        >
          {selected ? panel : list}
        </DraggableSheet>
      ) : (
        <View className="absolute left-0 right-0 items-center gap-2 px-4" style={{ bottom: 16 + TAB_OVERHANG }} pointerEvents="box-none">
          {guideBanner ? <View className="w-full max-w-[520px]">{guideBanner}</View> : null}
          <Pressable
            onPress={() => {
              setListOpen(true);
              setSnap('half');
            }}
            className="flex-row items-center gap-2 rounded-full px-5 py-3 active:opacity-80"
            style={{ backgroundColor: brand }}
          >
            <List size={17} color="#ffffff" />
            <Text className="text-white text-[13px] font-semibold">Ver unidades ({units.length})</Text>
          </Pressable>
        </View>
      )}
      {sheets}
    </View>
  );
}
