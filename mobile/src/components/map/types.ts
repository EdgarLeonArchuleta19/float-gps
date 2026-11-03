import type { StyleProp, ViewStyle } from 'react-native';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  name: string;
  kind: 'vehicle' | 'machine';
  heading?: number;
  speed?: number;
  selected?: boolean;
}

export interface MapRoute {
  path: [number, number][];
  color: string;
  dashed?: boolean;
}

export interface MapCircle {
  lat: number;
  lng: number;
  radius: number;
  color: string;
}

export interface MapPoint {
  lat: number;
  lng: number;
  color: string;
}

export interface MapCamera {
  key: string;
  type: 'fit' | 'center';
  lat?: number;
  lng?: number;
  zoom?: number;
  padding?: { top: number; bottom: number; left: number; right: number };
}

export interface MapCenter {
  lat: number;
  lng: number;
  zoom: number;
}

export interface FleetMapProps {
  markers?: MapMarker[];
  routes?: MapRoute[];
  circles?: MapCircle[];
  points?: MapPoint[];
  camera?: MapCamera | null;
  follow?: string | null;
  layer?: 'street' | 'satellite';
  onMarkerPress?: (id: string) => void;
  onMove?: (center: MapCenter) => void;
  onUserPan?: () => void;
  style?: StyleProp<ViewStyle>;
}

export interface MapEngineMessage {
  type: 'ready' | 'markerPress' | 'move' | 'userPan';
  id?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
}

export interface MapEngineInstance {
  update: (state: Record<string, unknown>) => void;
  resize: () => void;
  destroy: () => void;
}
