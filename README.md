# GPS Tracker - Sistema de Monitoreo GPS para Flotas

Sistema web completo de seguimiento y gestión de vehículos y maquinaria mediante GPS. Incluye mapa en vivo, historial de recorridos, geocercas, eventos, bitácora y reportes.

## Requisitos

- Node.js 18+ 
- npm 9+

## Instalación

### 1. Clonar e instalar dependencias

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configurar variables de entorno

```bash
# Backend
cp .env.example .env
# Editar .env con tus configuraciones

# Frontend
cp .env.example .env
# Agregar tu API key de Google Maps
```

### 3. Base de datos

El proyecto usa SQLite (listo para migrar a PostgreSQL en producción).

```bash
cd backend
npx prisma db push
npx prisma db seed
```

### 4. Ejecutar

```bash
# Backend (puerto 3001)
cd backend
npm run dev

# Frontend (puerto 5173)
cd frontend
npm run dev
```

### 5. Abrir

http://localhost:5173

## Credenciales Demo

- Email: `admin@demo.com`
- Password: `demo123`

## Variables de entorno

### Backend (.env)

| Variable | Descripción | Default |
|---|---|---|
| DATABASE_URL | URL de conexión a la base de datos | `file:./dev.db` |
| PORT | Puerto del servidor | `3001` |
| NODE_ENV | Entorno | `development` |
| JWT_SECRET | Secreto JWT | `demo-jwt-secret` |

### Frontend (.env)

| Variable | Descripción |
|---|---|
| VITE_GOOGLE_MAPS_API_KEY | API key de Google Maps JavaScript |
| VITE_API_URL | URL de la API backend |

## Google Maps

1. Ir a https://console.cloud.google.com
2. Habilitar "Maps JavaScript API"
3. Crear una API key
4. Agregarla en `frontend/.env`

Si no se configura, la aplicación funciona con fallback visual sin mapa.

## Arquitectura

```
frontend/          React + Vite + TypeScript + Tailwind
backend/           Express + TypeScript + Prisma
  prisma/          Schema + Seed
  src/
    controllers/   Lógica de endpoints
    services/      Lógica de negocio
    routes/        Definición de rutas
    middleware/     Error handling
```

## API Endpoints

- `GET /api/dashboard` - Estadísticas del panel
- `GET /api/vehicles` - Lista de vehículos
- `GET /api/vehicles/:id` - Detalle de vehículo
- `GET /api/machines` - Lista de maquinaria
- `GET /api/machines/:id` - Detalle de maquinaria
- `GET /api/gps/:id/tracking` - Tracking histórico
- `GET /api/events` - Lista de eventos
- `GET /api/geofences` - Lista de geocercas
- `GET /api/reports/daily` - Reporte diario
- `POST /api/commands/engine-stop` - Comando paro de motor

## Preparado para GPS Reales

La arquitectura está diseñada para conectar GPS físicos posteriormente:

1. Los datos de GPS pasan por una capa de normalización
2. La lógica de negocio no depende del protocolo GPS
3. Endpoint `POST /api/gps/ingest` listo para receptor TCP/UDP
4. Compatible con protocolos: GPS103, Teltonika, Queclink
