import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { MAPLIBRE_CSS, MAPLIBRE_JS, MAP_ENGINE_SOURCE } from './mapEngine';
import type { FleetMapProps, MapEngineInstance } from './types';
import { useEngineState } from './useEngineState';

let enginePromise: Promise<void> | null = null;

function loadEngine(): Promise<void> {
  if (enginePromise) return enginePromise;
  enginePromise = new Promise<void>((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = MAPLIBRE_CSS;
    document.head.appendChild(css);

    const script = document.createElement('script');
    script.src = MAPLIBRE_JS;
    script.async = true;
    script.onload = () => {
      const engine = document.createElement('script');
      engine.text = MAP_ENGINE_SOURCE;
      document.head.appendChild(engine);
      resolve();
    };
    script.onerror = () => {
      enginePromise = null;
      reject(new Error('No se pudo cargar MapLibre'));
    };
    document.head.appendChild(script);
  });
  return enginePromise;
}

export default function FleetMap(props: FleetMapProps) {
  const containerRef = useRef<React.ComponentRef<typeof View>>(null);
  const engineRef = useRef<MapEngineInstance | null>(null);
  const { state, handleMessage } = useEngineState(props);
  const stateRef = useRef(state);
  stateRef.current = state;
  const handleRef = useRef(handleMessage);
  handleRef.current = handleMessage;

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    loadEngine().then(() => {
      const el = containerRef.current as unknown as HTMLElement | null;
      if (cancelled || !el) return;
      const engine: MapEngineInstance = (window as any).FloaMapEngine.create(el, (msg: any) => handleRef.current(msg));
      engineRef.current = engine;
      engine.update(stateRef.current);
      observer = new ResizeObserver(() => engine.resize());
      observer.observe(el);
    });
    return () => {
      cancelled = true;
      observer?.disconnect();
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.update(state);
  }, [state]);

  return <View ref={containerRef} style={[{ flex: 1, overflow: 'hidden' }, props.style]} />;
}
