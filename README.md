# floaGPS - Monitoreo de flotas

Hecho por TechPoint Software.

Plataforma de rastreo GPS para vehículos y maquinaria: mapa en vivo, recorridos, geocercas, alertas, reportes y paro de motor. Una sola app (`frontend/`) corre en iOS, Android y web/PWA.

## Requisitos

- Node.js 20+
- PostgreSQL 15+ (local) o Neon (producción)
- Expo Go en el celular para probar en dispositivo

## Instalación

```bash
cd backend && npm install
cd ../frontend && npm install
```

Copia `backend/.env.example` a `backend/.env` y ajusta `DATABASE_URL`, `JWT_SECRET` y `OWNER_MASTER_KEY`. Para que "Recuperar contraseña" envíe correos, configura `RESEND_API_KEY` y `EMAIL_FROM` (cuenta en resend.com con tu dominio verificado); sin eso, en desarrollo el código aparece en la consola del backend.

```bash
cd backend
npx prisma db push
npx prisma db seed
```

## Ejecutar

```bash
# API (puerto 3001)
cd backend && npx ts-node-dev --transpile-only src/index.ts

# App: web en http://localhost:8081 y QR para Expo Go
cd frontend && npx expo start
```

La app detecta la API en el mismo host en el puerto 3001. Para otro servidor define `EXPO_PUBLIC_API_URL` en `frontend/.env`.

## Credenciales locales

- Email: `admin@floagps.com`
- Password: `Floa2026!Admin`

La consola de dueño está en `/owner-login` (solo web) y requiere la clave maestra del servidor.

## Mapas

| Plataforma | Motor | Costo |
|---|---|---|
| iOS | Apple Maps (`react-native-maps`) | Gratis |
| Android | Google Maps SDK (`react-native-maps`) | Gratis por carga de mapa; requiere API key solo para builds de tienda |
| Web | MapLibre GL + OpenFreeMap / CARTO / Esri | Gratis, sin API key |

La atribución de OpenFreeMap, OpenStreetMap y CARTO es obligatoria en web.

## Arquitectura

```
frontend/   Expo + React Native + React Native Web (app activa)
backend/    Express + TypeScript + Prisma + PostgreSQL
```

## Build web

```bash
cd frontend && npx expo export -p web
```

El backend sirve `frontend/dist` automáticamente si existe.
