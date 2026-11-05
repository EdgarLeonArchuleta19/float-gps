import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Bell, ChevronLeft, History, Map as MapIcon, Navigation, Pencil, Power } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useApi } from '@/hooks/useApi';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useCan } from '@/hooks/useCan';
import { useCanAdmin } from '@/hooks/useCanAdmin';
import { api } from '@/lib/api';
import { formatDateTime, formatHours, shortTimeAgo, toDateInput } from '@/lib/format';
import { useOffHours } from '@/hooks/useOffHours';
import { machineToUnit, vehicleToUnit } from '@/lib/units';
import type { TrackingEvent } from '@/lib/types';
import { Button, Card, EmptyState, ErrorBanner, Loading, Screen, SectionTitle, Stat, StatusPill } from '@/components/ui';
import { UnitIcon } from '@/components/shared/VehicleIcon';
import EventRow from '@/components/events/EventRow';
import EventPreviewSheet from '@/components/events/EventPreviewSheet';
import EngineCommandSheet from '@/components/shared/EngineCommandSheet';
import NavigateSheet from '@/components/shared/NavigateSheet';
import InfoRow from '@/components/units/InfoRow';
import QuickAction from '@/components/units/QuickAction';
import LifecycleActions from '@/components/shared/LifecycleActions';
import Tappable from '@/components/shared/Tappable';
import AppearanceSheet from '@/components/units/AppearanceSheet';
import UnitMaintenance from '@/components/units/UnitMaintenance';
import { usePlan } from '@/hooks/usePlan';

