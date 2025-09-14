#!/bin/sh
set -e

until pg_isready -h db -U reservas_user -d reservas_db; do
  echo "Esperando que la base de datos esté lista..."
  sleep 2
done

echo "Aplicando migraciones..."
npx prisma migrate deploy

echo "Verificando si la base de datos necesita ser poblada (seed)..."
node prisma/check-seed.js

echo "Iniciando el servidor..."
exec node src/server.js