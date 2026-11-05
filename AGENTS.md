# Floa GPS - Fleet Tracking System

## Flujo de Trabajo (IMPORTANTE)
- **TODOS los cambios de desarrollo se hacen en la rama `develop`.** Nunca editar `main` directamente.
- **`main` = producción estable.** Solo se actualiza haciendo **merge de `develop` → `main`** cuando el trabajo está listo y verificado.
- Producción solo refleja lo que existe en `main`. No se despliega a producción hasta hacer el merge.
- Para revisar cambios en curso, desplegar una búsqueda/preview desde `develop`, nunca tocar la producción de `main`.

## App activa: `frontend/` (IMPORTANTE)
- La app se llama **floaGPS** y es hecha por **TechPoint Software** (`frontend/src/lib/brand.ts`).
- **La única app cliente es `frontend/`** (Expo + React Native + React Native Web). Corre en iOS, Android y web/PWA desde el mismo código.
- El backend sirve dos builds web (`cd frontend && npm run build:web`): `dist` (app de clientes, sin la consola) y `dist-console` (consola del equipo).

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
- **Maps**: MapLibre en todos lados, sin API keys: MapLibre Native en Android/iOS (`@maplibre/maplibre-react-native`) y MapLibre GL JS en web
- **Icons**: lucide-react-native

## Project Structure
```
floa-gps/
├── frontend/          # App universal (web :8081, iOS/Android con Expo)
│   ├── public/                         # index.html, manifest.json, sw.js, íconos PWA
│   └── src/
│       ├── app/
│       │   ├── login/                  # Login de empresas (?empresa=slug)
│       │   ├── console-login/ console/  # Consola del equipo floaGPS (solo web)
│       │   └── (app)/<seccion>/        # dashboard, live-map, fleet, units, tracking, geofences,
│       │                               # reports, notifications, more, config, profile, help
│       ├── components/<seccion>/       # Componentes exclusivos por sección
│       ├── components/map/             # FleetMap.native.tsx / FleetMap.web.tsx
│       ├── components/console/         # Consola del equipo (*Screen.web.tsx solo en web)
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
- Los dos colores tienen el **mismo papel en modo claro y oscuro** (constantes `NAVY` y `ORANGE` en `lib/brand.ts`); entre temas solo cambian fondos, tarjetas y textos. Nunca intercambiar navy/naranja según `t.isDark`.
- **Navy** `#032347`: rellenos principales (botones `primary`, botón del Mapa, chips y segmentos activos, acciones activas del panel de unidad, barra superior, login, días laborales seleccionados) y el tinte de la píldora seleccionada (`t.selected`).
- **Orange** `#f87203`: acento (ícono/texto sobre la píldora seleccionada `hex.onSelected`, `hex.primary`, foco de campos, enlaces tipo "Seleccionar todas", checks, avatar, badges, rutas en el mapa, barras de km).
- Íconos de filas, accesos y botones redondos, y textos de enlace secundarios ("Ver alertas", paginación, "Seleccionar todas") van en azul de marca: `t.hex.brand` / `t.brandText` (navy en claro, `#8fb3e0` en oscuro para que se lea sobre el fondo oscuro).
- Opciones con identidad propia usan su color (`MenuRow iconColor`): en Exportar, PDF rojo, Excel verde, WhatsApp `#25d366`, Correo azul; el botón de WhatsApp en Compartir lleva el ícono verde.
- **Marca**: wordmark floaGPS en `frontend/src/components/brand/Wordmark.tsx` (pin + "floa" + "GPS" en naranja)

### Estilo (inspirado en Nu / Material 3)
- Todo redondeado y sin bordes: las tarjetas se separan del fondo por color, no por líneas. Bordes solo como divisores internos de listas (`t.border`).
- Radios (Tailwind, `tailwind.config.js`): `rounded-xl` 16 px (campos), `rounded-2xl` 24 px (tarjetas), `rounded-3xl` 28 px (hojas y diálogos); botones, chips, filtros, íconos de fila y botones del mapa en `rounded-full`.
- Tokens de `useTheme().t`: `screen`, `card`, `input`, `tonal` (círculo gris de íconos), `selected` + `hex.onSelected` (píldora activa: tinte navy con ícono naranja en ambos temas), `press` (fondo al presionar filas).
- Íconos de fila y acciones dentro de círculos tonales (`w-10/11 rounded-full ${t.tonal}`); acciones rápidas como círculos con su texto abajo (Inicio, panel de unidad en el mapa, detalle de unidad).
- Componentes base en `components/ui.tsx`: `Button` (píldora de 52 px; variantes primary, tonal, secondary con contorno, danger, ghost), `Field` (relleno, 54 px, borde de foco navy/naranja, prop `right`), `Card`, `IconButton`, `Chip`, `Sheet` (resorte, se cierra arrastrando hacia abajo), `Skeleton`/`Loading` (esqueletos en vez de spinner), `FadeIn`/`useEntrance`, `FLOAT_SHADOW` (sombra de elementos flotantes sobre el mapa).
- Todo lo tocable importante usa `components/shared/Tappable.tsx`: se encoge con resorte al presionar y con `haptic` vibra suave en nativo (`tapFeedback`). Se respeta "reducir movimiento" (`hooks/useReducedMotion.ts`).
- Confirmaciones (`ConfirmContext`) como diálogo centrado con ícono grande y botones apilados; toasts como píldora oscura que entra desde arriba.

