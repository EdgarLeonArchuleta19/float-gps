# Float GPS - Fleet Tracking System

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Database**: SQLite (file: `backend/prisma/dev.db`)
- **Maps**: Leaflet + CartoDB tiles (no API key needed)
- **Icons**: lucide-react

## Project Structure
```
Default Project/
├── frontend/          # React app (port 5173)
│   ├── src/
│   │   ├── assets/logo-float.png
│   │   ├── components/
│   │   │   ├── layout/Layout.tsx      # Sidebar + header + dark mode
│   │   │   └── map/LeafletMap.tsx     # Vanilla Leaflet map (no react-leaflet)
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
│   │   ├── schema.prisma              # SQLite schema
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
- Background: `#0a0a0a`
- Cards: `#111`
- Borders: `#222`
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

## LeafletMap Component
- Uses vanilla Leaflet with `useRef`/`useEffect` (NOT react-leaflet)
- Tiles: CartoDB Voyager (light) / CartoDB Dark (dark)
- Props: `markers`, `polyline`, `circles`, `fitBounds`, `dark`
- Markers support `vehicleType: 'vehicle' | 'machine'` for SVG icons
- Markers have permanent name tooltip labels

## Key Decisions
- Switched from PostgreSQL to SQLite (install issues)
- Switched from Google Maps to Leaflet (free, no API key)
- Switched from react-leaflet to vanilla Leaflet (React 18 compat issue)
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
