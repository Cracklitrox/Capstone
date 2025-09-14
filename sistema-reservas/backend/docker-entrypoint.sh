#!/bin/sh
set -e

# Esperamos a que la base de datos esté lista
until pg_isready -h db -U reservas_user -d reservas_db; do
  echo "Esperando que la base de datos esté lista..."
  sleep 2
done

# Creamos el rol "root" si no existe
echo "Verificando si el rol 'root' existe..."
psql -U postgres -d reservas_db -c "DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'root') THEN
    CREATE ROLE root LOGIN PASSWORD 'root_password';
    GRANT reservas_user TO root;
  END IF;
END \$\$;"

echo "Aplicando migraciones..."
npx prisma migrate deploy

echo "Verificando si la base de datos necesita ser poblada (seed)..."
node prisma/check-seed.js

echo "Iniciando el servidor..."
exec node src/server.js