### Dark Mode
- Background: `#131316` (suave, no negro puro) / Cards: `#1b1b1f` / Inputs: `#232329` / Tonal: `#26262c` / Selected: `#1b2c42` / Modals: `#202024` / Divisores: `#33343c`

### Light Mode
- Background: `#f3f3f6` / Cards: `#ffffff` / Inputs: `#f3f3f6` / Tonal: `#eff1f5` / Selected: `#e2e8f0` / Divisores: `#ececef`

### Typography
- Font: -apple-system, SF Pro Display stack
- Títulos de pantalla `text-[28px] font-extrabold tracking-tight`; secciones `text-[16px] font-bold` en minúsculas normales (sin mayúsculas forzadas); cuerpo `text-[14-15px]`; etiquetas de campo `text-[13px]` en gris; números destacados grandes y `font-extrabold`.

## Navegación
- Un solo menú principal. < 1024px: barra inferior estilo Material 3 (Inicio, Compartir, **Mapa al centro** como botón cuadrado-redondeado navy/naranja, Apagar, Más; la pestaña activa lleva una píldora tonal animada detrás del ícono) + barra superior minimalista estilo Nu: azul marino plana (sin esquinas redondeadas, sombra ni animaciones), avatar translúcido a la izquierda, logo floaGPS pequeño centrado e íconos sueltos de tema y alertas a la derecha.
- ≥ 1024px: sidebar y barra superior azul marino (igual que la barra del celular, para que se asocie con la app; opción activa con barra e ícono naranja) con las mismas 5 opciones de la barra inferior (`MAIN_TABS` en `components/layout/navItems.ts`), sin submenús; Más abre la misma pantalla de opciones y configuración que en el celular. Se puede colapsar a solo íconos.
- La pantalla de inicio después del login (web y celular) es el Mapa (`/live-map`, `lib/session.ts`).
- Compartir (`/share`) y Apagar (`/engine`): selección múltiple de unidades; Apagar abre la doble confirmación.
- Más: Alertas, Flota, Grupos, Mantenimiento, Geocercas (ver/crear/editar), Reportes; Administración [admin]: Usuarios, Roles; Cuenta: Perfil, Configuración (notificaciones, tema, empresa, horario, accesos de soporte), Ayuda. Cada opción se muestra según los permisos del rol y el plan.
- Geocercas: al crear, el mapa arranca en la ubicación del usuario (o Culiacán si no hay permiso); 20 colores en páginas de 10 (`components/geofences/GeofenceForm.tsx`, compartido por `new` y `[id]`). Cada geocerca dice cuándo avisa (al entrar, al salir o ambos, `alertOn`) y qué vigila: todas las unidades o solo grupos/unidades elegidos (`GeofenceTarget`, `components/geofences/GeofenceTargets.tsx`). La lista muestra cuántas unidades están dentro ahora (dato real en memoria del backend).
- Mapa: pide la ubicación del usuario (punto azul). Botones solo a la derecha, mismo estilo y sin texto: geocercas, capas, ver todo, mi ubicación, ruta hacia una unidad, modo alarma. Al tocar una unidad: Seguir, Ruta de hoy, Historial (`/tracking`), Cómo llegar, Compartir, Motor. En el celular la hoja del panel (`DraggableSheet` con `fit`) se abre a la altura de su contenido, hasta "Ver detalle completo" sin que la tape el botón del Mapa (si no cabe, hace scroll), y la cámara centra la unidad en el espacio libre de arriba.
- Login (centrado en web y celular): pantalla completa azul marino con `components/brand/AnimatedBackdrop.tsx` (ruta punteada, pulsos de radar, puntos y un carro), logo arriba y el formulario directo sobre el azul con `components/login/LoginField.tsx` (campos blancos translúcidos, foco naranja) y `LoginButton.tsx` (píldora naranja con flecha). Se envuelve en `OnNavyTheme` (paleta `navy` de `ThemeContext`). En web (≥ 1024px) la barra superior es azul marino con el nombre de la empresa, sin ícono. El resto de la app usa solo la paleta del sistema (navy/naranja/neutros), sin colores decorativos.
- Icono del sistema: el símbolo del logo FLOA (`assets/images/brand-mark*.png`), usado en la marca floaGPS, ícono de app, favicon y PWA.
- Todas las listas usan paginación (`hooks/usePagination.ts` + `components/shared/Pagination.tsx`), visible siempre que haya elementos.
- Filtros de listas como select compacto (`components/shared/FilterSelect.tsx`, abre una hoja con opciones y conteos), nunca filas de chips; también los filtros flotantes del mapa (Estado y Grupo, `floating`). Los chips solo quedan para elegir valores dentro de formularios.
- Confirmaciones con el modal propio `useConfirm()` (`context/ConfirmContext.tsx`), igual en web y celular; nunca `window.confirm` ni `Alert.alert`.
- Acciones de fila solo con ícono (`ActionIcon` en `components/shared/LifecycleActions.tsx`) y siempre con confirmación; en Flota van a la derecha de cada unidad (editar, desactivar / reactivar, borrar).
- Las subpantallas (`PageHeader back`) muestran el botón de regresar también en web.
- Web en celular se comporta como app: viewport sin zoom (`maximum-scale=1, user-scalable=no`) en `public/index.html`.
- Aviso de instalación PWA (`components/pwa/InstallPrompt.web.tsx`, en nativo es `null`): en Android usa `beforeinstallprompt` (capturado temprano por `public/pwa-install.js`) para instalar con un toque; en iOS muestra los pasos según el navegador (Safari, Chrome, Firefox, Edge u otro → abrir en Safari). No aparece si ya está instalada y "Ahora no" lo oculta 3 días (`floa_install_dismissed_at`).
- El build web usa la API del mismo origen (`${origin}/api`); en desarrollo (`__DEV__`) usa el puerto 3001. `EXPO_PUBLIC_API_URL` tiene prioridad.
- Crear usuario no pide contraseña: el sistema genera una temporal (`generateTemporaryPassword` en `utils/passwordPolicy.ts`) y la envía por correo (`services/accessEmail.service.ts`, `APP_URL` opcional para el botón "Entrar"); si el correo no sale, la app se la muestra una sola vez al admin (`AccessResultSheet`). El admin puede restablecer la contraseña de un usuario desde la lista (ícono de llave, `POST /api/users/:id/reset-password`; cierra sus sesiones). Con `User.mustChangePassword` el backend solo deja pasar `/auth/me`, `/auth/change-password` y la baja de push (403 `password_change_required`) y la app manda a `/set-password` (sin pedir la actual). Los campos de contraseña usan `components/shared/PasswordField.tsx` (botón para ver). El reset desde la consola también obliga a cambiarla. El formulario de usuario no tiene la fila de desactivar/borrar; eso vive en la lista.
- Usuarios de empresa: el primer admin de cada empresa lo crea el dueño desde la consola. Cada usuario **debe** tener un rol de la empresa (`roleId`, se elige con un select); asignar el rol predeterminado Administrador lo hace `role: 'admin'`, cualquier otro `role: 'member'`. Nadie puede cambiar su propio rol y la empresa siempre conserva al menos un admin. Cambiar el rol de un admin invalida su sesión. Usuarios tiene búsqueda, filtro por rol y paginación; tocar un usuario permite editar nombre y rol.
- Unidades: estilo Didi/Rappi vista desde arriba (`components/map/vehicleSvg.ts`), con figura y color configurables (ver "Figura y color de las unidades"), rotan con el rumbo; el nombre solo aparece en la seleccionada. No hay modelos 3D.
- Contraseñas: mínimo 10 caracteres con mayúscula, minúscula, número y símbolo (12 para el equipo floaGPS). Se valida en `backend/src/utils/passwordPolicy.ts` y la app muestra la misma lista.

