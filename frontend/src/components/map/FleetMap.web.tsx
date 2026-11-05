import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { MAPLIBRE_CSS, MAPLIBRE_CSS_INTEGRITY, MAPLIBRE_JS, MAPLIBRE_JS_INTEGRITY, MAP_ENGINE_JS } from './mapEngine';
import type { FleetMapProps, MapEngineInstance } from './types';
import { useEngineState } from './useEngineState';

let enginePromise: Promise<void> | null = null;

function loadScript(src: string, integrity?: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    if (integrity) {
      script.integrity = integrity;
      script.crossOrigin = 'anonymous';
    }
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar MapLibre'));
    document.head.appendChild(script);
  });
}

function loadEngine(): Promise<void> {
  if (enginePromise) return enginePromise;
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = MAPLIBRE_CSS;
  css.integrity = MAPLIBRE_CSS_INTEGRITY;
  css.crossOrigin = 'anonymous';
  document.head.appendChild(css);
  enginePromise = loadScript(MAPLIBRE_JS, MAPLIBRE_JS_INTEGRITY)
    .then(() => loadScript(MAP_ENGINE_JS))
    .catch((err) => {
      enginePromise = null;
      throw err;
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
