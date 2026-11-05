# Floa GPS - Fleet Tracking System

## Flujo de Trabajo (IMPORTANTE)
- **TODOS los cambios de desarrollo se hacen en la rama `develop`.** Nunca editar `main` directamente.
- **`main` = producción estable.** Solo se actualiza haciendo **merge de `develop` → `main`** cuando el trabajo está listo y verificado.
- Producción solo refleja lo que existe en `main`. No se despliega a producción hasta hacer el merge.
- Para revisar cambios en curso, desplegar una búsqueda/preview desde `develop`, nunca tocar la producción de `main`.

## App activa: `frontend/` (IMPORTANTE)
- La app se llama **floaGPS** y es hecha por **TechPoint Software** (`frontend/src/lib/brand.ts`).
- **La única app cliente es `frontend/`** (Expo + React Native + React Native Web). Corre en iOS, Android y web/PWA desde el mismo código.
- El backend sirve el build web de `frontend/dist` (`npx expo export -p web`).

## Estilo de Código (IMPORTANTE)
- **No escribir comentarios en `frontend/`.** Ni de línea (`//`), ni de bloque (`/* */`), ni JSX (`{/* */}`), ni JSDoc. El código debe explicarse solo con nombres claros.
- Excepción: la directiva `/// <reference types="nativewind/types" />` de `nativewind-env.d.ts` es obligatoria y se conserva.
- No agregar código muerto, exports sin usar ni helpers obsoletos: si algo no se usa, se elimina.
- **Estructura por sección**: cada pantalla vive en `src/app/<grupo>/<seccion>/index.tsx`; los componentes exclusivos de una sección van en `src/components/<seccion>/`. Lo compartido va en `components/shared/`, `components/events/`, `components/ui.tsx`.
- Diseño plano y sobrio: sin degradados ni colores saturados.

