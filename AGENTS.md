# Floa GPS - Fleet Tracking System

## Flujo de Trabajo (IMPORTANTE)
- **TODOS los cambios de desarrollo se hacen en la rama `develop`.** Nunca editar `main` directamente.
- **`main` = producción estable.** Solo se actualiza haciendo **merge de `develop` → `main`** cuando el trabajo está listo y verificado.
- Producción solo refleja lo que existe en `main`. No se despliega a producción hasta hacer el merge.
- Para revisar cambios en curso, desplegar una búsqueda/preview desde `develop`, nunca tocar la producción de `main`.

## App activa: `mobile/` (IMPORTANTE)
- La app se llama **floaGPS** y es hecha por **TechPoint Software** (`mobile/src/lib/brand.ts`).
- **La única app cliente es `mobile/`** (Expo + React Native + React Native Web). Corre en iOS, Android y web/PWA desde el mismo código.
- El backend sirve el build web de `mobile/dist` (`npx expo export -p web`).

## Estilo de Código (IMPORTANTE)
- **No escribir comentarios en `mobile/`.** Ni de línea (`//`), ni de bloque (`/* */`), ni JSX (`{/* */}`), ni JSDoc. El código debe explicarse solo con nombres claros.
- Excepción: la directiva `/// <reference types="nativewind/types" />` de `nativewind-env.d.ts` es obligatoria y se conserva.
- No agregar código muerto, exports sin usar ni helpers obsoletos: si algo no se usa, se elimina.
- **Estructura por sección**: cada pantalla vive en `src/app/<grupo>/<seccion>/index.tsx`; los componentes exclusivos de una sección van en `src/components/<seccion>/`. Lo compartido va en `components/shared/`, `components/events/`, `components/ui.tsx`.
- Diseño plano y sobrio: sin degradados ni colores saturados.

## Tech Stack
- **App (`mobile/`)**: Expo SDK 58 + Expo Router + React Native 0.88 + React Native Web + TypeScript + NativeWind 4 (Tailwind 3, `darkMode: 'class'` obligatorio para web)
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Database**: PostgreSQL
  - Local dev: `floa-gps` (localhost:5432, user postgres)
  - Production: Neon (us-east-2)
- **Backend auth**: JWT + bcrypt (protected routes)
- **Maps**: nativo (`react-native-maps`: Apple Maps en iOS, Google Maps en Android) y MapLibre GL en web
- **Icons**: lucide-react-native

## Project Structure
```
floa-gps/
├── mobile/            # App universal (web :8081, iOS/Android con Expo)
│   ├── public/                         # index.html, manifest.json, sw.js, íconos PWA
│   └── src/
│       ├── app/
│       │   ├── login/                  # Login de empresas (?empresa=slug)
│       │   ├── owner-login/ owner-panel/  # Consola de Dueño (solo web)
│       │   └── (app)/<seccion>/        # dashboard, live-map, fleet, units, tracking, geofences,
│       │                               # reports, notifications, more, config, profile, help
│       ├── components/<seccion>/       # Componentes exclusivos por sección
│       ├── components/map/             # FleetMap.native.tsx / FleetMap.web.tsx
│       ├── components/owner/           # Consola de Dueño (*.web.tsx solo en web)
│       ├── context/                    # Auth, Theme, Toast, Alarm
│       ├── hooks/                      # useApi, useFleet, useIsDesktop
│       └── lib/                        # api, types, format, storage, exporters
└── backend/           # Express API (port 3001)
    ├── prisma/                         # schema.prisma + seed.ts
    └── src/                            # routes, controllers, services, middleware
```

## Credenciales locales (después de `npx prisma db seed`)
- **Email**: admin@floagps.com
- **Password**: Floa2026!Admin

## Design System
### Brand Colors
- **Navy**: `#032347` (botones primarios, estados activos en modo claro)
- **Orange**: `#f87203` (acento, puntos de notificación, filtros activos, activo en modo oscuro)
- **Marca**: wordmark floaGPS en `mobile/src/components/brand/Wordmark.tsx` (pin + "floa" + "GPS" en naranja)

