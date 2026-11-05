import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Slider from '@react-native-community/slider';
import { Bell, ChevronDown, Pause, Play, Route } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { ORANGE } from '@/lib/brand';
import { unitLook } from '@/lib/units';
import { useFleet } from '@/hooks/useFleet';
import { useApi } from '@/hooks/useApi';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { api } from '@/lib/api';
import { formatHours, formatTime, localDayRange, toDateInput } from '@/lib/format';
import type { FleetUnit, TrackingEvent } from '@/lib/types';
import FleetMap from '@/components/map/FleetMap';
import type { MapCamera, MapMarker, MapPoint, MapRoute } from '@/components/map/types';
import { Card, EmptyState, ErrorBanner, Loading, PageHeader, Screen, SectionTitle, Stat } from '@/components/ui';
import DayStepper from '@/components/shared/DayStepper';
import UnitPickerSheet from '@/components/shared/UnitPickerSheet';
import EventRow from '@/components/events/EventRow';
import EventPreviewSheet from '@/components/events/EventPreviewSheet';

export default function Tracking() {
  const { t } = useTheme();
  const isDesktop = useIsDesktop();
  const params = useLocalSearchParams<{ unit?: string }>();
  const { units } = useFleet();
  const [unitId, setUnitId] = useState<string | null>(typeof params.unit === 'string' ? params.unit : null);
  const [date, setDate] = useState(toDateInput(new Date()));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [preview, setPreview] = useState<TrackingEvent | null>(null);

  useEffect(() => {
    if (!unitId && units.length) setUnitId((units.find((u) => u.gpsDevice) || units[0]).id);
  }, [units, unitId]);

  const unit: FleetUnit | null = units.find((u) => u.id === unitId) || null;
  const gpsId = unit?.gpsDevice?.id;

  const { data, loading, error } = useApi(
    async () => (gpsId ? api.gps.tracking(gpsId, localDayRange(date)) : null),
    [gpsId, date]
  );

  const positions = data?.positions || [];

  useEffect(() => {
    setIndex(positions.length ? positions.length - 1 : 0);
    setPlaying(false);
  }, [data]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setIndex((i) => {
        if (i >= positions.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 250);
    return () => clearInterval(id);
  }, [playing, positions.length]);

  const path = useMemo(() => positions.map((p) => [p.latitude, p.longitude] as [number, number]), [positions]);
  const routeColor = ORANGE;

  const routes: MapRoute[] = useMemo(() => {
    if (path.length < 2) return [];
    return [
      { path, color: t.isDark ? '#4b5563' : '#cbd5e1' },
      { path: path.slice(0, index + 1), color: routeColor },
    ];
  }, [path, index, routeColor, t.isDark]);

  const current = positions[index];
  const markers: MapMarker[] = useMemo(
    () =>
      current && unit
        ? [
            {
              id: unit.id,
              lat: current.latitude,
              lng: current.longitude,
              ...unitLook({ ...unit, status: current.speed > 2 ? 'MOVING' : 'STOPPED' }),
              name: `${unit.name} · ${formatTime(current.timestamp).slice(0, 5)}`,
              kind: unit.kind,
              heading: current.heading,
              speed: current.speed,
            },
          ]
        : [],
    [current, unit]
  );

  const points: MapPoint[] = useMemo(() => {
    if (!path.length) return [];
    return [{ lat: path[0][0], lng: path[0][1], color: '#22c55e' }];
  }, [path]);

  const camera: MapCamera | null = useMemo(
    () => (path.length ? { key: `track-${gpsId}-${date}-${path.length}`, type: 'fit' } : null),
    [gpsId, date, path.length]
  );

  const summary = data?.summary;
  const events = data?.events || [];

  const controls = (
    <View className="gap-3">
      <Pressable
        onPress={() => setPickerOpen(true)}
        className={`flex-row items-center justify-between rounded-2xl px-4 py-3.5 ${t.card}`}
      >
        <View className="flex-1">
          <Text className={`text-[11px] ${t.subtle}`}>Unidad</Text>
          <Text className={`text-[14px] font-semibold ${t.text}`} numberOfLines={1}>
            {unit ? `${unit.name} · ${unit.plate}` : 'Selecciona una unidad'}
          </Text>
        </View>
        <ChevronDown size={18} color={t.hex.muted} />
      </Pressable>
      <DayStepper value={date} onChange={setDate} />
    </View>
  );

  const player = positions.length > 1 ? (
    <Card className="p-4">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => {
            if (index >= positions.length - 1) setIndex(0);
            setPlaying((p) => !p);
          }}
          accessibilityLabel={playing ? 'Pausar' : 'Reproducir'}
          className={`w-11 h-11 rounded-full items-center justify-center bg-navy`}
        >
          {playing ? <Pause size={18} color="#fff" /> : <Play size={18} color="#fff" />}
        </Pressable>
        <View className="flex-1">
          <Slider
            minimumValue={0}
            maximumValue={positions.length - 1}
            step={1}
            value={index}
            onValueChange={(v: number) => {
              setPlaying(false);
              setIndex(Math.round(v));
            }}
            minimumTrackTintColor={routeColor}
            maximumTrackTintColor={t.hex.border}
            thumbTintColor={routeColor}
          />
          <View className="flex-row justify-between">
            <Text className={`text-[11px] ${t.subtle}`}>{formatTime(positions[0].timestamp).slice(0, 5)}</Text>
            <Text className={`text-[12px] font-semibold ${t.text}`}>
              {current ? `${formatTime(current.timestamp)} · ${Math.round(current.speed)} km/h` : ''}
            </Text>
            <Text className={`text-[11px] ${t.subtle}`}>{formatTime(positions[positions.length - 1].timestamp).slice(0, 5)}</Text>
          </View>
        </View>
      </View>
    </Card>
  ) : null;

  const stats = summary ? (
    <Card className="p-4">
      <View className="flex-row flex-wrap gap-4">
        <Stat label="Distancia" value={`${summary.totalKm} km`} />
        <Stat label="En movimiento" value={formatHours(summary.movingTime)} />
        <Stat label="Detenido" value={formatHours(summary.stoppedTime)} />
        <Stat label="Motor encendido" value={formatHours(summary.engineOnTime)} />
      </View>
    </Card>
  ) : null;

  const eventList = (
    <Card className="py-1">
      {events.length ? (
        events.map((e) => (
          <EventRow key={e.id} event={{ ...e, unitName: unit?.name }} onPress={() => setPreview({ ...e, unitName: unit?.name })} />
        ))
      ) : (
        <EmptyState icon={Bell} title="Sin eventos este día" />
      )}
    </Card>
  );

  const mapCard = (
    <Card className="overflow-hidden">
      <View style={{ height: isDesktop ? 520 : 320 }}>
        <FleetMap markers={markers} routes={routes} points={points} camera={camera} />
      </View>
    </Card>
  );

  const body = !unit ? (
    <Loading />
  ) : !gpsId ? (
    <Card>
      <EmptyState icon={Route} title="Unidad sin GPS" message="Vincula un GPS a esta unidad para ver su recorrido." />
    </Card>
  ) : loading && !data ? (
    <Loading label="Cargando recorrido…" />
  ) : path.length < 2 ? (
    <Card>
      <EmptyState icon={Route} title="Sin recorrido" message="No hay posiciones registradas en este día." />
    </Card>
  ) : isDesktop ? (
    <View className="flex-row gap-4 items-start">
      <View className="flex-[3] gap-4">
        {mapCard}
        {player}
      </View>
      <View className="flex-[2]">
        {stats}
        <SectionTitle>Eventos del día</SectionTitle>
        {eventList}
      </View>
    </View>
  ) : (
    <View className="gap-4">
      {mapCard}
      {player}
      {stats}
      <View>
        <SectionTitle>Eventos del día</SectionTitle>
        {eventList}
      </View>
    </View>
  );

  return (
    <Screen>
      <PageHeader title="Historial de recorrido" back="/live-map" subtitle="Reproduce el recorrido de cualquier día" />
      <View className="mb-4 w-full max-w-[520px]">{controls}</View>
      {error ? <ErrorBanner message={error} /> : null}
      {body}
      <UnitPickerSheet
        visible={pickerOpen}
        units={units}
        selectedId={unitId}
        onSelect={(u) => setUnitId(u.id)}
        onClose={() => setPickerOpen(false)}
      />
      <EventPreviewSheet event={preview} onClose={() => setPreview(null)} />
    </Screen>
  );
}