## Tech Stack
- **App (`frontend/`)**: Expo SDK 58 + Expo Router + React Native 0.88 + React Native Web + TypeScript + NativeWind 4 (Tailwind 3, `darkMode: 'class'` obligatorio para web)
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
├── frontend/          # App universal (web :8081, iOS/Android con Expo)
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
- **Marca**: wordmark floaGPS en `frontend/src/components/brand/Wordmark.tsx` (pin + "floa" + "GPS" en naranja)

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
- ≥ 1024px: sidebar blanco (tarjeta en modo oscuro) con las mismas 5 opciones de la barra inferior (`MAIN_TABS` en `components/layout/navItems.ts`), sin submenús; Más abre la misma pantalla de opciones y configuración que en el celular. Se puede colapsar a solo íconos.
- La pantalla de inicio después del login (web y celular) es el Mapa (`/live-map`, `lib/session.ts`).
- Compartir (`/share`) y Apagar (`/engine`): selección múltiple de unidades; Apagar abre la doble confirmación.
- Más: Alertas, Flota (alta y edición de vehículos), Geocercas (ver/crear/editar), Reportes; Administración [admin]: Usuarios, Roles; Cuenta: Perfil, Configuración, Ayuda. Cada opción se muestra según los permisos del rol.
- Geocercas: al crear, el mapa arranca en la ubicación del usuario (o Culiacán si no hay permiso); 20 colores en páginas de 10 (`components/geofences/GeofenceForm.tsx`, compartido por `new` y `[id]`).
- Mapa: pide la ubicación del usuario (punto azul). Botones solo a la derecha, mismo estilo y sin texto: capas, ver todo, mi ubicación, ruta hacia una unidad, modo alarma. Al tocar una unidad: Seguir, Ruta de hoy, Historial (`/tracking`), Cómo llegar, Compartir, Motor.
- Login (completo, centrado en web y celular) y la barra superior del celular usan fondo azul marino con `components/brand/AnimatedBackdrop.tsx` (variante `full` en login: ruta, pulsos de radar, puntos y un carro; variante `bar` en la barra móvil: línea punteada y pulsos). En web (≥ 1024px) la barra superior es blanca (tarjeta en modo oscuro) con el nombre de la empresa, sin ícono. `OnNavyTheme` fuerza la paleta oscura sobre el azul. El resto de la app usa tarjetas normales y solo la paleta del sistema (navy/naranja/neutros), sin colores decorativos.
- Icono del sistema: el símbolo del logo FLOA (`assets/images/brand-mark*.png`), usado en la marca floaGPS, ícono de app, favicon y PWA.
- Todas las listas usan paginación (`hooks/usePagination.ts` + `components/shared/Pagination.tsx`), visible siempre que haya elementos.
- Filtros de listas como select compacto (`components/shared/FilterSelect.tsx`, abre una hoja con opciones y conteos), nunca filas de chips. Los chips solo quedan para elegir valores dentro de formularios y los filtros rápidos del mapa.
- Confirmaciones con el modal propio `useConfirm()` (`context/ConfirmContext.tsx`), igual en web y celular; nunca `window.confirm` ni `Alert.alert`.
- Acciones de fila solo con ícono (`ActionIcon` en `components/shared/LifecycleActions.tsx`) y siempre con confirmación; en Flota van a la derecha de cada unidad (editar, desactivar / reactivar, borrar).
- Las subpantallas (`PageHeader back`) muestran el botón de regresar también en web.
- Crear usuario pide la contraseña dos veces.
- Usuarios de empresa: el primer admin de cada empresa lo crea el dueño desde la consola. Cada usuario **debe** tener un rol de la empresa (`roleId`, se elige con un select); asignar el rol predeterminado Administrador lo hace `role: 'admin'`, cualquier otro `role: 'member'`. Nadie puede cambiar su propio rol y la empresa siempre conserva al menos un admin. Cambiar el rol de un admin invalida su sesión. Usuarios tiene búsqueda, filtro por rol y paginación; tocar un usuario permite editar nombre y rol. La cuenta root (superadmin) nunca aparece en listas.
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
- Web (`FleetMap.web.tsx`): MapLibre 5 UMD desde jsDelivr (con `integrity` SRI, definidos en `mapEngine.ts`; si se cambia la versión hay que recalcular los hashes) y luego `public/map-engine.js` como archivo propio (nunca script inline, por la CSP). Estilos OpenFreeMap Positron, CartoDB Dark Matter y Esri satélite.
- Contrato de coordenadas: `lat`/`lng` explícitos; las rutas usan `[lat, lng]`.
- Ruta hacia una unidad: `lib/routing.ts` usa OSRM (`EXPO_PUBLIC_OSRM_URL`, por defecto el servidor público de demostración de OSRM, sin API key) y cae a línea recta si falla. Para producción conviene un OSRM propio u OpenRouteService.
- En listas y paneles de unidad se muestran los **km recorridos hoy** (`kmToday`, de `todaySession`), no la velocidad.

## Horario laboral, km fuera de horario y modo guarda
- Cada empresa tiene horario laboral (`Company.workStartHour/workEndHour/workDays`, por defecto L–S 7:00–19:00). `GET/PUT /api/company/schedule` (PUT solo admin); se edita en Configuración.
- `GET /api/reports/off-hours?startDate&endDate` calcula km recorridos fuera de ese horario por unidad (segmentos que empiezan fuera de horario, ignorando huecos > 30 min).
- Se muestran tiempo de motor, ralentí y km fuera de horario en Inicio, el panel de la unidad en el mapa, el detalle de la unidad y Reportes (incluye exportación).
- Modo guarda (dentro de Modo alarma): ante un evento de una unidad vigilada abre una alerta a pantalla completa con sirena en bucle (`assets/sounds/guard-alarm.wav`, `expo-audio` con `playsInSilentMode`) y vibración hasta que el usuario la detiene. Funciona con la app abierta; con la app cerrada haría falta push desde el backend.

## Datos de la empresa
- `Company` guarda nombre comercial, razón social, RFC, correo, teléfono, dirección, sitio web y `logo` (data URL PNG/JPG/WEBP, máximo ~500 KB).
- `GET/PUT /api/company/profile` (PUT solo admin). Se edita en Configuración (`components/config/CompanyProfileCard.tsx`, logo con `expo-image-picker`). Al guardar, el nombre se actualiza en la sesión (`renameCompany`).

