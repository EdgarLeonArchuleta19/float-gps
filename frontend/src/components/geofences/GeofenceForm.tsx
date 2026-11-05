import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import Slider from '@react-native-community/slider';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, LocateFixed, Plus, Save } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { api } from '@/lib/api';
import type { Geofence } from '@/lib/types';
import { getMyLocation } from '@/lib/myLocation';
import FleetMap from '@/components/map/FleetMap';
import type { MapCamera, MapCenter, MapCircle } from '@/components/map/types';
import { Button, Card, Chip, ChipRow, Field } from '@/components/ui';
import LifecycleActions from '@/components/shared/LifecycleActions';

const TYPES = ['Trabajo', 'Almacén', 'Base', 'Zona restringida', 'Otro'];
const COLORS = [
  '#f87203', '#032347', '#3B82F6', '#22C55E', '#EF4444',
  '#64748B', '#0EA5E9', '#14B8A6', '#84CC16', '#EAB308',
  '#F59E0B', '#E11D48', '#EC4899', '#A855F7', '#6366F1',
  '#0F766E', '#15803D', '#B45309', '#7C2D12', '#1E293B',
];
const COLORS_PER_PAGE = 10;
const COLOR_ROW_WIDTH = 5 * 36 + 4 * 12;
const FALLBACK_CENTER = { lat: 24.7994, lng: -107.394 };
const MIN_RADIUS = 100;
const MAX_RADIUS = 5000;

function radiusLabel(r: number) {
  return r >= 1000 ? `${(r / 1000).toFixed(2)} km` : `${r} m`;
}

function zoomForRadius(r: number) {
  return Math.max(11, Math.min(17, 16 - Math.log2(r / 150)));
}

function initialCamera(initial?: Geofence): MapCamera | null {
  if (initial?.centerLat == null || initial.centerLng == null) return null;
  return { key: `edit-${initial.id}`, type: 'center', lat: initial.centerLat, lng: initial.centerLng, zoom: zoomForRadius(initial.radius || 300) };
}

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const { t } = useTheme();
  const totalPages = Math.ceil(COLORS.length / COLORS_PER_PAGE);
  const [page, setPage] = useState(Math.floor(Math.max(0, COLORS.indexOf(value)) / COLORS_PER_PAGE));
  const visible = COLORS.slice(page * COLORS_PER_PAGE, (page + 1) * COLORS_PER_PAGE);
  const arrow = (target: number, Icon: typeof ChevronLeft, label: string) => {
    const disabled = target < 0 || target >= totalPages;
    return (
      <Pressable
        onPress={() => setPage(target)}
        disabled={disabled}
        accessibilityLabel={label}
        className={`w-8 h-8 rounded-lg border items-center justify-center ${t.card} ${t.border} ${disabled ? 'opacity-30' : 'active:opacity-70'}`}
      >
        <Icon size={16} color={t.hex.text} />
      </Pressable>
    );
  };
  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-3" style={{ maxWidth: COLOR_ROW_WIDTH }}>
        {visible.map((c) => (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            accessibilityLabel={`Color ${c}`}
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{ backgroundColor: c, borderWidth: value === c ? 2 : 0, borderColor: t.hex.text }}
          >
            {value === c ? <Check size={16} color="#ffffff" /> : null}
          </Pressable>
        ))}
      </View>
      <View className="flex-row items-center gap-2">
        {arrow(page - 1, ChevronLeft, 'Colores anteriores')}
        <Text className={`text-[11.5px] ${t.muted}`}>
          {page + 1} de {totalPages}
        </Text>
        {arrow(page + 1, ChevronRight, 'Más colores')}
      </View>
    </View>
  );
}