## Consola del equipo floaGPS
- Se llama **floaGPS Admin** (`components/console/AdminWordmark.tsx`, título de pestaña "floaGPS Admin") para distinguirla de la app de clientes. Diseño propio, distinto de la app: menú lateral blanco (negro en oscuro) con la opción activa en naranja (`ConsoleSidebar.tsx`, abajo solo Salir; en celular compacto de solo íconos), barra superior (`ConsoleTopBar.tsx`) con tema, cerrar todas mis sesiones y la cuenta (Mi cuenta), y botones principales naranjas (`Button variant="accent"`). Nada transparente en la consola: los botones secundarios usan `soft` (relleno gris) y los de borrar `dangerSoft`. Cada listado tiene buscador y filtros tipo select (`consoleFilters.ts` + `FilterSelect`, con conteos y "Quitar filtros"): Clientes (plan, estado), Suscripciones (estado, plan, cobro), Usuarios (cliente, rol), Inventario GPS (estado, cliente, modelo), Equipo (rol, estado), Eliminados (tipo, cliente), Bitácora (área, resultado, rol). Las secciones son Clientes, Suscripciones, Usuarios, Inventario GPS, Equipo, Eliminados y Bitácora.
- Ficha del cliente (`CustomerSheet.tsx`): Datos (editar, con modal de confirmación; `PATCH /api/staff/companies/:id`), Plan (cambio de Personal ↔ Empresarial con unidades, **motivo y contraseña**; `POST /api/staff/companies/:id/plan`; ya no se cambia desde Suscripciones) y Movimientos (`GET /api/staff/companies/:id/history`, bitácora filtrada por `companyId`: plan anterior/nuevo y motivo, ediciones, soporte, GPS).
- GPS desde la consola (`GpsLinkSheet.tsx`, `services/customer.service.ts`): Vincular a una unidad del cliente sin GPS o dar de alta un vehículo nuevo con ese GPS, y Desvincular; ambos con contraseña y en los movimientos del cliente. Un GPS vinculado no se puede pasar a otro cliente hasta desvincularlo. También se sigue pudiendo vincular en Modo Soporte → Flota.
- Es para el personal de floaGPS (soporte, ventas, instalación), no para clientes. Sus cuentas viven en `StaffUser`, separadas de `User`: un cliente nunca puede ser del equipo ni al revés. Las cuentas `superadmin` viejas se migran solas al arrancar (`backend/src/bootstrap.ts`) y el primer Dueño sale de `OWNER_EMAIL`/`OWNER_PASSWORD`.
- Roles del equipo (`backend/src/utils/staffRoles.ts`, `frontend/src/lib/staff.ts`): **Dueño** (todo, incluido Equipo, Bitácora y eliminar empresas), **Soporte** (Modo Soporte, usuarios de clientes, GPS, Eliminados), **Ventas y cobranza** (empresas, planes, suscripciones), **Instalador** (inventario GPS y Modo Soporte solo con Flota). Las pestañas y botones de la consola salen de `staff.permissions`; el backend lo valida con `staffCan(...)`.
- Login con correo y contraseña (`/api/staff/auth/login`, mínimo 12 caracteres, límite de intentos). No hay 2FA por ahora (se quitó el código de app autenticadora por ser muy batalloso mientras no hay clientes). JWT propio (`STAFF_JWT_SECRET`, audiencia `floa-staff`, 8 h); los tokens de clientes llevan audiencia `floa-app` y no sirven en la consola.
- Regla de la consola: toda acción sensible pide volver a escribir la contraseña (`confirmPassword` en el body, `stepUpRequired` con límite de intentos; `ConfirmPasswordSheet` o un campo "Tu contraseña" en la hoja) y toda acción no sensible abre el modal `useConfirm()`. Sensibles: cerrar todas mis sesiones, suspender/reactivar empresa, eliminar empresa/usuario/GPS, mover un GPS de empresa, restablecer contraseñas, guardar suscripción, cambiar de plan (además pide motivo), vincular/desvincular GPS, agregar o editar integrantes y desactivarlos. Con modal: crear cliente, editar datos del cliente, crear administrador de cliente, registrar GPS, restaurar de Eliminados, salir. Ya no existe clave maestra.
- Nuevo cliente (`CompanyFormSheet`, `POST /api/staff/companies`): primero se elige Personal o Empresarial. Personal pide nombre completo, teléfono, dirección opcional, vehículos contratados y acceso (correo + contraseña); la cuenta se llama como la persona. Empresarial pide nombre comercial, razón social, RFC (validado), correo, teléfono, dirección fiscal, sitio web opcional, unidades contratadas y su administrador. En ambos se crea el primer usuario.
- Equipo: nadie cambia su propio rol ni se desactiva; siempre queda al menos un Dueño activo. Los integrantes no se borran, se desactivan (cierra sesiones y su Modo Soporte).
- Modo Soporte: se abre con un motivo (`SupportSession`, `SUPPORT_SESSION_MINUTES`, 120 por defecto) y la app manda `x-support-session`. `authRequired` acepta un token del equipo solo con una sesión abierta suya; cada cambio (POST/PUT/PATCH/DELETE) queda en la bitácora como `SUPPORT_CHANGE`. Al vencer, la app regresa a la consola (`code: 'support_ended'`). El cliente admin ve los accesos en Configuración → Accesos de soporte (`GET /api/company/support-access`).
- Suscripciones (`Subscription`, una por empresa): estado (Prueba, Activa, Pago vencido, Suspendida, Cancelada), ciclo, precio por unidad, próximo cobro y notas; se editan junto con el plan y las unidades contratadas (`PUT /api/staff/subscriptions/:companyId`). Pasar a Suspendida/Cancelada suspende el acceso de la empresa y volver a Activa/Prueba lo restaura. La consola muestra el ingreso mensual.
- Bitácora `StaffAuditLog` (tabla `OwnerAuditLog`) con autor, rol y empresa.
- Red: `STAFF_HOST` (p. ej. `admin.floagps.com`) hace que la consola y `/api/staff` solo respondan en ese host, que sirve `dist-console`; el host de clientes da 404 en `/console`. Sin `STAFF_HOST` (desarrollo o un solo túnel) la consola vive en `/console`. `STAFF_ALLOWED_IPS` limita las IPs (consola y Modo Soporte).
- Solo web: en nativo y en el build `dist` (`FLOA_WEB_TARGET=client`, resolver de `metro.config.js`) los `Console*Screen` se reemplazan por stubs que redirigen a `/login`.