## Recuperar contraseña
- `POST /api/auth/forgot-password` genera un código de 6 dígitos (vence en 15 min, guardado con HMAC) y lo envía por correo con Resend. **No cambia la contraseña.** Máximo 5 solicitudes por IP/correo cada 15 min.
- `POST /api/auth/reset-password` valida código (5 intentos) + política de contraseña, cambia la contraseña y cierra las demás sesiones.
- Correo: `RESEND_API_KEY` y `EMAIL_FROM` (dominio verificado en Resend). Sin API key, en desarrollo el código se imprime en la consola del backend (`[EMAIL-DEV]`).

## Acceso por empresa y unidades
- Toda cuenta que no sea el dueño debe tener `companyId`; `authRequired` rechaza (403) las que no lo tengan.
- Roles predeterminados (`Role.systemKey`: `admin` Administrador, `operator` Operador, `viewer` Solo lectura; `services/systemRoles.ts`): existen en cada empresa (se crean al arrancar el backend, al crear empresa y al listar roles), se pueden asignar pero no editar ni borrar (403).
- Roles personalizados (`Role` + `RoleUnit`, CRUD en `/api/roles`, solo admin; pantallas en `app/(app)/roles/`): nombre, permisos (`dashboard`, `share`, `engine`, `alerts`, `fleet`, `geofences`, `reports`; el mapa, perfil y ayuda siempre están) y unidades (todas o solo algunas). No se puede borrar un rol con usuarios.
- Los permisos se leen en cada petición (`authRequired` → `tenant.permissions`, `null` = admin/dueño) y se aplican con `permissionRequired(...)` en el backend; en la app con `useCan()` (menú, Más, botones del mapa y del detalle) y `ROUTE_PERMISSIONS` en `lib/permissions.ts` (AppShell redirige al mapa). La app refresca permisos con `GET /api/auth/me` cada 2 min.
- Un usuario con rol limitado a algunas unidades solo ve esas unidades en listas, detalle, Inicio, alertas y reportes. Los filtros se arman con `services/unitAccess.ts` (`linkedUnitFilter`, `gpsDeviceFilter`, `canAccessUnit`, `canAccessGpsDevice`); cualquier consulta nueva ligada a unidades debe usarlos.

## Integridad de datos: nada se borra de la base
- Ciclo de vida para usuarios, unidades (vehículos y maquinaria), geocercas y roles: **Activo → Desactivado → Borrado**. En la app solo se ve el ícono de desactivar; ya desactivado aparecen reactivar y borrar (`components/shared/LifecycleActions.tsx`, cada uno con modal de confirmación; borrar advierte que para recuperarlo hay que contactar a soporte). Las listas tienen el select Estado: Activos/Desactivados (`components/shared/StatusFilter.tsx`).
- Borrar = `deletedAt` (soft delete). El backend exige desactivar antes de borrar (409) y nunca hace `delete` sobre estos modelos, empresas ni GPS. Toda consulta de la app filtra `deletedAt: null`.
- Desactivado: usuario no puede entrar (se cierran sus sesiones); unidad y geocerca no aparecen en el mapa ni a usuarios normales (el admin las ve para administrarlas); un rol desactivado no se puede asignar. Un rol solo se desactiva o borra si no tiene usuarios. Los GPS siguen recibiendo posiciones aunque su unidad esté desactivada o borrada.
- Consola de dueño → pestaña **Eliminados** (`/api/owner/trash`, `services/trash.service.ts`): lista lo borrado de todas las empresas y lo restaura (queda desactivado). Eliminar empresa, usuario o GPS desde la consola también es soft delete.
- Nombres de rol únicos por empresa sin importar mayúsculas, acentos ni espacios (`Role.nameKey`, `utils/nameKey.ts`). Al borrar un rol su nombre queda libre; al restaurarlo se valida que no choque.

