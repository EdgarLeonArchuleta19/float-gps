import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { MapPin, Navigation } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { eventTypeLabel, formatDateTime, severityHex } from '@/lib/format';
import { openUnit } from '@/lib/units';
import type { TrackingEvent } from '@/lib/types';
import FleetMap from '@/components/map/FleetMap';
import type { MapCamera, MapPoint } from '@/components/map/types';
import NavigateSheet from '@/components/shared/NavigateSheet';
import { eventUnitName } from '@/components/events/EventRow';
import { Button, Sheet } from '@/components/ui';

export default function EventPreviewSheet({ event, onClose }: { event: TrackingEvent | null; onClose: () => void }) {
  const { t } = useTheme();
  const [navOpen, setNavOpen] = useState(false);

  const located = !!event && event.latitude != null && event.longitude != null;
  const lat = event?.latitude ?? 0;
  const lng = event?.longitude ?? 0;

  const points: MapPoint[] = useMemo(
    () => (located && event ? [{ lat, lng, color: severityHex(event.severity) }] : []),
    [located, event, lat, lng]
  );
  const camera: MapCamera | null = useMemo(
    () => (located && event ? { key: `event-${event.id}`, type: 'center', lat, lng, zoom: 16 } : null),
    [located, event, lat, lng]
  );

  const unitId = event?.gpsDevice?.vehicleId || event?.gpsDevice?.machineId;
  const unitKind = event?.gpsDevice?.vehicleId ? 'vehicle' : 'machine';

  return (
    <>
      <Sheet visible={!!event && !navOpen} onClose={onClose} title={event ? eventTypeLabel(event.type) : ''}>
        {event ? (
          <View className="gap-3 pb-2">
            <Text className={`text-[13px] ${t.muted}`}>
              <Text className={`font-semibold ${t.text}`}>{eventUnitName(event)}</Text> · {formatDateTime(event.timestamp)}
              {event.speed ? ` · ${Math.round(event.speed)} km/h` : ''}
            </Text>
            {event.message ? <Text className={`text-[13px] ${t.text}`}>{event.message}</Text> : null}
            {located ? (
              <View className={`h-[240px] rounded-2xl overflow-hidden border ${t.border}`}>
                <FleetMap points={points} camera={camera} />
              </View>
            ) : (
              <View className={`flex-row items-center gap-2 rounded-2xl p-4 ${t.input}`}>
                <MapPin size={16} color={t.hex.muted} />
                <Text className={`text-[13px] ${t.muted}`}>Este evento no tiene ubicación registrada.</Text>
              </View>
            )}
            <View className="flex-row gap-2">
              {located ? (
                <Button label="Cómo llegar" icon={Navigation} variant="secondary" onPress={() => setNavOpen(true)} className="flex-1" />
              ) : null}
              {unitId ? (
                <Button
                  label="Ver unidad"
                  onPress={() => {
                    onClose();
                    openUnit({ id: unitId, kind: unitKind });
                  }}
                  className="flex-1"
                />
              ) : null}
            </View>
          </View>
        ) : null}
      </Sheet>
      <NavigateSheet
        target={navOpen && event && located ? { name: eventUnitName(event), lat, lng } : null}
        onClose={() => setNavOpen(false)}
      />
    </>
  );
}