## Mapas
- `components/map/types.ts` define la interfaz única (`markers`, `routes`, `circles`, `points`, `camera`, `follow`, `layer`, `onMarkerPress`, `onMove`, `onUserPan`). Las pantallas no saben qué motor hay debajo.
- Nativo (`FleetMap.native.tsx`): MapLibre Native (`@maplibre/maplibre-react-native` v11: `Map`, `Camera`, `GeoJSONSource` + `Layer`, `Marker`) con los mismos estilos que la web (OpenFreeMap Positron, CartoDB Dark Matter, Esri satélite). No usa Google ni Apple Maps ni API keys. **No funciona en Expo Go**: en el celular se prueba con la APK o una dev build.
- "Cómo llegar" y "Compartir" solo abren links externos (Google Maps, Apple Maps, Waze); no requieren claves.
- Web (`FleetMap.web.tsx`): MapLibre 5 UMD desde jsDelivr (con `integrity` SRI, definidos en `mapEngine.ts`; si se cambia la versión hay que recalcular los hashes) y luego `public/map-engine.js` como archivo propio (nunca script inline, por la CSP). Estilos OpenFreeMap Positron, CartoDB Dark Matter y Esri satélite.
- Los mapas no muestran el botón de atribución (`attributionControl: false` en web, `attribution={false}` en nativo). La unidad seleccionada lleva un halo naranja con borde, no del color de su estado.
- Contrato de coordenadas: `lat`/`lng` explícitos; las rutas usan `[lat, lng]`.
- Ruta hacia una unidad: `lib/routing.ts` usa OSRM (`EXPO_PUBLIC_OSRM_URL`, por defecto el servidor público de demostración de OSRM, sin API key) y cae a línea recta si falla. Para producción conviene un OSRM propio u OpenRouteService.
- Las sesiones de trabajo (`WorkSession`: km, horas de motor, en movimiento y ralentí por día) se calculan solas al llegar posiciones: `ingestFixes` llama a `services/workSession.service.ts` (`refreshWorkSessions`), que reconstruye el día local con las posiciones guardadas (ignora huecos de más de 30 min y saltos imposibles) y lo hace como máximo una vez por minuto por unidad. Aplica a Traccar, GT06 y el webhook.
- En listas y paneles de unidad se muestran los **km recorridos hoy** (`kmToday`, de `todaySession`), no la velocidad.

