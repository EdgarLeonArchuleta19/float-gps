import { useMemo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { VEHICLE_SVG_HEIGHT, VEHICLE_SVG_WIDTH, vehicleSvg } from '@/components/map/vehicleSvg';

export default function VehicleIcon({
  kind,
  color,
  size = 32,
  heading = 0,
}: {
  kind: 'vehicle' | 'machine';
  color: string;
  size?: number;
  heading?: number;
}) {
  const xml = useMemo(() => vehicleSvg(kind, color), [kind, color]);
  const width = (size * VEHICLE_SVG_WIDTH) / VEHICLE_SVG_HEIGHT;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: `${heading}deg` }] }}>
      <SvgXml xml={xml} width={width} height={size} />
    </View>
  );
}