export default function UnitDetail() {
  const { t } = useTheme();
  const isDesktop = useIsDesktop();
  const can = useCan();
  const canAdmin = useCanAdmin();
  const params = useLocalSearchParams<{ id: string; kind?: string }>();
  const id = String(params.id);
  const kind = params.kind === 'machine' ? 'machine' : 'vehicle';

  const { data, loading, error, refreshing, refresh } = useApi(
    async () => {
      if (kind === 'machine') {
        const m = await api.machines.get(id);
        return { unit: machineToUnit(m), events: m.recentEvents || [] };
      }
      const v = await api.vehicles.get(id);
      return { unit: vehicleToUnit(v), events: v.recentEvents || [] };
    },
    [id, kind],
    { pollMs: 15000 }
  );

  const [preview, setPreview] = useState<TrackingEvent | null>(null);
  const offHours = useOffHours(toDateInput(new Date()));
  const [engineOpen, setEngineOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [lookOpen, setLookOpen] = useState(false);
  const { isSupport } = usePlan();

  const back = () => (router.canGoBack() ? router.back() : router.replace('/fleet'));

  if (loading && !data) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        <Button label="Volver" icon={ArrowLeft} variant="ghost" onPress={back} className="self-start" />
        <ErrorBanner message={error || 'Unidad no encontrada'} />
      </Screen>
    );
  }

  const { unit, events } = data;
  const p = unit.position;
  const session = unit.todaySession;

  const viewer = (
    <Card className="p-4 flex-row items-center gap-4">
      <View className={`w-16 h-16 rounded-full items-center justify-center ${t.tonal}`}>
        <UnitIcon unit={unit} size={48} />
      </View>
      <View className="flex-1">
        <Text className={`text-[15px] font-semibold ${t.text}`} numberOfLines={1}>
          {[unit.type, unit.brand, unit.model].filter(Boolean).join(' · ')}
        </Text>
        <Text className={`text-[12px] mt-0.5 ${t.muted}`}>
          {p ? `Motor ${p.ignition ? 'encendido' : 'apagado'} · reportó hace ${shortTimeAgo(p.timestamp)}` : 'Sin reportes de GPS'}
        </Text>
      </View>
    </Card>
  );

  const metrics = (
    <Card className="p-4">
      <View className="flex-row flex-wrap gap-4">
        <Stat label="Recorrido hoy" value={`${(session?.kilometers ?? 0).toFixed(1)} km`} />
        <Stat label="Motor" value={p ? (p.ignition ? 'Encendido' : 'Apagado') : '—'} />
        <Stat label="Batería" value={p?.voltage ? `${p.voltage.toFixed(1)} V` : '—'} />
        <Stat label="Reporte" value={p ? shortTimeAgo(p.timestamp) : '—'} hint={p ? formatDateTime(p.timestamp) : undefined} />
      </View>
      {session ? (
        <View className={`flex-row flex-wrap gap-4 mt-4 pt-4 border-t ${t.border}`}>
          <Stat label="Horas motor" value={formatHours(session.totalHours)} />
          <Stat label="Ralentí" value={formatHours(session.idleHours)} />
          {offHours.enabled ? <Stat label="Km fuera de horario" value={(offHours.byUnit[unit.id] ?? 0).toFixed(1)} /> : null}
        </View>
      ) : null}
    </Card>
  );

  const actions = (
    <View className="flex-row gap-2">
      <QuickAction icon={MapIcon} label="En mapa" onPress={() => router.push(`/live-map?unit=${unit.id}` as never)} />
      <QuickAction icon={History} label="Historial" onPress={() => router.push(`/tracking?unit=${unit.id}` as never)} />
      <QuickAction icon={Navigation} label="Cómo llegar" onPress={() => setNavOpen(true)} />
      {unit.kind === 'vehicle' && isSupport ? (
        <QuickAction icon={Pencil} label="Editar" onPress={() => router.push(`/fleet/${unit.id}` as never)} />
      ) : null}
      {unit.kind === 'vehicle' && canAdmin && !isSupport ? <QuickAction icon={Pencil} label="Editar" onPress={() => setLookOpen(true)} /> : null}
      {can('engine') ? <QuickAction icon={Power} label="Motor" onPress={() => setEngineOpen(true)} danger /> : null}
    </View>
  );

  const info = (
    <Card className="px-4 pb-1">
      <InfoRow label="Tipo" value={unit.type} />
      <InfoRow label="Marca" value={unit.brand} />
      <InfoRow label="Modelo" value={unit.model} />
      <InfoRow label="Año" value={unit.year} />
      {unit.kind === 'vehicle' ? <InfoRow label="Color" value={unit.color} /> : null}
      <InfoRow label="IMEI GPS" value={unit.gpsDevice?.imei || 'Sin GPS'} />
      <InfoRow label="Modelo GPS" value={unit.gpsDevice?.model} />
      <InfoRow label="SIM" value={unit.gpsDevice?.simNumber} />
    </Card>
  );

  const eventList = (
    <Card className="py-1">
      {events.length ? (
        events.map((e) => <EventRow key={e.id} event={{ ...e, unitName: unit.name }} onPress={() => setPreview(e)} />)
      ) : (
        <EmptyState icon={Bell} title="Sin eventos recientes" />
      )}
    </Card>
  );

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View className="flex-row items-center justify-between mb-3">
        <Tappable onPress={back} haptic accessibilityLabel="Volver" className={`w-11 h-11 rounded-full items-center justify-center ${t.card}`}>
          <ChevronLeft size={22} color={t.hex.brand} />
        </Tappable>
        <StatusPill status={unit.status} />
      </View>
      <View className="mb-5">
        <Text className={`text-[28px] font-extrabold tracking-tight ${t.text}`} numberOfLines={2}>
          {unit.name}
        </Text>
        <Text className={`text-[14px] mt-0.5 ${t.muted}`}>{unit.plate}</Text>
      </View>
      {isSupport ? (
        <Card className="p-3 mb-4 flex-row items-center justify-between gap-3">
          <Text className={`text-[12.5px] flex-1 ${t.muted}`}>
            {unit.isActive ? 'Unidad activa y visible en el mapa.' : 'Unidad desactivada: no aparece en el mapa ni en las listas.'}
          </Text>
          <LifecycleActions
            noun={{ label: 'unidad', feminine: true }}
            name={unit.name}
            active={unit.isActive}
            deactivateHint="Dejará de verse en el mapa y en las listas; su historial se conserva."
            onSetActive={(active) => (unit.kind === 'vehicle' ? api.vehicles : api.machines).setActive(unit.id, active)}
            onDelete={() => (unit.kind === 'vehicle' ? api.vehicles : api.machines).remove(unit.id)}
            onChanged={(deleted) => (deleted ? router.replace('/fleet') : refresh())}
          />
        </Card>
      ) : null}

      {isDesktop ? (
        <View className="flex-row gap-4 items-start">
          <View className="flex-1 gap-4">
            {viewer}
            {actions}
            {metrics}
            {can('maintenance') ? <UnitMaintenance unitId={unit.id} /> : null}
          </View>
          <View className="flex-1">
            <SectionTitle>Información</SectionTitle>
            {info}
            <SectionTitle>Eventos recientes</SectionTitle>
            {eventList}
          </View>
        </View>
      ) : (
        <View className="gap-4">
          {viewer}
          {actions}
          {metrics}
          {can('maintenance') ? <UnitMaintenance unitId={unit.id} /> : null}
          <View>
            <SectionTitle>Eventos recientes</SectionTitle>
            {eventList}
          </View>
          <View>
            <SectionTitle>Información</SectionTitle>
            {info}
          </View>
        </View>
      )}

      <EventPreviewSheet event={preview} onClose={() => setPreview(null)} />
      <EngineCommandSheet units={[unit]} visible={engineOpen} onClose={() => setEngineOpen(false)} />
      {unit.kind === 'vehicle' ? <AppearanceSheet unit={unit} visible={lookOpen} onClose={() => setLookOpen(false)} onSaved={refresh} /> : null}
      <NavigateSheet
        target={navOpen && p ? { name: unit.name, lat: p.latitude, lng: p.longitude } : null}
        onClose={() => setNavOpen(false)}
      />
    </Screen>
  );
}
