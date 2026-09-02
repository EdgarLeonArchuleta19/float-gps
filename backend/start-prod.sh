#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "==> Instalando dependencias..."
npm install

echo "==> Construyendo TypeScript..."
npx tsc

echo "==> Creando base de datos SQLite..."
npx prisma db push --force-reset

echo "==> Sembrando datos demo..."
npx prisma db seed

echo "==> Iniciando servidor en el puerto $PORT..."
node dist/index.js