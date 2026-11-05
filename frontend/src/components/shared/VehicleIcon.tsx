import { useMemo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { Figure, FleetUnit } from '@/lib/types';
import { defaultFigure, unitLook } from '@/lib/units';
import { VEHICLE_SVG_HEIGHT, VEHICLE_SVG_WIDTH, vehicleSvg } from '@/components/map/vehicleSvg';

export default function VehicleIcon({
  kind,
  figure,
  color,
  statusColor,
  size = 32,
  heading = 0,
}: {
  kind: 'vehicle' | 'machine';
  figure?: Figure | null;
  color: string;
  statusColor?: string;
  size?: number;
  heading?: number;
}) {
  const shape = figure || defaultFigure(kind);
  const xml = useMemo(() => vehicleSvg(shape, color, statusColor), [shape, color, statusColor]);
  const width = (size * VEHICLE_SVG_WIDTH) / VEHICLE_SVG_HEIGHT;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: `${heading}deg` }] }}>
      <SvgXml xml={xml} width={width} height={size} />
    </View>
  );
}

export function UnitIcon({ unit, size, heading }: { unit: FleetUnit; size?: number; heading?: number }) {
  const look = unitLook(unit);
  return <VehicleIcon kind={unit.kind} figure={look.figure} color={look.color} statusColor={look.statusColor} size={size} heading={heading} />;
}
