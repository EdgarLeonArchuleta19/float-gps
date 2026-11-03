const MAPLIBRE_VERSION = '5.24.0';
export const MAPLIBRE_JS = `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
export const MAPLIBRE_CSS = `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;

export const MAP_ENGINE_SOURCE = String.raw`
(function () {
  var STYLES = {
    street: 'https://tiles.openfreemap.org/styles/positron',
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    satellite: {
      version: 8,
      sources: {
        satellite: {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: 'Esri, Maxar, Earthstar Geographics'
        }
      },
      layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }]
    }
  };
  var DEFAULT_CENTER = [-107.394, 24.7994];
  var EMPTY = { type: 'FeatureCollection', features: [] };

  function valid(lat, lng) {
    return isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
  }

  function circleFeature(c) {
    if (!valid(c.lat, c.lng) || !(c.radius > 0)) return null;
    var ring = [];
    var R = 6378137;
    var latRad = c.lat * Math.PI / 180;
    for (var i = 0; i <= 64; i++) {
      var a = (i / 64) * Math.PI * 2;
      var dLat = (c.radius * Math.cos(a) / R) * 180 / Math.PI;
      var dLng = (c.radius * Math.sin(a) / (R * Math.cos(latRad))) * 180 / Math.PI;
      ring.push([c.lng + dLng, c.lat + dLat]);
    }
    return { type: 'Feature', properties: { color: c.color || '#f87203' }, geometry: { type: 'Polygon', coordinates: [ring] } };
  }

  function routeFeature(r) {
    var coords = (r.path || []).filter(function (p) { return valid(p[0], p[1]); }).map(function (p) { return [p[1], p[0]]; });
    if (coords.length < 2) return null;
    return { type: 'Feature', properties: { color: r.color || '#3b82f6', dashed: !!r.dashed }, geometry: { type: 'LineString', coordinates: coords } };
  }

  function buildMarker(m, emit) {
    var el = document.createElement('div');
    el.style.cssText = 'position:relative;width:34px;height:34px;cursor:pointer;';
    var halo = document.createElement('div');
    halo.style.cssText = 'position:absolute;inset:-4px;border-radius:50%;opacity:0;transition:opacity .2s;pointer-events:none;';
    var body = document.createElement('div');
    body.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transition:transform .5s ease;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));';
    var label = document.createElement('div');
    label.style.cssText = 'position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:2px;background:#1b1b1f;color:#fff;font:600 11px -apple-system,BlinkMacSystemFont,sans-serif;padding:3px 8px;border-radius:999px;white-space:nowrap;border:1px solid #33343c;pointer-events:none;display:none;';
    el.appendChild(halo);
    el.appendChild(body);
    el.appendChild(label);
    el.addEventListener('click', function (ev) {
      ev.stopPropagation();
      emit({ type: 'markerPress', id: m.id });
    });
    var entry = { el: el, halo: halo, body: body, label: label, svg: null, marker: null };
    paintMarker(entry, m);
    return entry;
  }

  function paintMarker(entry, m) {
    if (entry.svg !== m.svg) {
      entry.svg = m.svg;
      entry.body.innerHTML = m.svg.replace('width="28" height="44"', 'width="22" height="34"');
    }
    entry.body.style.transform = 'rotate(' + (m.heading || 0) + 'deg)' + (m.selected ? ' scale(1.2)' : '');
    entry.halo.style.background = m.color + '40';
    entry.halo.style.opacity = m.selected ? '1' : '0';
    entry.label.style.display = m.selected ? 'block' : 'none';
    entry.label.textContent = m.name;
    entry.el.style.zIndex = m.selected ? '10' : '1';
  }

  function create(container, emit) {
    var state = { dark: false, layer: 'street', markers: [], routes: [], circles: [], points: [] };
    var markers = {};
    var pointMarkers = [];
    var lastCamera = null;
    var styleKey = null;
    var loaded = false;

    var map = new maplibregl.Map({
      container: container,
      style: STYLES.street,
      center: DEFAULT_CENTER,
      zoom: 11,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false
    });
    map.touchZoomRotate.disableRotation();

    function addOverlays() {
      if (map.getSource('floa-routes')) return;
      map.addSource('floa-circles', { type: 'geojson', data: EMPTY });
      map.addLayer({ id: 'floa-circles-fill', type: 'fill', source: 'floa-circles', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.14 } });
      map.addLayer({ id: 'floa-circles-line', type: 'line', source: 'floa-circles', paint: { 'line-color': ['get', 'color'], 'line-width': 2 } });
      map.addSource('floa-routes', { type: 'geojson', data: EMPTY });
      map.addLayer({
        id: 'floa-routes', type: 'line', source: 'floa-routes', filter: ['!', ['get', 'dashed']],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': 0.9 }
      });
      map.addLayer({
        id: 'floa-routes-dashed', type: 'line', source: 'floa-routes', filter: ['get', 'dashed'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 3, 'line-dasharray': [2, 2] }
      });
    }

    function syncShapes() {
      if (!loaded || !map.getSource('floa-routes')) return;
      map.getSource('floa-routes').setData({ type: 'FeatureCollection', features: state.routes.map(routeFeature).filter(Boolean) });
      map.getSource('floa-circles').setData({ type: 'FeatureCollection', features: state.circles.map(circleFeature).filter(Boolean) });
    }

    function syncMarkers() {
      var seen = {};
      state.markers.forEach(function (m) {
        if (!valid(m.lat, m.lng)) return;
        seen[m.id] = true;
        var entry = markers[m.id];
        if (!entry) {
          entry = buildMarker(m, emit);
          entry.marker = new maplibregl.Marker({ element: entry.el, anchor: 'center' }).setLngLat([m.lng, m.lat]).addTo(map);
          markers[m.id] = entry;
        } else {
          entry.marker.setLngLat([m.lng, m.lat]);
          paintMarker(entry, m);
        }
      });
      Object.keys(markers).forEach(function (id) {
        if (!seen[id]) {
          markers[id].marker.remove();
          delete markers[id];
        }
      });

      pointMarkers.forEach(function (pm) { pm.remove(); });
      pointMarkers = [];
      state.points.forEach(function (p) {
        if (!valid(p.lat, p.lng)) return;
        var dot = document.createElement('div');
        dot.style.cssText = 'width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);background:' + (p.color || '#f87203') + ';';
        pointMarkers.push(new maplibregl.Marker({ element: dot }).setLngLat([p.lng, p.lat]).addTo(map));
      });
    }

    function boundsOf() {
      var b = new maplibregl.LngLatBounds();
      var any = false;
      state.markers.forEach(function (m) { if (valid(m.lat, m.lng)) { b.extend([m.lng, m.lat]); any = true; } });
      state.routes.forEach(function (r) { (r.path || []).forEach(function (p) { if (valid(p[0], p[1])) { b.extend([p[1], p[0]]); any = true; } }); });
      state.circles.forEach(function (c) {
        var f = circleFeature(c);
        if (f) { f.geometry.coordinates[0].forEach(function (p) { b.extend(p); }); any = true; }
      });
      state.points.forEach(function (p) { if (valid(p.lat, p.lng)) { b.extend([p.lng, p.lat]); any = true; } });
      return any ? b : null;
    }

    function applyCamera() {
      var cam = state.camera;
      if (!cam || cam.key === lastCamera) return;
      lastCamera = cam.key;
      var pad = cam.padding || { top: 60, bottom: 60, left: 40, right: 40 };
      if (cam.type === 'center' && valid(cam.lat, cam.lng)) {
        map.easeTo({ center: [cam.lng, cam.lat], zoom: cam.zoom || Math.max(map.getZoom(), 15), padding: pad, duration: 600 });
        return;
      }
      var b = boundsOf();
      if (!b) return;
      var ne = b.getNorthEast();
      var sw = b.getSouthWest();
      if (ne.lng === sw.lng && ne.lat === sw.lat) {
        map.easeTo({ center: ne, zoom: 15, padding: pad, duration: 600 });
      } else {
        map.fitBounds(b, { padding: pad, maxZoom: 16, duration: 600 });
      }
    }

    function applyFollow() {
      if (!state.follow) return;
      var m = state.markers.filter(function (x) { return x.id === state.follow; })[0];
      if (m && valid(m.lat, m.lng)) {
        map.easeTo({ center: [m.lng, m.lat], padding: (state.camera && state.camera.padding) || undefined, duration: 800 });
      }
    }

    function applyStyle() {
      var key = state.layer === 'satellite' ? 'satellite' : state.dark ? 'dark' : 'street';
      if (key === styleKey) return;
      var first = styleKey === null;
      styleKey = key;
      if (first && key === 'street') return;
      map.setStyle(STYLES[key]);
    }

    map.on('style.load', function () {
      addOverlays();
      syncShapes();
    });

    map.on('load', function () {
      loaded = true;
      addOverlays();
      syncShapes();
      syncMarkers();
      applyCamera();
      emit({ type: 'ready' });
      var c = map.getCenter();
      emit({ type: 'move', lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    });

    map.on('moveend', function () {
      var c = map.getCenter();
      emit({ type: 'move', lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    });

    map.on('dragstart', function (e) {
      if (e.originalEvent) emit({ type: 'userPan' });
    });

    return {
      update: function (next) {
        state = {
          dark: !!next.dark,
          layer: next.layer || 'street',
          markers: next.markers || [],
          routes: next.routes || [],
          circles: next.circles || [],
          points: next.points || [],
          camera: next.camera || null,
          follow: next.follow || null
        };
        applyStyle();
        if (!loaded) return;
        syncShapes();
        syncMarkers();
        applyCamera();
        applyFollow();
      },
      resize: function () { map.resize(); },
      destroy: function () { map.remove(); }
    };
  }

  window.FloaMapEngine = { create: create };
})();
`;