## Horario laboral, km fuera de horario y modo guarda
- Cada empresa tiene horario laboral por día (`Company.workSchedule` JSON `{ days: [{ day, start, end }] }` en minutos, pasos de 30 min; días que no aparecen son descanso; por defecto L–S 7:00–19:00; `utils/workSchedule.ts`). Ej. L–V 7:00–19:00 y sábado 8:00–14:00. `GET/PUT /api/company/schedule` (PUT solo admin); se edita en Configuración.
- `GET /api/reports/off-hours?startDate&endDate` calcula km recorridos fuera de ese horario por unidad (segmentos que empiezan fuera de horario, ignorando huecos > 30 min).
- Se muestran tiempo de motor, ralentí y km fuera de horario en Inicio, el panel de la unidad en el mapa, el detalle de la unidad y Reportes (incluye exportación).
- Modo guarda (dentro de Modo alarma): ante un evento de una unidad vigilada abre una alerta a pantalla completa con sirena en bucle (`assets/sounds/guard-alarm.wav`, `expo-audio` con `playsInSilentMode`) y vibración hasta que el usuario la detiene. Funciona con la app abierta; con la app cerrada llegan las notificaciones push (ver "Alertas y notificaciones").

## Reportes
- Exportar PDF arma un documento propio (`lib/exporters.ts`): encabezado con marca y empresa, indicadores del periodo, tabla con números alineados a la derecha, renglón de totales y pie con fecha y autor; A4 horizontal si hay más de 5 columnas. En web se imprime desde un iframe oculto (Guardar como PDF), nunca la pantalla; en nativo `expo-print` genera el PDF y se comparte con nombre legible. Excel exporta CSV con totales.