## Validación de entrada
- Vehículos y geocercas pasan por listas blancas con validación de tipo y rango (`utils/validate.ts`): el color de geocerca solo acepta `#RRGGBB`, radio 50 m–50 km, coordenadas válidas, año 1950–2100, estado de una lista fija. La paginación se acota con `utils/pagination.ts` (máx. 500) y el orden solo por campos permitidos.
- Detalle de unidad (`GET /vehicles/:id`, `/machines/:id`) exige `fleet`; Inicio (`/api/dashboard`) exige `dashboard` o `alerts`. La lista de unidades queda abierta porque el mapa la necesita.

## Seguridad web y de sesión
- CSP en `backend/src/app.ts`: solo scripts propios y de jsDelivr, sin scripts inline (por eso `public/register-sw.js` y `public/map-engine.js` son archivos). Si se agrega un proveedor de mapas o un API en otro dominio, añadirlo a la CSP (o `CSP_CONNECT_SRC`).
- CORS: en producción sin `CORS_ORIGINS` solo se aceptan llamadas del mismo origen. Sin cookies (`credentials: false`).
- `trust proxy` por defecto solo confía en IPs privadas/loopback (el proxy inverso); se cambia con `TRUST_PROXY`. El API nunca debe quedar expuesto directo a internet.
- Login: límite por IP (8 / 10 min) y por cuenta más alto (30 / 30 min) para que un extraño no bloquee a otro usuario.
- Cambiar contraseña sube `tokenVersion` (cierra las demás sesiones) y devuelve un token nuevo para el dispositivo actual (`replaceToken`); contraseña actual incorrecta responde 400 con límite de intentos.
- Tracker TCP propio (`scripts/tracker.ts`, solo desarrollo): máximo de conexiones, buffer por conexión acotado y capturas apagadas en producción.

## Seguridad de comandos
- Paro/Reanudación de motor: doble paso (selección + contraseña). El backend **siempre** exige `password` en `/api/commands/engine-stop` (403 si falta o es incorrecta, con rate limit) y verifica la unidad con `services/unitAccess.ts` (misma empresa; si su rol está limitado, solo esas unidades) y el permiso `engine`. En nativo, la huella/Face ID solo desbloquea la contraseña guardada en el llavero con `requireAuthentication` (`lib/engineCredential.*`); se guarda tras confirmar con contraseña y se borra al cerrar sesión o cambiar contraseña.
- `/api/gps/:id/{positions,tracking,latest}` pasan por `canAccessGpsDevice` (404 si el GPS es de otra empresa o de una unidad no asignada). El alta/vinculación de GPS solo existe en la consola de dueño (`/api/owner/gps`).
- Webhook de Traccar (`/api/ingest/traccar`): en producción el backend no arranca sin `TRACCAR_WEBHOOK_SECRET` (mínimo 24 caracteres) y rechaza peticiones sin el token (`x-floa-token` o `?token=`). En `infra/`, Traccar recibe la URL con el secreto por variables de entorno, nunca escrita en `traccar.xml`.

## Key Decisions
- El antiguo frontend de React + Vite se eliminó; la app Expo (antes `frontend/`) se renombró a `frontend/` y es el único cliente (web, iOS y Android).
- Mapas nativos en celular (gratis), MapLibre en web (gratis, sin API key).
- PostgreSQL (Neon prod + Postgres local dev).
- Se eliminó todo lo de Vercel; el proyecto ya no se despliega ahí.

## Run Commands
```bash
# Backend (API en :3001)
cd backend && npx ts-node-dev --transpile-only src/index.ts

# App (web en :8081 + QR para Expo Go en el celular)
cd frontend && npx expo start

# Build web servido por el backend
cd frontend && npx expo export -p web

# TypeScript check
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit

# Aplicar cambios de schema (no hay carpeta de migraciones; detener el backend antes en Windows)
cd backend && npx prisma db push

# Re-seed database (borra datos locales)
cd backend && npx prisma db seed
```

## npm Path (Windows)
```powershell
$env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```
Or use full path: `"C:\Program Files\nodejs\npm.cmd"` / `"C:\Program Files\nodejs\npx.cmd"`
