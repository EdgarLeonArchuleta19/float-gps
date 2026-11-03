import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api';
import { storage } from '@/lib/storage';
import { eventTypeLabel } from '@/lib/format';
import { startGuardSiren, stopGuardSiren } from '@/lib/guardSound';
import type { TrackingEvent } from '@/lib/types';
import GuardAlertOverlay from '@/components/shared/GuardAlertOverlay';
import { useToast } from './ToastContext';

const ALARM_KEY = 'floa_alarm';
const POLL_MS = 30000;
const WATCHED_TYPES = ['GEOFENCE_ENTER', 'GEOFENCE_EXIT', 'OVERSPEED', 'LOW_BATTERY', 'SOS', 'IGNITION_ON'];

interface AlarmState {
  active: boolean;
  guard: boolean;
  unitIds: string[];
}

interface AlarmContextValue extends AlarmState {
  save: (next: AlarmState) => void;
  testGuard: () => void;
}

const AlarmContext = createContext<AlarmContextValue | undefined>(undefined);

function eventUnitId(e: TrackingEvent): string | undefined {
  return e.gpsDevice?.vehicleId || e.gpsDevice?.machineId;
}

export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [state, setState] = useState<AlarmState>({ active: false, guard: false, unitIds: [] });
  const [ringing, setRinging] = useState<{ event: TrackingEvent; count: number } | null>(null);
  const since = useRef(new Date().toISOString());
  const seen = useRef(new Set<string>());

  useEffect(() => {
    storage.get(ALARM_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        setState({ active: !!saved.active, guard: !!saved.guard, unitIds: saved.unitIds || [] });
      } catch {}
    });
  }, []);

  const save = useCallback((next: AlarmState) => {
    setState(next);
    since.current = new Date().toISOString();
    storage.set(ALARM_KEY, JSON.stringify(next));
  }, []);

  const ring = useCallback((event: TrackingEvent, count: number) => {
    setRinging({ event, count });
    startGuardSiren().catch(() => {});
  }, []);

  const stop = useCallback(() => {
    stopGuardSiren();
    setRinging(null);
  }, []);

  const testGuard = useCallback(() => {
    ring(
      { id: 'test', type: 'SOS', severity: 'CRITICAL', timestamp: new Date().toISOString(), unitName: 'Prueba de modo guarda' },
      1
    );
  }, [ring]);

  useEffect(() => {
    if (!state.active || !state.unitIds.length) return;
    const watched = new Set(state.unitIds);
    const check = async () => {
      try {
        const res = await api.events.list({ startDate: since.current, limit: '50' });
        const hits = res.data.filter((e) => {
          const unitId = eventUnitId(e);
          return !!unitId && watched.has(unitId) && WATCHED_TYPES.includes(e.type) && !seen.current.has(e.id);
        });
        hits.forEach((e) => seen.current.add(e.id));
        if (!hits.length) return;
        const first = hits[0];
        if (state.guard) {
          ring(first, hits.length);
          return;
        }
        toast(
          hits.length === 1 ? `Alarma: ${eventTypeLabel(first.type)} · ${first.unitName || 'Unidad'}` : `Alarma: ${hits.length} eventos nuevos en tus unidades`,
          'error'
        );
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } catch {}
    };
    const id = setInterval(check, POLL_MS);
    return () => clearInterval(id);
  }, [state, toast, ring]);

  useEffect(() => () => stopGuardSiren(), []);

  const value = useMemo(() => ({ ...state, save, testGuard }), [state, save, testGuard]);
  return (
    <AlarmContext.Provider value={value}>
      {children}
      <GuardAlertOverlay event={ringing?.event || null} count={ringing?.count || 0} onStop={stop} />
    </AlarmContext.Provider>
  );
}

export function useAlarm() {
  const ctx = useContext(AlarmContext);
  if (!ctx) throw new Error('useAlarm must be used within AlarmProvider');
  return ctx;
}
