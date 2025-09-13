echo "Aplicando migraciones..."
npx prisma migrate deploy

USER_COUNT=$(npx prisma eval 'await prisma.users.count()')

if [ $USER_COUNT -eq 0 ]; then
  echo "La base de datos está vacía. Ejecutando el script de seed..."
  npx prisma db seed
else
  echo "La base de datos ya tiene datos. Omitiendo el seed."
fi

echo "Iniciando el servidor..."
exec node src/server.js