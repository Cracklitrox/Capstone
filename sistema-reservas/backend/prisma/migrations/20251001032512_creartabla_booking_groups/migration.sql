-- CreateEnum
CREATE TYPE "public"."organization_type_enum" AS ENUM (
  'empresa',
  'institucion_educativa',
  'institucion_gubernamental',
  'ong',
  'tour_operador',
  'agencia_viajes',
  'evento_corporativo',
  'otro'
);

-- Agregar valor a enum existente
ALTER TYPE "public"."service_unit_enum" ADD VALUE IF NOT EXISTS 'per_room';

-- CreateTable
CREATE TABLE "public"."booking_groups" (
    "id" SERIAL NOT NULL,
    "group_name" VARCHAR(150) NOT NULL,
    "organization_type" "public"."organization_type_enum" NOT NULL,
    "tax_id" VARCHAR(20),
    "contact_name" VARCHAR(150) NOT NULL,
    "contact_email" VARCHAR(150) NOT NULL,
    "contact_phone" VARCHAR(30),
    "billing_address" TEXT,
    "special_terms" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "booking_groups_pkey" PRIMARY KEY ("id")
);

-- Modificar tabla reservations
ALTER TABLE "public"."reservations" 
ADD COLUMN "booking_type" VARCHAR(20) DEFAULT 'individual',
ADD COLUMN "booking_group_id" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."reservations" 
ADD CONSTRAINT "reservations_booking_group_id_fkey" 
FOREIGN KEY ("booking_group_id") 
REFERENCES "public"."booking_groups"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- CreateIndex para búsquedas
CREATE INDEX "booking_groups_tax_id_idx" ON "public"."booking_groups"("tax_id");
CREATE INDEX "reservations_booking_type_idx" ON "public"."reservations"("booking_type");