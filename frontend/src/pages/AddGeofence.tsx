import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, MapPin, Search, X } from 'lucide-react';
import { GeoJSONSource, Map as MapLibreInstance, MapMouseEvent, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { circlesGeoJson, toLngLat } from '../components/map/geo';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useLayout } from '../context/LayoutContext';

const GEOFENCE_TYPES = ['Trabajo', 'Almacén', 'Base', 'Zona restringida', 'Otro'];
const COLORS = ['#3B82F6', '#22C55E', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#f87203', '#06B6D4'];
const DEFAULT_CENTER = { lat: 24.7994, lng: -107.3940 };
const STYLE_URL = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};
const CIRCLE_LAYER = 'draft-geofence';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

export default function AddGeofence() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { addToast } = useToast();
  const { darkMode } = useLayout();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  const [name, setName] = useState('');
  const [type, setType] = useState('Trabajo');
  const [color, setColor] = useState('#3B82F6');
  const [diameter, setDiameter] = useState('100');
  const [center, setCenter] = useState(DEFAULT_CENTER);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreInstance | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const flyOnSyncRef = useRef(false);
  const colorRef = useRef(color);
  const [ready, setReady] = useState(false);

  const radius = Math.max((parseFloat(diameter) || 0) / 2, 10);

  const paintCircle = (map: MapLibreInstance) => {
    (map.getSource(CIRCLE_LAYER) as GeoJSONSource | undefined)?.setData(
      circlesGeoJson([{ center: [center.lat, center.lng], radius, color }]),
    );
  };

  useEffect(() => {
    if (isEdit) {
      api.geofences.get(id!).then((g) => {
        setName(g.name || '');
        setType(g.type || 'Trabajo');
        setColor(g.color || '#3B82F6');
        setDiameter(((g.radius ?? 500) * 2).toString());
        const c = { lat: g.centerLat ?? DEFAULT_CENTER.lat, lng: g.centerLng ?? DEFAULT_CENTER.lng };
        setCenter(c);
        flyOnSyncRef.current = true;
        setFetching(false);
      }).catch(() => {
        addToast('error', 'Error al cargar geocerca');
        navigate('/geofences');
      });
    }
  }, [id, isEdit]);

  const addCircleLayer = (map: MapLibreInstance) => {
    if (map.getSource(CIRCLE_LAYER)) return;
    map.addSource(CIRCLE_LAYER, { type: 'geojson', data: circlesGeoJson([]) });
    map.addLayer({
      id: CIRCLE_LAYER,
      type: 'fill',
      source: CIRCLE_LAYER,
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.15 },
    });
    map.addLayer({
      id: `${CIRCLE_LAYER}-line`,
      type: 'line',
      source: CIRCLE_LAYER,
      paint: { 'line-color': ['get', 'color'], 'line-width': 2 },
    });
  };

  useEffect(() => {
    if (!mapDivRef.current) return;

    const map = new MapLibreInstance({
      container: mapDivRef.current,
      style: darkMode ? STYLE_URL.dark : STYLE_URL.light,
      center: toLngLat([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]),
      zoom: 13,
    });

    const el = document.createElement('div');
    el.style.cssText = `width:18px;height:18px;border-radius:50%;background:${colorRef.current};border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,0.4);cursor:grab;`;

    const marker = new Marker({ element: el, draggable: true })
      .setLngLat(toLngLat([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]))
      .addTo(map);

    marker.on('dragend', () => {
      const p = marker.getLngLat();
      setCenter({ lat: p.lat, lng: p.lng });
    });

    map.on('click', (e: MapMouseEvent) => setCenter({ lat: e.lngLat.lat, lng: e.lngLat.lng }));

    map.on('load', () => {
      addCircleLayer(map);
      paintCircle(map);
      setReady(true);
    });

    markerRef.current = marker;
    mapRef.current = map;

    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    map.once('style.load', () => {
      addCircleLayer(map);
      paintCircle(map);
    });
    map.setStyle(darkMode ? STYLE_URL.dark : STYLE_URL.light);
  }, [darkMode, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    marker.setLngLat(toLngLat([center.lat, center.lng]));
    colorRef.current = color;
    marker.getElement().style.background = color;
    paintCircle(map);

    if (flyOnSyncRef.current) {
      map.flyTo({ center: toLngLat([center.lat, center.lng]), zoom: 15 });
      flyOnSyncRef.current = false;
    }
  }, [center, diameter, color, ready]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchOpen(true);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=es&q=${encodeURIComponent(query)}`
      );
      setResults(await r.json());
    } catch {
      addToast('error', 'No se pudo buscar la dirección');
    }
    setSearching(false);
  };

  const selectResult = (r: NominatimResult) => {
    const c = { lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
    setCenter(c);
    mapRef.current?.jumpTo({ center: toLngLat([c.lat, c.lng]), zoom: 16 });
    setResults([]);
    setSearchOpen(false);
    setQuery(r.display_name.split(',')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const dia = parseFloat(diameter);
      const data = {
        name: name.trim(),
        type,
        color,
        radius: !isNaN(dia) ? dia / 2 : null,
        centerLat: center.lat,
        centerLng: center.lng,
      };
      if (isEdit) {
        await api.geofences.update(id!, data);
        addToast('success', 'Geocerca actualizada');
      } else {
        await api.geofences.create(data);
        addToast('success', 'Geocerca creada');
      }
      navigate('/geofences');
    } catch {
      addToast('error', 'Error al guardar');
    }
    setLoading(false);
  };

  const inputClass = `w-full px-4 py-2.5 text-[13px] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#032347]
    ${darkMode ? 'bg-[#232329] text-[#f5f5f7] placeholder-gray-600' : 'bg-[#f5f5f7] text-[#1d1d1f] placeholder-gray-400'}`;
  const labelClass = `block text-xs font-medium mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`;

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#032347]" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/geofences')} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-[#232329]' : 'hover:bg-gray-100'}`}>
          <ArrowLeft className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
        </button>
        <div>
          <h1 className={`text-base font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
            {isEdit ? 'Editar geocerca' : 'Nueva geocerca'}
          </h1>
          <p className={`text-[13px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {isEdit ? 'Actualiza los datos de la geocerca' : 'Elige el punto en el mapa'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl p-5 space-y-4`}>
        {/* Map picker */}
        <div>
          <label className={labelClass}>Ubicación</label>
          <div className={`relative h-[320px] rounded-xl overflow-hidden border ${darkMode ? 'border-[#3c3d46]' : 'border-gray-200'}`}>
            <div ref={mapDivRef} className="absolute inset-0" />

            {/* Street search */}
            <div className="absolute top-2 left-2 right-2 z-[1000]">
              <form onSubmit={handleSearch} className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none z-10 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
                  placeholder="Buscar calle, colonia, ciudad..."
                  className={`w-full pl-10 pr-9 h-[38px] rounded-xl text-[13px] outline-none shadow-lg z-10
                    ${darkMode ? 'bg-[#1b1b1f]/90 backdrop-blur-xl text-white placeholder-gray-600' : 'bg-white/95 backdrop-blur-xl text-[#1d1d1f] placeholder-gray-400'}`}
                />
                {query && (
                  <button type="button" onClick={() => { setQuery(''); setResults([]); setSearchOpen(false); }}
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 z-20 p-1 rounded-full ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>
              {searchOpen && (results.length > 0 || searching) && (
                <div className={`mt-1.5 rounded-xl overflow-hidden shadow-xl ${darkMode ? 'bg-[#232329] border border-[#3c3d46]' : 'bg-white border border-gray-100'}`}>
                  {searching && (
                    <div className={`px-3 py-2.5 text-[12px] flex items-center gap-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando...
                    </div>
                  )}
                  {!searching && results.map((r, i) => (
                    <button key={i} type="button" onClick={() => selectResult(r)}
                      className={`block w-full text-left px-3 py-2 text-[12px] leading-snug transition-colors truncate
                        ${i > 0 ? (darkMode ? 'border-t border-[#33343c]' : 'border-t border-gray-100') : ''}
                        ${darkMode ? 'text-gray-300 hover:bg-[#33343c]' : 'text-gray-700 hover:bg-gray-50'}`}>
                      {r.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Coords chip */}
            <div className="absolute bottom-2 left-2 right-2 z-[1000] flex justify-center pointer-events-none">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium shadow-lg
                ${darkMode ? 'bg-[#1b1b1f]/90 backdrop-blur-xl text-gray-300' : 'bg-white/95 backdrop-blur-xl text-gray-700'}`}>
                <MapPin className="w-3 h-3 text-[#f87203]" />
                {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
              </div>
            </div>
          </div>
          <p className={`mt-1.5 text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Toca el mapa o arrastra el punto para ubicar la geocerca
          </p>
        </div>

        <div>
          <label className={labelClass}>Nombre *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Almacén Central" className={inputClass} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className={`${inputClass} appearance-none`}>
              {GEOFENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Diámetro (metros)</label>
            <input type="number" value={diameter} onChange={(e) => setDiameter(e.target.value)} placeholder="100" min="20" max="20000" step="10" className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-[#032347] scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className={`w-full h-[48px] flex items-center justify-center gap-2 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.98]
            ${darkMode ? 'bg-white text-[#032347] hover:bg-gray-100' : 'bg-[#032347] text-white hover:bg-[#02335a]'}
            disabled:opacity-40`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> {isEdit ? 'Guardar cambios' : 'Crear geocerca'}</>}
        </button>
      </form>
    </div>
  );
}