## Servidor y builds móviles
- En el celular la dirección del servidor se cambia desde el login ("Cambiar" bajo el botón Entrar, `components/login/ServerSettings.tsx`): valida `/api/health` y se guarda (`floa_server_url`). En web siempre es el mismo origen.
- APK (solo `arm64-v8a` y `armeabi-v7a`, con minificado y limpieza de recursos vía `expo-build-properties` en `app.json`; para Play Store subir AAB): `cd frontend && npx eas-cli build -p android --profile preview` (perfil `preview` en `eas.json` genera APK instalable). Proyecto EAS `@edgarleonarchuleta/floa-gps`; la llave de firma vive en EAS.
- iOS instalable requiere Apple Developer Program ($99/año) para TestFlight.

## Datos de la empresa
- `Company` guarda nombre comercial, razón social, RFC, correo, teléfono, dirección, sitio web y `logo` (data URL PNG/JPG/WEBP, máximo ~500 KB).
- `GET/PUT /api/company/profile` (PUT solo admin). Se edita en Configuración (`components/config/CompanyProfileCard.tsx`, logo con `expo-image-picker`). Al guardar, el nombre se actualiza en la sesión (`renameCompany`).

## Recuperar contraseña
- `POST /api/auth/forgot-password` genera un código de 6 dígitos (vence en 15 min, guardado con HMAC) y lo envía por correo con Resend. **No cambia la contraseña.** Máximo 5 solicitudes por IP/correo cada 15 min.
- `POST /api/auth/reset-password` valida código (5 intentos) + política de contraseña, cambia la contraseña y cierra las demás sesiones.
- Correo: `RESEND_API_KEY` y `EMAIL_FROM` (dominio verificado en Resend). Sin API key, en desarrollo el código se imprime en la consola del backend (`[EMAIL-DEV]`).

## Planes: Personal y Empresarial
- Una sola app; el plan vive en la cuenta (`Company.plan`: `PERSONAL` o `EMPRESA`, cualquier otro valor viejo cuenta como `EMPRESA`; `backend/src/utils/plans.ts`). Lo elige Ventas o el Dueño al crear la empresa en la consola y se cambia desde su suscripción (botón "Plan …" o pestaña Suscripciones); no se borra nada al cambiar.
- `Company.maxUnits` es el límite de unidades (5 por defecto en Personal, 50 en Empresarial como punto de partida; a cada empresa se le pone lo que contrató) y se valida al crear vehículos (`services/planLimits.ts`).
- **Quién hace qué:** los datos delicados de las unidades (alta, placa, marca, modelo, año, GPS/IMEI/SIM, desactivar y borrar) los administra solo el equipo de floaGPS (equipo en la consola o en Modo Soporte, `ownerTeamRequired` en `PUT/PATCH/DELETE /api/vehicles` y `/api/machines`), en ambos planes. Los clientes, Personal o Empresarial, solo personalizan nombre, color y figura (`PATCH /api/vehicles/:id/appearance`, `AppearanceSheet`); el formulario completo `/fleet/new` y `/fleet/:id` solo existe en Modo Soporte. `planRequired('EMPRESA')` deja pasar siempre a Modo Soporte (`tenant.support`), así ahí se administra todo aunque la cuenta sea Personal.
- **Personal:** una sola cuenta (sin usuarios ni familia), sin geocercas, sin roles, sin horario ni datos de empresa, sin exportar ni km fuera de horario, historial de 30 días (`historyWindow`). De sus vehículos solo edita nombre, color y figura (`PATCH /api/vehicles/:id/appearance`). En la app `usePlan().isClientPersonal` (Personal y fuera de Modo Soporte) esconde esas secciones y `isBlockedRoute` redirige a Más (`/roles`, `/users`, `/geofences`, `/fleet/…`; `/fleet/new` solo en Modo Soporte).
- **Empresarial:** administra usuarios, roles, geocercas y reportes; de sus unidades solo personaliza nombre, color y figura.
- La sesión (`/auth/me` y login) trae `plan` y `maxUnits`; en Modo Soporte el plan viene de la empresa. Personal ve Inicio simplificado (`components/dashboard/PersonalHome.tsx`), "Mis vehículos" y la tarjeta "Tu plan" con "Mejorar a Empresarial" (WhatsApp de soporte, `components/more/PlanCard.tsx`).

