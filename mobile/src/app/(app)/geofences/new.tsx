import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import Slider from '@react-native-community/slider';
import { ArrowLeft, Check, LocateFixed, Plus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { api } from '@/lib/api';
import { getMyLocation } from '@/lib/myLocation';
import FleetMap from '@/components/map/FleetMap';
import type { MapCamera, MapCenter, MapCircle } from '@/components/map/types';
import { Button, Card, Chip, ChipRow, Field } from '@/components/ui';
import AdminOnly from '@/components/shared/AdminOnly';

const TYPES = ['Trabajo', 'Almacén', 'Base', 'Zona restringida', 'Otro'];
const COLORS = ['#f87203', '#032347', '#3B82F6', '#22C55E', '#EF4444', '#64748B'];
const MIN_RADIUS = 100;
const MAX_RADIUS = 5000;

function radiusLabel(r: number) {
  return r >= 1000 ? `${(r / 1000).toFixed(2)} km` : `${r} m`;
}

function zoomForRadius(r: number) {
  return Math.max(11, Math.min(17, 16 - Math.log2(r / 150)));
}

function NewGeofenceForm() {
  const { t } = useTheme();
  const toast = useToast();
  const isDesktop = useIsDesktop();
  const [center, setCenter] = useState<MapCenter | null>(null);
  const [radius, setRadius] = useState(300);
  const [name, setName] = useState('');
  const [type, setType] = useState(TYPES[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [camera, setCamera] = useState<MapCamera | null>(null);

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
      await api.geofences.create({ name: name.trim(), type, color, radius, centerLat: center.lat, centerLng: center.lng });
      toast('Geocerca creada', 'success');
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
          {TYPES.map((ty) => (
            <Chip key={ty} label={ty} active={type === ty} onPress={() => setType(ty)} />
          ))}
        </ChipRow>
      </View>
      <View className="gap-1.5">
        <Text className={`text-[11px] font-semibold uppercase tracking-wider ${t.subtle}`}>Color</Text>
        <View className="flex-row gap-3">
          {COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              accessibilityLabel={`Color ${c}`}
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: c }}
            >
              {color === c ? <Check size={16} color="#ffffff" /> : null}
            </Pressable>
          ))}
        </View>
      </View>
      {center ? (
        <Text className={`text-[11px] ${t.subtle}`}>
          Centro: {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
        </Text>
      ) : null}
      <Button label="Crear geocerca" icon={Plus} onPress={save} loading={saving} />
    </ScrollView>
  );

  const header = (
    <View className={`flex-row items-center gap-2 px-4 py-3 border-b ${t.card} ${t.border}`}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/geofences'))} className="p-1.5" accessibilityLabel="Volver">
        <ArrowLeft size={20} color={t.hex.text} />
      </Pressable>
      <Text className={`text-[16px] font-bold ${t.text}`}>Nueva geocerca</Text>
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

export default function NewGeofence() {
  return (
    <AdminOnly>
      <NewGeofenceForm />
    </AdminOnly>
  );
}
