import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, Car } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useFleet } from '@/hooks/useFleet';
import { useApi } from '@/hooks/useApi';
import { useCan } from '@/hooks/useCan';
import { api } from '@/lib/api';
import { markerColor, shortTimeAgo, statusLabel } from '@/lib/format';
import { kmToday } from '@/lib/units';
import type { FleetUnit, TrackingEvent } from '@/lib/types';
import { Card, EmptyState, ErrorBanner, Loading, Screen, SectionTitle } from '@/components/ui';
import { UnitIcon } from '@/components/shared/VehicleIcon';
import EventRow from '@/components/events/EventRow';
import EventPreviewSheet from '@/components/events/EventPreviewSheet';
import QuickActions from './QuickActions';

const COLUMN = { width: 64, alignItems: 'flex-end' as const };

function VehicleTable({ units }: { units: FleetUnit[] }) {
  const { t } = useTheme();
  const head = `text-[12.5px] font-extrabold tracking-wide ${t.brandText}`;
  return (
    <Card className="overflow-hidden">
      <View className={`flex-row items-center px-5 py-3.5 border-b ${t.card} ${t.border}`}>
        <Text className={`flex-1 ${head}`}>Vehículo</Text>
        <View style={COLUMN}>
          <Text className={head}>Hoy</Text>
        </View>
        <View style={COLUMN}>
          <Text className={head}>Batería</Text>
        </View>
      </View>
      {units.map((unit, i) => {
        const p = unit.position;
        const voltage = p?.voltage;
        const lowBattery = voltage !== undefined && voltage !== null && voltage < 11.5;
        const status = markerColor(unit.status);
        return (
          <Pressable
            key={unit.id}
            onPress={() => router.replace(`/live-map?unit=${unit.id}` as never)}
            accessibilityLabel={`Ver ${unit.name} en el mapa`}
            className={`flex-row items-center px-5 py-4 ${t.press} ${i < units.length - 1 ? `border-b ${t.border}` : ''}`}
          >
            <View className="flex-1 flex-row items-center gap-3 min-w-0">
              <View className={`w-11 h-11 rounded-full items-center justify-center ${t.tonal}`}>
                <UnitIcon unit={unit} size={32} heading={p?.heading ?? 0} />
              </View>
              <View className="flex-1 min-w-0">
                <Text className={`text-[14.5px] font-bold ${t.text}`} numberOfLines={1}>
                  {unit.name}
                </Text>
                <View className="flex-row items-center gap-1.5 mt-0.5">
                  <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status }} />
                  <Text className="text-[12px] font-semibold flex-shrink" style={{ color: status }} numberOfLines={1}>
                    {statusLabel(unit.status)}
                    <Text className={`font-normal ${t.muted}`}>{p ? ` · hace ${shortTimeAgo(p.timestamp)}` : ' · sin señal'}</Text>
                  </Text>
                </View>
              </View>
            </View>
            <View style={COLUMN}>
              <Text className={`text-[14px] font-extrabold ${t.text}`}>{kmToday(unit).toFixed(1)}</Text>
              <Text className={`text-[10.5px] ${t.muted}`}>km</Text>
            </View>
            <View style={COLUMN}>
              <Text className="text-[14px] font-bold" style={{ color: lowBattery ? '#ef4444' : t.hex.text }}>
                {voltage ? voltage.toFixed(1) : '—'}
              </Text>
              <Text className={`text-[10.5px] ${t.muted}`}>{voltage ? 'V' : ''}</Text>
            </View>
          </Pressable>
        );
      })}
    </Card>
  );
}

export default function PersonalHome() {
  const { t } = useTheme();
  const can = useCan();
  const canAlerts = can('alerts');
  const { units, loading, error, refreshing, refresh } = useFleet(30000);
  const recent = useApi(() => (canAlerts ? api.events.list({ limit: '5' }) : Promise.resolve(null)), [canAlerts], { pollMs: 60000 });
  const [preview, setPreview] = useState<TrackingEvent | null>(null);
  const events = recent.data?.data || [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} maxWidth={720}>
      <Text className={`text-[28px] font-extrabold tracking-tight mb-1 ${t.text}`}>Tus vehículos</Text>
      <Text className={`text-[14px] mb-5 ${t.muted}`}>
        {units.length === 1 ? '1 vehículo protegido' : `${units.length} vehículos protegidos`}
      </Text>
      {error ? <ErrorBanner message={error} /> : null}
      {loading && !units.length ? (
        <Loading />
      ) : units.length ? (
        <VehicleTable units={units} />
      ) : (
        <Card>
          <EmptyState icon={Car} title="Aún no tienes vehículos" message="Tu vehículo aparecerá aquí en cuanto nuestro técnico instale y active tu GPS." />
        </Card>
      )}

      <View className="mt-4">
        <QuickActions alerts={0} />
      </View>

      {canAlerts ? (
        <>
          <SectionTitle>Últimas alertas</SectionTitle>
          <Card className="py-1.5 overflow-hidden">
            {events.length ? (
              events.map((e) => <EventRow key={e.id} event={e} onPress={() => setPreview(e)} />)
            ) : (
              <EmptyState icon={Bell} title="Sin alertas" message="Te avisaremos aquí si algo pasa con tus vehículos." />
            )}
          </Card>
        </>
      ) : null}
      <EventPreviewSheet event={preview} onClose={() => setPreview(null)} />
    </Screen>
  );
}
