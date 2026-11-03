import { useMemo, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import type { FleetMapProps, MapEngineMessage } from './types';
import { vehicleSvg } from './vehicleSvg';

export function useEngineState(props: FleetMapProps) {
  const { t } = useTheme();
  const { markers, routes, circles, points, camera, follow, layer } = props;

  const state = useMemo(
    () => ({
      dark: t.isDark,
      layer: layer || 'street',
      markers: (markers || []).map((m) => ({ ...m, svg: vehicleSvg(m.kind, m.color) })),
      routes: routes || [],
      circles: circles || [],
      points: points || [],
      camera: camera || null,
      follow: follow || null,
    }),
    [t.isDark, layer, markers, routes, circles, points, camera, follow]
  );

  const handlersRef = useRef(props);
  handlersRef.current = props;

  const handleMessage = (msg: MapEngineMessage) => {
    const h = handlersRef.current;
    if (msg.type === 'markerPress' && msg.id) h.onMarkerPress?.(msg.id);
    if (msg.type === 'move' && msg.lat !== undefined && msg.lng !== undefined) {
      h.onMove?.({ lat: msg.lat, lng: msg.lng, zoom: msg.zoom ?? 0 });
    }
    if (msg.type === 'userPan') h.onUserPan?.();
  };

  return { state, handleMessage };
}
