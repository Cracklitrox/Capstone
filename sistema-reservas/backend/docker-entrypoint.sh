#!/bin/sh
set -e

# Esperamos a que la base de datos esté lista
# Usamos las variables de entorno para que sea consistente
until pg_isready -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  echo "Esperando que la base de datos esté lista..."
  sleep 2
done

# Creamos el rol "root" si no existe
echo "Verificando si el rol 'root' existe..."

# Le pasamos la contraseña a psql
export PGPASSWORD=$POSTGRES_PASSWORD

# LA CORRECCIÓN FINAL: Usamos $POSTGRES_DB para el nombre de la base de datos (-d)
psql -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'root') THEN
    CREATE ROLE root LOGIN PASSWORD 'root_password';
    GRANT \"$POSTGRES_USER\" TO root;
  END IF;
END \$\$;"

# Limpiamos la variable por seguridad
unset PGPASSWORD

echo "Aplicando migraciones..."
npx prisma migrate deploy

echo "Verificando si la base de datos necesita ser poblada (seed)..."
node prisma/check-seed.js

echo ""
echo "---------------------------------------------"
echo "🚀 ¡Sistema de Reservas listo para usar!"
echo ""
echo "✅ API Backend corriendo en: http://localhost:3001/test"
echo "✅ Aplicación Frontend disponible en: http://localhost:5173"
echo "---------------------------------------------"
echo ""
echo "Iniciando el proceso del servidor..."

exec node src/server.js