export default function GeofenceForm({ initial }: { initial?: Geofence }) {
  const { t } = useTheme();
  const toast = useToast();
  const isDesktop = useIsDesktop();
  const [center, setCenter] = useState<MapCenter | null>(
    initial?.centerLat != null && initial.centerLng != null ? { lat: initial.centerLat, lng: initial.centerLng, zoom: zoomForRadius(initial.radius || 300) } : null
  );
  const [radius, setRadius] = useState(initial?.radius ? Math.round(initial.radius) : 300);
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState(initial?.type || TYPES[0]);
  const [color, setColor] = useState(initial?.color || COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [camera, setCamera] = useState<MapCamera | null>(() => initialCamera(initial));
  const types = TYPES.includes(type) ? TYPES : [...TYPES, type];

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    getMyLocation()
      .catch(() => FALLBACK_CENTER)
      .then((start) => {
        if (!cancelled) setCamera({ key: 'start', type: 'center', lat: start.lat, lng: start.lng, zoom: zoomForRadius(300) });
      });
    return () => {
      cancelled = true;
    };
  }, [initial]);

  const circles: MapCircle[] = useMemo(
    () => (center ? [{ lat: center.lat, lng: center.lng, radius, color }] : []),
    [center, radius, color]
  );

  const locateMe = async () => {
    try {
      const me = await getMyLocation();
      setCamera({ key: `me-${Date.now()}`, type: 'center', lat: me.lat, lng: me.lng, zoom: zoomForRadius(radius) });
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  const zoomStep = Math.round(Math.log2(radius) * 2);

  useEffect(() => {
    if (!center) return;
    setCamera({ key: `zoom-${zoomStep}`, type: 'center', lat: center.lat, lng: center.lng, zoom: zoomForRadius(radius) });
  }, [zoomStep]);

  const save = async () => {
    if (!name.trim()) {
      toast('Ponle un nombre a la geocerca', 'error');
      return;
    }
    if (!center) {
      toast('Mueve el mapa para ubicar el centro', 'error');
      return;
    }
    setSaving(true);
    try {
      const data = { name: name.trim(), type, color, radius, centerLat: center.lat, centerLng: center.lng };
      if (initial) await api.geofences.update(initial.id, data);
      else await api.geofences.create(data);
      toast(initial ? 'Geocerca actualizada' : 'Geocerca creada', 'success');
      router.replace('/geofences');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const mapArea = (
    <View className="flex-1">
      <FleetMap circles={circles} camera={camera} onMove={setCenter} />
      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        <View className="items-center justify-center">
          <View className="absolute w-10 h-[2px]" style={{ backgroundColor: color }} />
          <View className="absolute h-10 w-[2px]" style={{ backgroundColor: color }} />
          <View className="w-4 h-4 rounded-full border-2 border-white" style={{ backgroundColor: color }} />
        </View>
      </View>
      <Pressable
        onPress={locateMe}
        accessibilityLabel="Mi ubicación"
        className={`absolute right-4 top-4 w-11 h-11 rounded-xl items-center justify-center border ${t.card} ${t.border}`}
      >
        <LocateFixed size={19} color={t.hex.text} />
      </Pressable>
      <View className={`absolute left-4 top-4 rounded-xl border px-3 py-2 ${t.card} ${t.border}`}>
        <Text className={`text-[11px] ${t.muted}`}>Mueve el mapa para colocar el centro</Text>
      </View>
    </View>
  );

  const form = (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
      <View>
        <View className="flex-row justify-between items-end mb-1">
          <Text className={`text-[11px] font-semibold uppercase tracking-wider ${t.subtle}`}>Radio</Text>
          <Text className={`text-[18px] font-bold ${t.text}`}>{radiusLabel(radius)}</Text>
        </View>
        <Slider
          minimumValue={MIN_RADIUS}
          maximumValue={MAX_RADIUS}
          step={50}
          value={radius}
          onValueChange={(v: number) => setRadius(Math.round(v))}
          minimumTrackTintColor={color}
          maximumTrackTintColor={t.hex.border}
          thumbTintColor={color}
          style={{ height: 40 }}
        />
        <View className="flex-row justify-between">
          <Text className={`text-[11px] ${t.subtle}`}>100 m</Text>
          <Text className={`text-[11px] ${t.subtle}`}>5 km</Text>
        </View>
      </View>
      <Field label="Nombre" placeholder="Ej. Patio central" value={name} onChangeText={setName} />
      <View className="gap-1.5">
        <Text className={`text-[11px] font-semibold uppercase tracking-wider ${t.subtle}`}>Tipo</Text>
        <ChipRow>
          {types.map((ty) => (
            <Chip key={ty} label={ty} active={type === ty} onPress={() => setType(ty)} />
          ))}
        </ChipRow>
      </View>
      <View className="gap-1.5">
        <Text className={`text-[11px] font-semibold uppercase tracking-wider ${t.subtle}`}>Color</Text>
        <ColorPicker value={color} onChange={setColor} />
      </View>
      {center ? (
        <Text className={`text-[11px] ${t.subtle}`}>
          Centro: {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
        </Text>
      ) : null}
      <Button label={initial ? 'Guardar cambios' : 'Crear geocerca'} icon={initial ? Save : Plus} onPress={save} loading={saving} />
      {initial ? (
        <View className={`flex-row items-center justify-between gap-3 pt-3 border-t ${t.border}`}>
          <Text className={`text-[12px] flex-1 ${t.muted}`}>{initial.isActive ? 'Geocerca activa' : 'Geocerca desactivada'}</Text>
          <LifecycleActions
            noun={{ label: 'geocerca', feminine: true }}
            name={initial.name}
            active={initial.isActive}
            deactivateHint="Dejará de mostrarse en el mapa y de generar alertas."
            onSetActive={(active) => api.geofences.setActive(initial.id, active)}
            onDelete={() => api.geofences.remove(initial.id)}
            onChanged={() => router.replace('/geofences')}
          />
        </View>
      ) : null}
    </ScrollView>
  );

  const header = (
    <View className={`flex-row items-center gap-2 px-4 py-3 border-b ${t.card} ${t.border}`}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/geofences'))} className="p-1.5" accessibilityLabel="Volver">
        <ArrowLeft size={20} color={t.hex.text} />
      </Pressable>
      <Text className={`text-[16px] font-bold ${t.text}`}>{initial ? 'Editar geocerca' : 'Nueva geocerca'}</Text>
    </View>
  );

  if (isDesktop) {
    return (
      <View className={`flex-1 ${t.screen}`}>
        {header}
        <View className="flex-1 flex-row">
          <View className="flex-1">{mapArea}</View>
          <View className={`w-[380px] border-l ${t.card} ${t.border}`}>{form}</View>
        </View>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${t.screen}`}>
      {header}
      <View className="flex-[1.1]">{mapArea}</View>
      <Card className="flex-1 rounded-b-none border-b-0">{form}</Card>
    </View>
  );
}
