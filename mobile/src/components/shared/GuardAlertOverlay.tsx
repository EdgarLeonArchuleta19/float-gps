import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BellOff, MapPin, ShieldAlert } from 'lucide-react-native';
import { eventTypeLabel, formatTime } from '@/lib/format';
import type { TrackingEvent } from '@/lib/types';

export default function GuardAlertOverlay({ event, count, onStop }: { event: TrackingEvent | null; count: number; onStop: () => void }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!event) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [event, pulse]);

  if (!event) return null;
  const unitId = event.gpsDevice?.vehicleId || event.gpsDevice?.machineId;
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onStop}>
      <View style={{ flex: 1, backgroundColor: '#b91c1c', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <Animated.View
          style={{
            width: 132,
            height: 132,
            borderRadius: 66,
            backgroundColor: 'rgba(255,255,255,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale }],
          }}
        >
          <ShieldAlert size={64} color="#ffffff" />
        </Animated.View>
        <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700', letterSpacing: 2, marginTop: 28 }}>MODO GUARDA</Text>
        <Text style={{ color: '#ffffff', fontSize: 30, fontWeight: '800', textAlign: 'center', marginTop: 8 }}>{eventTypeLabel(event.type)}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 17, textAlign: 'center', marginTop: 6 }}>
          {event.unitName || 'Unidad'} · {formatTime(event.timestamp).slice(0, 5)}
        </Text>
        {count > 1 ? (
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 }}>y {count - 1} eventos más</Text>
        ) : null}
        <Pressable
          onPress={onStop}
          style={{ marginTop: 40, backgroundColor: '#ffffff', borderRadius: 20, height: 60, alignSelf: 'stretch', maxWidth: 420, width: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}
        >
          <BellOff size={22} color="#b91c1c" />
          <Text style={{ color: '#b91c1c', fontSize: 17, fontWeight: '800' }}>Detener alarma</Text>
        </Pressable>
        {unitId ? (
          <Pressable
            onPress={() => {
              onStop();
              router.replace(`/live-map?unit=${unitId}` as never);
            }}
            style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 }}
          >
            <MapPin size={18} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>Ver en el mapa</Text>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}
