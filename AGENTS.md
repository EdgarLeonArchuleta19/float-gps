# Floa GPS - Fleet Tracking System

## Flujo de Trabajo (IMPORTANTE)
- **TODOS los cambios de desarrollo se hacen en la rama `develop`.** Nunca editar `main` directamente.
- **`main` = producción estable.** Solo se actualiza haciendo **merge de `develop` → `main`** cuando el trabajo está listo y verificado.
- Producción (Vercel) solo refleja lo que existe en `main`. No se despliega a producción hasta hacer el merge.
- Para revisar cambios en curso, desplegar una búsqueda/preview desde `develop`, nunca tocar la producción de `main`.

## Estilo de Código (IMPORTANTE)
- **No escribir comentarios en el frontend.** Ni de línea (`//`), ni de bloque (`/* */`), ni JSX (`{/* */}`), ni JSDoc. El código debe explicarse solo con nombres claros.
- Excepciones: las directivas `/// <reference ... />` de `vite-env.d.ts` son obligatorias y se conservan.
- No agregar código muerto, exports sin usar ni helpers obsoletos: si algo no se usa, se elimina.

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Database**: PostgreSQL 
  - Local dev: `floa-gps` (localhost:5432, user postgres)
  - Production: Neon (us-east-2)
- **Backend auth**: JWT + bcrypt (protected routes)
- **Maps**: MapLibre GL JS + OpenFreeMap / CartoDB / Esri raster (no API key needed)
- **Icons**: lucide-react

## Project Structure
```
Default Project/
├── frontend/          # React app (port 5173)
│   ├── src/
│   │   ├── assets/logo-floa.png
│   │   ├── components/
│   │   │   ├── layout/Layout.tsx      # Sidebar + header + dark mode
│   │   │   └── map/MapLibreMap.tsx     # Vanilla MapLibre map (no react-leaflet)
│   │   ├── context/
│   │   │   ├── AuthContext.tsx         # Login/auth state
│   │   │   ├── LayoutContext.tsx       # Sidebar + dark mode state
│   │   │   └── ToastContext.tsx        # Toast notifications
│   │   ├── hooks/useApi.ts            # Generic data fetching hook
│   │   ├── pages/                     # All page components
│   │   ├── services/api.ts            # API client (fetch wrapper)
│   │   ├── types/index.ts             # TypeScript interfaces
│   │   └── utils/format.ts            # Date/number/status formatters
│   ├── tailwind.config.js
│   └── vite.config.ts                 # Proxy /api → localhost:3001
│
├── backend/           # Express API (port 3001)
│   ├── prisma/
│   │   ├── schema.prisma              # PostgreSQL schema
│   │   └── seed.ts                    # Seed: 10 vehicles, 8 machines, 18 GPS, ~7 days positions
│   └── src/
│       ├── index.ts                   # Express server entry
│       ├── routes/                    # Express routers
│       ├── controllers/               # Route handlers
│       └── services/                  # Business logic + Prisma queries
```

## Demo Credentials
- **Email**: admin@demo.com
- **Password**: demo123

## Design System
### Brand Colors
- **Navy**: `#032347` (primary buttons, active states - light mode)
- **Orange**: `#f87203` (accent, notification dots, active filters)
- **Logo**: `src/assets/logo-float.png` (removebg version)

### Dark Mode
- Background: `#131316` (suave, no negro puro)
- Cards/Sidebar: `#1b1b1f`
- Hovers/Inputs: `#232329`
- Borders: `#33343c`
- Modals: `#202024` / Active option: `#2a2b31`
- Active nav (dark): orange accent
- Active nav (light): navy accent

### Typography
- Font: -apple-system, SF Pro Display stack
- Body: `text-[13px]`, Labels: `text-[11px]`, Headings: `text-base/text-[15px]`
- Cards: `rounded-2xl`, Buttons: `rounded-xl`, Pills: `rounded-full`

## Routes (Frontend)
| Path | Page | Description |
|------|------|-------------|
| `/login` | Login | Auth page with logo |
| `/dashboard` | Dashboard | KPIs + status bars + recent events |
| `/live-map` | LiveMap | Full-screen map + bottom sheet vehicle list |
| `/fleet` | Fleet | Unified vehicles + machines list + FAB |
| `/units/:id` | UnitDetail | Detail page for any unit |
| `/geofences` | Geofences | Map with circles + list + FAB |
| `/tracking` | Tracking | Historical route playback |
| `/reports` | Reports | Daily/Weekly/Monthly/Hours + Bitácora tab |
| `/notifications` | Notifications | Event feed with filters |
| `/config` | Config | Settings page |

## API Endpoints (Backend)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/dashboard` | Dashboard stats |
| GET | `/api/vehicles` | List vehicles |
| GET | `/api/vehicles/:id` | Vehicle detail |
| PATCH | `/api/vehicles/:id/status` | Update status |
| GET | `/api/machines` | List machines |
| GET | `/api/machines/:id` | Machine detail |
| GET | `/api/gps/:id/positions` | GPS positions |
| GET | `/api/gps/:id/tracking` | Tracking with summary |
| GET | `/api/events` | Events list (type, unitId, date filters) |
| GET | `/api/geofences` | List geofences |
| POST | `/api/geofences` | Create geofence |
| DELETE | `/api/geofences/:id` | Delete geofence |
| GET | `/api/geofences/events` | Geofence events |
| GET | `/api/reports/daily` | Daily report |
| GET | `/api/reports/weekly` | Weekly report |
| GET | `/api/reports/monthly` | Monthly report |
| GET | `/api/reports/hours` | Hours report |
| GET | `/api/reports/events` | Events report |
| POST | `/api/commands/engine-stop` | Engine stop command |

## MapLibreMap Component
- Usa MapLibre GL JS vanilla con `useRef`/`useEffect` (no react-leaflet)
- Estilos: OpenFreeMap Positron (calle), CartoDB Dark Matter (oscuro), Esri World Imagery inline (satélite)
- El worker se sirve como asset estático: `scripts/copy-maplibre-worker.cjs` copia `maplibre-gl-worker.mjs` **y sus imports relativos** a `public/`, y `setupMapLibre.ts` lo registra con `setWorkerUrl`
- Contrato de coordenadas: los props usan `[lat, lng]`; `geo.ts` convierte a `[lng, lat]` en los límites de MapLibre/GeoJSON
- Al cambiar de estilo se escucha `style.load` y se reagregan overlays; nunca dependas de `styledata` ni de un estado `ready` que se autodesprovoque
- Props: `markers`, `polyline`, `polylines`, `circles`, `fitBounds`, `dark`, `layer`
- Markers support `vehicleType: 'vehicle' | 'machine'` for SVG icons

## Key Decisions
- Google Maps no es viable sin API key; se usa MapLibre + tiles gratuitos
- Switched from Leaflet to MapLibre GL JS (mejor control de estilos y rendimiento)
- Switched from SQLite to PostgreSQL (Neon prod + Postgres local dev)
- Removed Events and WorkLog pages (merged into Reports/Bitácora + Notifications)
- Bottom sheet on map is draggable (touch + mouse) with peek/half/full states

## Run Commands
```bash
# Start both servers
cd backend && npx ts-node-dev --transpile-only src/index.ts
cd frontend && npx vite --host

# Rebuild frontend
cd frontend && npx vite build

# Re-seed database
cd backend && npx prisma db seed

# TypeScript check
cd frontend && npx tsc --noEmit
```

## npm Path (Windows)
```powershell
$env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```
Or use full path: `"C:\Program Files\nodejs\npm.cmd"` / `"C:\Program Files\nodejs\npx.cmd"`