## Figura y color de las unidades
- `Vehicle.figure` (`sedan`, `suv`, `pickup`, `truck`, `moto`, `tractor`) e `iconColor` (`#RRGGBB`), validados en `backend/src/utils/vehicleLook.ts`. Sin figura: sedán para vehículos y tractor (maquinaria) para máquinas.
- Dibujos en `components/map/vehicleSvg.ts`; `unitLook()` en `lib/units.ts` decide: sin color propio el cuerpo va del color del estado; con color propio el cuerpo va de ese color y el estado se ve como un puntito. Usar `UnitIcon` (`components/shared/VehicleIcon.tsx`) donde haya una unidad.
- Selectores en `components/units/LookPickers.tsx` (formulario de vehículo y `AppearanceSheet` del cliente Personal).
- El mapa muestra "N vehículos sin señal de GPS" cuando hay unidades sin posición, y tiene un botón para mostrar u ocultar las geocercas activas (con permiso `geofences`).

## Acceso por empresa y unidades
- Toda cuenta de cliente debe tener `companyId`; `authRequired` rechaza (403) las que no lo tengan.
- Roles predeterminados (`Role.systemKey`: `admin` Administrador, `operator` Operador, `viewer` Solo lectura; `services/systemRoles.ts`): existen en cada empresa (se crean al arrancar el backend, al crear empresa y al listar roles), se pueden asignar pero no editar ni borrar (403).
- Roles personalizados (`Role` + `RoleUnit`, CRUD en `/api/roles`, solo admin; pantallas en `app/(app)/roles/`): nombre, permisos (`dashboard`, `share`, `engine`, `alerts`, `fleet`, `geofences`, `reports`, `maintenance`; el mapa, perfil y ayuda siempre están) y unidades (todas o solo algunas). No se puede borrar un rol con usuarios.
- Los permisos se leen en cada petición (`authRequired` → `tenant.permissions`, `null` = admin o equipo en Modo Soporte) y se aplican con `permissionRequired(...)` en el backend; en la app con `useCan()` (menú, Más, botones del mapa y del detalle) y `ROUTE_PERMISSIONS` en `lib/permissions.ts` (AppShell redirige al mapa). La app refresca permisos con `GET /api/auth/me` cada 2 min.
- Un usuario con rol limitado a algunas unidades solo ve esas unidades en listas, detalle, Inicio, alertas y reportes. Los filtros se arman con `services/unitAccess.ts` (`linkedUnitFilter`, `gpsDeviceFilter`, `canAccessUnit`, `canAccessGpsDevice`); cualquier consulta nueva ligada a unidades debe usarlos.

## Grupos de unidades
- `UnitGroup` (nombre único por empresa sin importar mayúsculas/acentos, color); cada vehículo o máquina está en máximo un grupo (`groupId`). Pantalla `app/(app)/groups/` + `components/groups/GroupFormSheet.tsx`; CRUD en `/api/groups` (escribir solo admin, solo plan Empresarial). Guardar un grupo mueve ahí las unidades elegidas.
- Las unidades traen `group` (`id`, `name`, `color`) y `GET /api/vehicles|machines?groupId=` filtra (`none` = sin grupo). Flota tiene el select Grupo; el mapa, select Grupo arriba.

## Unidades por persona
- Además del rol, a un usuario (no admin) se le pueden elegir sus propias unidades: `User.ownUnits` + `UserUnit`. Si está activo, ve solo esas, sin importar las del rol (ej. el chofer solo ve su camión). Se elige en el formulario de usuario ("Unidades que verá"). `TenantContext.unitsByUser` y `services/unitAccess.ts` lo aplican en todo.