### Dark Mode
- Background: `#131316` (suave, no negro puro)
- Cards/Sidebar: `#1b1b1f`
- Hovers/Inputs: `#232329`
- Borders: `#33343c`
- Modals: `#202024` / Active option: `#2a2b31`

### Light Mode
- Background: `#f5f5f7` / Cards: `#ffffff` / Borders: `#e5e5e5`

### Typography
- Font: -apple-system, SF Pro Display stack
- Body: `text-[13px]`, Labels: `text-[11px]`, Headings: `text-base/text-[15px]`
- Cards: `rounded-2xl`, Buttons: `rounded-xl`, Pills: `rounded-full`

## Navegación
- Un solo menú principal. < 1024px: barra inferior (Inicio, Compartir, **Mapa al centro destacado**, Apagar, Más) + navbar superior mínima (tema, alertas, perfil).
- ≥ 1024px: sidebar azul marino (`OnNavyTheme`) con secciones plegables y desplazables: Inicio · Operación (Mapa en vivo, Compartir, Apagar) · Flota (Unidades, Geocercas, Alertas) · Análisis (Reportes) · Administración (Usuarios [admin], Configuración, Ayuda). La sección de la página activa siempre queda abierta; las plegadas se recuerdan (`floa_sidebar_closed`). Se puede colapsar a solo íconos.
- Compartir (`/share`) y Apagar (`/engine`): selección múltiple de unidades; Apagar abre la doble confirmación.
- Más: Alertas, Flota (con alta de unidad), Geocercas (ver/crear), Reportes, Usuarios [admin]; Cuenta: Perfil, Configuración, Ayuda.
- Mapa: pide la ubicación del usuario (punto azul). Botones solo a la derecha, mismo estilo y sin texto: capas, ver todo, mi ubicación, ruta hacia una unidad, modo alarma. Al tocar una unidad: Seguir, Ruta de hoy, Historial (`/tracking`), Cómo llegar, Compartir, Motor.
- Login (completo, centrado en web y celular) y barra superior usan fondo azul marino con `components/brand/AnimatedBackdrop.tsx` (variante `full` en login: ruta, pulsos de radar, puntos y un carro; variante `bar` en la barra: línea punteada y pulsos). `OnNavyTheme` fuerza la paleta oscura sobre el azul. El resto de la app usa tarjetas normales y solo la paleta del sistema (navy/naranja/neutros), sin colores decorativos.
- Icono del sistema: el símbolo del logo FLOA (`assets/images/brand-mark*.png`), usado en la marca floaGPS, ícono de app, favicon y PWA.
- Todas las listas usan paginación (`hooks/usePagination.ts` + `components/shared/Pagination.tsx`).
- Usuarios de empresa: el admin solo crea Operador o Solo lectura; el admin de cada empresa lo crea el dueño desde la consola. La cuenta root (superadmin) nunca aparece en listas.
- Unidades: estilo Didi/Rappi vista desde arriba (`components/map/vehicleSvg.ts`): sedán para vehículos y pickup/camión para maquinaria, color por estado, rota con el rumbo; el nombre solo aparece en la seleccionada. No hay modelos 3D.
- Contraseñas: mínimo 10 caracteres con mayúscula, minúscula, número y símbolo (12 para el dueño). Se valida en `backend/src/utils/passwordPolicy.ts` y la app muestra la misma lista.

## Consola de Dueño (SuperAdmin)
- Solo web: `/owner-login` y `/owner-panel` cargan `components/owner/*Screen.web.tsx`; en nativo el mismo import resuelve a un stub que redirige a `/login`, así el bundle móvil no incluye la consola.
- El login de clientes rechaza cuentas `superadmin`; en nativo nunca se restaura una sesión de dueño.
- Modo Soporte: el dueño entra a una empresa (header `x-support-company-id`); un banner permite volver al panel.
- Backend: clave maestra (`OWNER_MASTER_KEY`), rate limit, JWT `scope: 'owner_portal'` de 8 h y bitácora `OwnerAuditLog`.

