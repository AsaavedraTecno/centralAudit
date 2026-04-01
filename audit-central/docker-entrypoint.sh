#!/bin/bash
set -e

echo "Iniciando configuración del contenedor..."

# 1. Asegurar que el archivo .env tenga la estructura correcta para la llave
if ! grep -q "^APP_KEY=" .env; then
    echo "APP_KEY=" >> .env
fi

# 2. Generar la llave SOLO si está vacía
if grep -q "^APP_KEY=$" .env; then
    echo "Generando APP_KEY..."
    php artisan key:generate --force
fi

# 3. Esperar a la base de datos
echo "Esperando a la base de datos..."
# Le damos 5 segundos para asegurar que PostgreSQL esté listo para recibir conexiones
sleep 5 

# 4. MIGRACIONES Y SEEDERS
echo "Ejecutando migraciones..."
php artisan migrate --force

echo "Ejecutando Seeders (Creando roles y admin)..."
# Usamos || true para que no explote si el usuario admin ya existía de antes
php artisan db:seed --force || true

# 5. CONFIGURACIÓN AUTOMÁTICA DE PASSPORT
echo "Configurando seguridad (Passport)..."

# Genera las llaves físicas en /storage
php artisan passport:keys --force --no-interaction

# Inyección automática al .env
if ! grep -q "^PASSPORT_PERSONAL_ACCESS_CLIENT_ID=" .env; then
    echo "Buscando o creando Cliente Personal en la base de datos..."
    
    # Creamos el cliente en la BD (si ya existe, no hace nada)
    php artisan passport:client --personal --name="Central Client" --no-interaction || true
    
    # Extraemos el ID y el Secret del último cliente creado (el único que hay)
    P_ID=$(php artisan tinker --execute="echo DB::table('oauth_clients')->orderBy('id', 'desc')->value('id');")
    P_SECRET=$(php artisan tinker --execute="echo DB::table('oauth_clients')->orderBy('id', 'desc')->value('secret');")

    # Si encontró los datos, los inyecta
    if [ ! -z "$P_ID" ]; then
        echo "" >> .env
        echo "PASSPORT_PERSONAL_ACCESS_CLIENT_ID=$P_ID" >> .env
        echo "PASSPORT_PERSONAL_ACCESS_CLIENT_SECRET=$P_SECRET" >> .env
        echo "✅ Cliente Personal vinculado al .env automáticamente."
    fi
fi

# 6. LIMPIEZA DE CACHÉ
echo "Limpiando caché del sistema para aplicar los cambios del .env..."
php artisan optimize:clear

# 7. PERMISOS CRÍTICOS (Para evitar el Error 500)
echo "Ajustando permisos de seguridad..."
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# ¡EL DETALLE DE ORO PARA PASSPORT! (Asegura las llaves a 600)
chmod 600 /var/www/html/storage/oauth-*.key || true

# 8. INICIAR EL SERVIDOR WEB
echo "🚀 Todo listo. Iniciando Apache..."
exec apache2-foreground