## Alertas y notificaciones
- Todo evento de rastreo pasa por `recordEvent` (`tracker/ingest.ts`): se guarda y se manda con `services/notify.service.ts` (`dispatchAlert`) a los usuarios de la empresa que tienen permiso `alerts` (o `maintenance`), pueden ver esa unidad y eligieron ese tipo. Máximo una vez por minuto por persona, unidad y tipo.
- Geocercas: solo se evalúan las de la empresa de la unidad y que la vigilan (`tracker/geofenceWatch.ts`); el historial guarda entradas y salidas, pero solo avisa según `alertOn`.
- Canales por usuario (`NotificationSetting`, Configuración → Notificaciones, `components/config/NotificationSettingsCard.tsx`): push y correo (no hay SMS, se decidió no usarlos), y tipos (`GEOFENCE`, `SOS`, `OVERSPEED`, `LOW_BATTERY`, `IGNITION`, `MAINTENANCE`). Botón "Enviarme una prueba".
- Push (`PushDevice`, `services/push.service.ts`): celular con Expo Push (`expo-notifications`, `lib/push.native.ts`; en Android requiere las credenciales FCM cargadas en EAS y en iOS la cuenta de Apple) y navegador con Web Push (`lib/push.web.ts` + `public/sw.js`; llaves `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, en desarrollo se generan en `backend/.vapid-dev.json`). Al cerrar sesión el dispositivo se da de baja.
- Correo con el mismo `email.service.ts` (SMTP o Resend).

## Mantenimiento
- `Maintenance` por unidad (aceite, servicio, llantas, frenos, seguro, tenencia, verificación, otro) cada X km y/o N días desde `lastDoneAt`; los km salen solos de las sesiones de trabajo del GPS. Al crear se pueden elegir varias unidades a la vez (`UnitMultiSelectField`; `POST /api/maintenance` con `units: [{ kind, id }]` crea uno por unidad, máx. 200). Estado `OK`/`SOON` (≤ 7 días o ≤ 10 % de km, mínimo 300)/`DUE`. "Marcar como hecho" guarda `MaintenanceLog` (fecha, km, costo, notas, quién) y reinicia.
- Permiso nuevo `maintenance` (también en plan Personal). Pantalla `app/(app)/maintenance/` (`components/maintenance/`), resumen en el detalle de unidad (`components/units/UnitMaintenance.tsx`). Cada hora el backend revisa y avisa al pasar a Pronto o Vencido, y repite cada 3 días si sigue vencido.
- Grupos y mantenimientos borrados aparecen en Eliminados de la consola.

## Integridad de datos: nada se borra de la base
- Ciclo de vida para usuarios, unidades (vehículos y maquinaria), geocercas y roles: **Activo → Desactivado → Borrado**. En la app solo se ve el ícono de desactivar; ya desactivado aparecen reactivar y borrar (`components/shared/LifecycleActions.tsx`, cada uno con modal de confirmación; borrar advierte que para recuperarlo hay que contactar a soporte). Las listas tienen el select Estado: Activos/Desactivados (`components/shared/StatusFilter.tsx`).
- Borrar = `deletedAt` (soft delete). El backend exige desactivar antes de borrar (409) y nunca hace `delete` sobre estos modelos, empresas ni GPS. Toda consulta de la app filtra `deletedAt: null`.
- Desactivado: usuario no puede entrar (se cierran sus sesiones); unidad y geocerca no aparecen en el mapa ni a usuarios normales (el admin las ve para administrarlas); un rol desactivado no se puede asignar. Un rol solo se desactiva o borra si no tiene usuarios. Los GPS siguen recibiendo posiciones aunque su unidad esté desactivada o borrada.
- Consola del equipo → pestaña **Eliminados** (`/api/staff/trash`, `services/trash.service.ts`): lista lo borrado de todas las empresas y lo restaura (queda desactivado). Eliminar empresa, usuario o GPS desde la consola también es soft delete.
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
- `/api/gps/:id/{positions,tracking,latest}` pasan por `canAccessGpsDevice` (404 si el GPS es de otra empresa o de una unidad no asignada). El alta/vinculación de GPS solo existe en la consola del equipo (`/api/staff/gps`).
- Webhook de Traccar (`/api/ingest/traccar`): en producción el backend no arranca sin `TRACCAR_WEBHOOK_SECRET` (mínimo 24 caracteres) y rechaza peticiones sin el token (`x-floa-token` o `?token=`). En `infra/`, Traccar recibe la URL con el secreto por variables de entorno, nunca escrita en `traccar.xml`.

## Key Decisions
- El antiguo frontend de React + Vite se eliminó; la app Expo (antes `frontend/`) se renombró a `frontend/` y es el único cliente (web, iOS y Android).
- MapLibre en celular y web (gratis, sin API keys). Se quitó `react-native-maps` para no depender de la clave de Google en Android.
- PostgreSQL (Neon prod + Postgres local dev).
- Se eliminó todo lo de Vercel; el proyecto ya no se despliega ahí.

## Run Commands
```bash
# Backend (API en :3001)
cd backend && npx ts-node-dev --transpile-only src/index.ts

# App (web en :8081 + QR para Expo Go en el celular)
cd frontend && npx expo start

# Build web servido por el backend
cd frontend && npm run build:web

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