## Mapas
- `components/map/types.ts` define la interfaz única (`markers`, `routes`, `circles`, `points`, `camera`, `follow`, `layer`, `onMarkerPress`, `onMove`, `onUserPan`). Las pantallas no saben qué motor hay debajo.
- Nativo (`FleetMap.native.tsx`): `react-native-maps`. Funciona en Expo Go sin API key. Para builds de tienda, agregar el plugin `react-native-maps` con `androidGoogleMapsApiKey` en la config (mostrar el mapa con el SDK móvil de Google no tiene costo por carga).
- Web (`FleetMap.web.tsx`): MapLibre 5 UMD desde jsDelivr ejecutando `mapEngine.ts`. Estilos OpenFreeMap Positron, CartoDB Dark Matter y Esri satélite.
- Contrato de coordenadas: `lat`/`lng` explícitos; las rutas usan `[lat, lng]`.
- Ruta hacia una unidad: `lib/routing.ts` usa OSRM (`EXPO_PUBLIC_OSRM_URL`, por defecto el servidor público de demostración de OSRM, sin API key) y cae a línea recta si falla. Para producción conviene un OSRM propio u OpenRouteService.
- En listas y paneles de unidad se muestran los **km recorridos hoy** (`kmToday`, de `todaySession`), no la velocidad.

## Horario laboral, km fuera de horario y modo guarda
- Cada empresa tiene horario laboral (`Company.workStartHour/workEndHour/workDays`, por defecto L–S 7:00–19:00). `GET/PUT /api/company/schedule` (PUT solo admin); se edita en Configuración.
- `GET /api/reports/off-hours?startDate&endDate` calcula km recorridos fuera de ese horario por unidad (segmentos que empiezan fuera de horario, ignorando huecos > 30 min).
- Se muestran tiempo de motor, ralentí y km fuera de horario en Inicio, el panel de la unidad en el mapa, el detalle de la unidad y Reportes (incluye exportación).
- Modo guarda (dentro de Modo alarma): ante un evento de una unidad vigilada abre una alerta a pantalla completa con sirena en bucle (`assets/sounds/guard-alarm.wav`, `expo-audio` con `playsInSilentMode`) y vibración hasta que el usuario la detiene. Funciona con la app abierta; con la app cerrada haría falta push desde el backend.

## Recuperar contraseña
- `POST /api/auth/forgot-password` genera un código de 6 dígitos (vence en 15 min, guardado con HMAC) y lo envía por correo con Resend. **No cambia la contraseña.** Máximo 5 solicitudes por IP/correo cada 15 min.
- `POST /api/auth/reset-password` valida código (5 intentos) + política de contraseña, cambia la contraseña y cierra las demás sesiones.
- Correo: `RESEND_API_KEY` y `EMAIL_FROM` (dominio verificado en Resend). Sin API key, en desarrollo el código se imprime en la consola del backend (`[EMAIL-DEV]`).

## Seguridad de comandos
- Paro/Reanudación de motor: doble paso (selección + biometría en nativo o contraseña). El backend verifica `password` en `/api/commands/engine-stop` cuando se envía (403 si es incorrecta, con rate limit).

## Key Decisions
- El antiguo `frontend/` (React + Vite) se eliminó; `mobile/` es el único frontend (web, iOS y Android).
- Mapas nativos en celular (gratis), MapLibre en web (gratis, sin API key).
- PostgreSQL (Neon prod + Postgres local dev).
- Se eliminó todo lo de Vercel; el proyecto ya no se despliega ahí.

## Run Commands
```bash
# Backend (API en :3001)
cd backend && npx ts-node-dev --transpile-only src/index.ts

# App (web en :8081 + QR para Expo Go en el celular)
cd mobile && npx expo start

# Build web servido por el backend
cd mobile && npx expo export -p web

# TypeScript check
cd mobile && npx tsc --noEmit
cd backend && npx tsc --noEmit

# Re-seed database (borra datos locales)
cd backend && npx prisma db seed
```

## npm Path (Windows)
```powershell
$env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```
Or use full path: `"C:\Program Files\nodejs\npm.cmd"` / `"C:\Program Files\nodejs\npx.cmd"`
