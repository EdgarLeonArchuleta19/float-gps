import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import VehicleIcon from '@/components/shared/VehicleIcon';
import type { MapMarker } from './types';

export default function NativeUnitMarker({ marker, onPress }: { marker: MapMarker; onPress?: (id: string) => void }) {
  const look = `${marker.color}|${marker.selected}|${marker.name}|${Math.round(marker.heading ?? 0)}`;
  const [tracks, setTracks] = useState(true);

  useEffect(() => {
    setTracks(true);
    const id = setTimeout(() => setTracks(false), 600);
    return () => clearTimeout(id);
  }, [look]);

  return (
    <Marker
      coordinate={{ latitude: marker.lat, longitude: marker.lng }}
      anchor={{ x: 0.5, y: marker.selected ? 0.75 : 0.5 }}
      tracksViewChanges={tracks}
      zIndex={marker.selected ? 10 : 1}
      onPress={() => onPress?.(marker.id)}
    >
      <View style={{ alignItems: 'center' }}>
        {marker.selected ? (
          <View
            style={{
              backgroundColor: '#1b1b1f',
              borderColor: '#33343c',
              borderWidth: 1,
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 3,
              marginBottom: 2,
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
              {marker.name}
            </Text>
          </View>
        ) : null}
        <View
          style={{
            shadowColor: '#000000',
            shadowOpacity: 0.35,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
            backgroundColor: marker.selected ? `${marker.color}40` : 'transparent',
            borderRadius: 999,
          }}
        >
          <VehicleIcon kind={marker.kind} color={marker.color} size={marker.selected ? 40 : 34} heading={marker.heading ?? 0} />
        </View>
      </View>
    </Marker>
  );
}
