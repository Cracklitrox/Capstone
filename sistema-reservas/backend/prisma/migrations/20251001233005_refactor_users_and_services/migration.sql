-- ============================================
-- FASE A: REFACTOR COMPLETO PARA RESERVAS
-- ============================================

-- 1. MODIFICAR TABLA USERS
-- Primero verificamos y manejamos rut_dv si existe
DO $$ 
BEGIN
    -- Solo intentar actualizar si rut_dv existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'rut_dv'
    ) THEN
        -- Concatenar rut con rut_dv antes de eliminar
        UPDATE "public"."users" 
        SET "rut" = CONCAT("rut", "rut_dv") 
        WHERE "rut_dv" IS NOT NULL AND "rut_dv" != '';
        
        -- Eliminar columna rut_dv
        ALTER TABLE "public"."users" DROP COLUMN "rut_dv";
    END IF;
END $$;

-- Renombrar 'rut' a 'identification_number'
ALTER TABLE "public"."users" 
  RENAME COLUMN "rut" TO "identification_number";

-- Cambiar tipo de dato a VARCHAR(15)
ALTER TABLE "public"."users" 
  ALTER COLUMN "identification_number" TYPE VARCHAR(15);

-- Agregar campo is_fully_registered si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'is_fully_registered'
    ) THEN
        ALTER TABLE "public"."users" 
          ADD COLUMN "is_fully_registered" BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS "users_identification_number_idx" 
  ON "public"."users"("identification_number");

-- 2. MODIFICAR GUEST_DETAILS
ALTER TABLE "public"."guest_details" 
  ADD COLUMN IF NOT EXISTS "children_under_four" INTEGER DEFAULT 0;

-- Eliminar columna commune si existe
ALTER TABLE "public"."users" 
  DROP COLUMN IF EXISTS "commune";

-- 3. AGREGAR DESCRIPCIONES A ROOM_TYPES
ALTER TABLE "public"."room_types" 
  ALTER COLUMN "description" TYPE TEXT,
  ADD COLUMN IF NOT EXISTS "bed_configuration" VARCHAR(200);

-- 4. AGREGAR DESCRIPCIONES A ROOMS
ALTER TABLE "public"."rooms" 
  ALTER COLUMN "description" TYPE TEXT;

-- 5. AGREGAR DESCRIPCIONES A SERVICES
ALTER TABLE "public"."services" 
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "allows_custom_price" BOOLEAN DEFAULT false;

-- 6. CREAR TABLA PARA MENÚ DE DESAYUNOS
CREATE TABLE IF NOT EXISTS "public"."breakfast_menu_items" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "breakfast_menu_items_pkey" PRIMARY KEY ("id")
);

-- 7. MODIFICAR RESERVATION_SERVICES
ALTER TABLE "public"."reservation_services" 
  ADD COLUMN IF NOT EXISTS "specific_dates" TEXT,
  ADD COLUMN IF NOT EXISTS "daily_rate" INTEGER;

-- 8. CREAR TABLA PARA SERVICIOS DIARIOS
CREATE TABLE IF NOT EXISTS "public"."room_service_daily" (
    "id" SERIAL NOT NULL,
    "reservation_room_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,
    "service_date" DATE NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "room_service_daily_pkey" PRIMARY KEY ("id")
);

-- 9. MODIFICAR PAYMENTS
ALTER TABLE "public"."payments" 
  ADD COLUMN IF NOT EXISTS "payment_sequence" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- 10. CREAR TABLA PARA BORRADORES
CREATE TABLE IF NOT EXISTS "public"."reservation_drafts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "draft_data" JSONB NOT NULL,
    "current_step" INTEGER DEFAULT 1,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(6),
    
    CONSTRAINT "reservation_drafts_pkey" PRIMARY KEY ("id")
);

-- 11. MODIFICAR RESERVATIONS
ALTER TABLE "public"."reservations" 
  ADD COLUMN IF NOT EXISTS "stay_type" VARCHAR(20) DEFAULT 'short';

-- 12. AGREGAR FOREIGN KEYS (solo si no existen)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'room_service_daily_reservation_room_id_fkey'
    ) THEN
        ALTER TABLE "public"."room_service_daily" 
          ADD CONSTRAINT "room_service_daily_reservation_room_id_fkey" 
          FOREIGN KEY ("reservation_room_id") 
          REFERENCES "public"."reservation_rooms"("id") 
          ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'room_service_daily_service_id_fkey'
    ) THEN
        ALTER TABLE "public"."room_service_daily" 
          ADD CONSTRAINT "room_service_daily_service_id_fkey" 
          FOREIGN KEY ("service_id") 
          REFERENCES "public"."services"("id");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reservation_drafts_user_id_fkey'
    ) THEN
        ALTER TABLE "public"."reservation_drafts" 
          ADD CONSTRAINT "reservation_drafts_user_id_fkey" 
          FOREIGN KEY ("user_id") 
          REFERENCES "public"."users"("id") 
          ON DELETE CASCADE;
    END IF;
END $$;

-- 13. CREAR ÍNDICES
CREATE INDEX IF NOT EXISTS "room_service_daily_reservation_room_id_idx" 
  ON "public"."room_service_daily"("reservation_room_id");

CREATE INDEX IF NOT EXISTS "room_service_daily_service_date_idx" 
  ON "public"."room_service_daily"("service_date");

CREATE INDEX IF NOT EXISTS "reservation_drafts_user_id_idx" 
  ON "public"."reservation_drafts"("user_id");

CREATE INDEX IF NOT EXISTS "reservation_drafts_expires_at_idx" 
  ON "public"."reservation_drafts"("expires_at");

-- 14. ACTUALIZAR DATOS EXISTENTES
-- Marcar usuarios staff como completamente registrados
UPDATE "public"."users" 
  SET "is_fully_registered" = true 
  WHERE "id" IN (
    SELECT "user_id" FROM "public"."user_roles" 
    WHERE "role_id" IN (
      SELECT "id" FROM "public"."roles" 
      WHERE "name" IN ('administrator', 'receptionist')
    )
  );