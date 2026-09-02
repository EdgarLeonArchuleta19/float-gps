#!/usr/bin/env bash
set -e

echo "==> Construyendo..."
npx tsc

echo "==> Regenerando base de datos (SQLite)..."
npx prisma db push --force-reset

echo "==> Sembrando datos demo..."
npx prisma db seed

echo "==> Iniciando servidor..."
node dist/index.js