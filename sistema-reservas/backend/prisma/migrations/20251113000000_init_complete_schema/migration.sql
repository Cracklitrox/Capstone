-- CreateEnum
CREATE TYPE "alert_status_enum" AS ENUM ('pending', 'resolved', 'ignored');

-- CreateEnum
CREATE TYPE "alert_priority_enum" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "alert_type_enum" AS ENUM ('reservation', 'payment', 'maintenance', 'guest', 'booking_request', 'checkout');

-- CreateEnum
CREATE TYPE "error_severity_enum" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "error_status_enum" AS ENUM ('pending', 'in_review', 'resolved');

-- CreateEnum
CREATE TYPE "gender_enum" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "maintenance_category_enum" AS ENUM ('room', 'common_area', 'other');

-- CreateEnum
CREATE TYPE "maintenance_priority_enum" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "maintenance_status_enum" AS ENUM ('pending', 'in_progress', 'delayed', 'completed', 'blocked');

-- CreateEnum
CREATE TYPE "notification_status_enum" AS ENUM ('read', 'unread', 'archived');

-- CreateEnum
CREATE TYPE "notification_category_enum" AS ENUM ('general', 'operational', 'administrative', 'alert', 'maintenance', 'reservation', 'payment');

-- CreateEnum
CREATE TYPE "payment_method_enum" AS ENUM ('bank_transfer', 'cash', 'credit_card', 'debit_card', 'multiple');

-- CreateEnum
CREATE TYPE "payment_status_enum" AS ENUM ('pending', 'confirmed', 'rejected', 'refunded');

-- CreateEnum
CREATE TYPE "reservation_channel_enum" AS ENUM ('chatbot', 'reception', 'in_person', 'walk_in', 'web');

-- CreateEnum
CREATE TYPE "reservation_status_enum" AS ENUM ('pending', 'confirmed', 'ready_for_checkin', 'in_progress', 'pending_checkout', 'canceled', 'completed', 'no_show');

-- CreateEnum
CREATE TYPE "role_name_enum" AS ENUM ('administrator', 'receptionist', 'guest');

-- CreateEnum
CREATE TYPE "room_status_enum" AS ENUM ('available', 'pending', 'occupied', 'unavailable', 'cleaning', 'maintenance');

-- CreateEnum
CREATE TYPE "service_unit_enum" AS ENUM ('per_night', 'per_person', 'per_unit', 'per_room', 'custom');

-- CreateEnum
CREATE TYPE "user_status_enum" AS ENUM ('active', 'inactive', 'suspended');

-- CreateEnum
CREATE TYPE "action_type_enum" AS ENUM ('CREATE_RESERVATION', 'UPDATE_RESERVATION', 'CANCEL_RESERVATION', 'CHECK_IN', 'CHECK_OUT', 'UPDATE_ROOM_STATUS', 'CREATE_MAINTENANCE', 'UPDATE_MAINTENANCE', 'COMPLETE_MAINTENANCE', 'CREATE_CLEANING', 'COMPLETE_CLEANING', 'CREATE_PAYMENT', 'UPDATE_PAYMENT', 'CONFIRM_PAYMENT', 'REJECT_PAYMENT', 'ANNUL_PAYMENT', 'RETRY_PAYMENT', 'REQUEST_PAYMENT_ANNULMENT', 'CREATE_USER', 'UPDATE_USER', 'UPDATE_PROFILE', 'CHANGE_PASSWORD');

-- CreateEnum
CREATE TYPE "organization_type_enum" AS ENUM ('empresa', 'institucion_educativa', 'institucion_gubernamental', 'ong', 'tour_operador', 'agencia_viajes', 'evento_corporativo', 'otro');

-- CreateEnum
CREATE TYPE "payment_type_enum" AS ENUM ('full', 'half_upfront', 'daily');

-- CreateEnum
CREATE TYPE "additional_charge_enum" AS ENUM ('minibar', 'room_damage', 'extra_service', 'penalty', 'other');

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "user_role" VARCHAR(30),
    "action" "action_type_enum",
    "timestamp" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "affected_table" VARCHAR(60),
    "record_id" INTEGER,
    "details" TEXT,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_read_status" (
    "id" SERIAL NOT NULL,
    "alert_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status" "alert_status_enum" DEFAULT 'pending',
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "alert_read_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "type" "alert_type_enum" NOT NULL,
    "status" "alert_status_enum" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_viewed_at" TIMESTAMP(6),
    "reservation_id" INTEGER,
    "detail" VARCHAR(250),
    "full_summary" JSONB,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cleaning_records" (
    "id" SERIAL NOT NULL,
    "room_id" INTEGER NOT NULL,
    "receptionist_id" INTEGER NOT NULL,
    "record_date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "observations" VARCHAR(250),
    "is_completed" BOOLEAN DEFAULT false,
    "completed_at" TIMESTAMP(6),

    CONSTRAINT "cleaning_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_details" (
    "user_id" INTEGER NOT NULL,
    "travels_with_children" BOOLEAN,
    "children_under_four" INTEGER DEFAULT 0,
    "special_requests" VARCHAR(200),
    "observations" VARCHAR(250),

    CONSTRAINT "guest_details_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "maintenance_tasks" (
    "id" SERIAL NOT NULL,
    "alert_id" INTEGER,
    "room_id" INTEGER,
    "category" "maintenance_category_enum" NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(6),
    "end_date" TIMESTAMP(6),
    "status" "maintenance_status_enum",
    "priority" "maintenance_priority_enum",
    "created_by_id" INTEGER NOT NULL,
    "last_updated_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_read_status" (
    "id" SERIAL NOT NULL,
    "notification_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status" "notification_status_enum" DEFAULT 'unread',
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "notification_read_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "target_role_id" INTEGER,
    "title" VARCHAR(120) NOT NULL,
    "message" TEXT NOT NULL,
    "category" "notification_category_enum" DEFAULT 'general',
    "sent_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "reservation_id" INTEGER NOT NULL,
    "payment_method" "payment_method_enum",
    "payment_type" "payment_type_enum" DEFAULT 'full',
    "status" "payment_status_enum" DEFAULT 'pending',
    "amount" INTEGER NOT NULL,
    "is_deposit" BOOLEAN DEFAULT false,
    "payment_sequence" INTEGER DEFAULT 1,
    "notes" TEXT,
    "transaction_id" VARCHAR(255),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "discount_percentage" DECIMAL(5,2) NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_guests" (
    "id" SERIAL NOT NULL,
    "reservation_id" INTEGER NOT NULL,
    "guest_id" INTEGER NOT NULL,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "reservation_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_promotions" (
    "id" SERIAL NOT NULL,
    "reservation_id" INTEGER NOT NULL,
    "promotion_id" INTEGER NOT NULL,
    "applied_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_rooms" (
    "id" SERIAL NOT NULL,
    "reservation_id" INTEGER NOT NULL,
    "room_id" INTEGER NOT NULL,
    "start_date" TIMESTAMP(6) NOT NULL,
    "end_date" TIMESTAMP(6) NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "reservation_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_services" (
    "id" SERIAL NOT NULL,
    "reservation_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "specific_dates" TEXT,
    "daily_rate" INTEGER,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "reservation_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "main_guest_id" INTEGER NOT NULL,
    "channel" "reservation_channel_enum",
    "status" "reservation_status_enum" DEFAULT 'pending',
    "check_in_date" TIMESTAMP(6) NOT NULL,
    "check_out_date" TIMESTAMP(6) NOT NULL,
    "guest_count" INTEGER NOT NULL,
    "total_amount" INTEGER,
    "paid_amount" INTEGER DEFAULT 0,
    "payment_blocked" BOOLEAN DEFAULT false,
    "receptionist_id" INTEGER,
    "booking_type" VARCHAR(20) DEFAULT 'individual',
    "booking_group_id" INTEGER,
    "stay_type" VARCHAR(20) DEFAULT 'short',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" "role_name_enum" NOT NULL,
    "description" VARCHAR(200),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "base_capacity" INTEGER NOT NULL,
    "description" TEXT,
    "bed_configuration" VARCHAR(200),
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" SERIAL NOT NULL,
    "room_number" VARCHAR(10) NOT NULL,
    "floor" INTEGER,
    "room_type_id" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "base_price" INTEGER NOT NULL,
    "status" "room_status_enum" DEFAULT 'available',
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "price_modifier" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "unit" "service_unit_enum" NOT NULL,
    "price" INTEGER NOT NULL,
    "allows_custom_price" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_errors" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER,
    "user_role" VARCHAR(30),
    "description" TEXT,
    "origin_module" VARCHAR(40),
    "severity" "error_severity_enum",
    "status" "error_status_enum" DEFAULT 'pending',

    CONSTRAINT "system_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "identification_number" VARCHAR(15) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "paternal_last_name" VARCHAR(80) NOT NULL,
    "maternal_last_name" VARCHAR(80),
    "email" VARCHAR(150),
    "phone_number" VARCHAR(30),
    "birth_date" DATE,
    "gender" "gender_enum",
    "country" VARCHAR(100),
    "region" VARCHAR(100),
    "city" VARCHAR(100),
    "password_hash" VARCHAR(255),
    "can_login" BOOLEAN DEFAULT true,
    "status" "user_status_enum" DEFAULT 'active',
    "is_fully_registered" BOOLEAN DEFAULT true,
    "last_login_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_history" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "default_theme" VARCHAR(20) NOT NULL DEFAULT 'system',
    "default_dashboard" VARCHAR(50),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_groups" (
    "id" SERIAL NOT NULL,
    "group_name" VARCHAR(150) NOT NULL,
    "organization_type" "organization_type_enum" NOT NULL,
    "tax_id" VARCHAR(20),
    "contact_name" VARCHAR(150) NOT NULL,
    "contact_email" VARCHAR(150) NOT NULL,
    "contact_phone" VARCHAR(30),
    "billing_address" TEXT,
    "special_terms" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "booking_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "breakfast_menu_items" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "breakfast_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_service_daily" (
    "id" SERIAL NOT NULL,
    "reservation_room_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,
    "service_date" DATE NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_service_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_drafts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "draft_data" JSONB NOT NULL,
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(6),

    CONSTRAINT "reservation_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_guest_assignments" (
    "id" SERIAL NOT NULL,
    "reservation_room_id" INTEGER NOT NULL,
    "guest_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_from" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMP(6),
    "change_reason" VARCHAR(100),
    "changed_by_user_id" INTEGER,
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "room_guest_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" SERIAL NOT NULL,
    "setting_key" VARCHAR(100) NOT NULL,
    "setting_value" TEXT NOT NULL,
    "description" TEXT,
    "data_type" VARCHAR(20) NOT NULL DEFAULT 'string',
    "category" VARCHAR(50),
    "is_editable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "updated_by_id" INTEGER,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_history" (
    "id" SERIAL NOT NULL,
    "reservation_id" INTEGER NOT NULL,
    "change_type" VARCHAR(50) NOT NULL,
    "field_changed" VARCHAR(100),
    "old_value" TEXT,
    "new_value" TEXT,
    "changed_by_user_id" INTEGER,
    "change_reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "additional_charges" (
    "id" SERIAL NOT NULL,
    "reservation_id" INTEGER NOT NULL,
    "room_id" INTEGER,
    "service_id" INTEGER,
    "charge_type" "additional_charge_enum" NOT NULL,
    "description" VARCHAR(250) NOT NULL,
    "amount" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "subtotal" INTEGER NOT NULL,
    "charged_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "additional_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alert_read_status_alert_id_user_id_key" ON "alert_read_status"("alert_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_code_key" ON "reservations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "room_types_name_key" ON "room_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_room_number_key" ON "rooms"("room_number");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_name_key" ON "seasons"("name");

-- CreateIndex
CREATE UNIQUE INDEX "services_name_key" ON "services"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_identification_number_key" ON "users"("identification_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "room_guest_assignments_reservation_room_id_guest_id_deleted_idx" ON "room_guest_assignments"("reservation_room_id", "guest_id", "deleted_at", "valid_to");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_setting_key_key" ON "system_settings"("setting_key");

-- CreateIndex
CREATE INDEX "reservation_history_reservation_id_created_at_idx" ON "reservation_history"("reservation_id", "created_at");

-- CreateIndex
CREATE INDEX "reservation_history_change_type_idx" ON "reservation_history"("change_type");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "alert_read_status" ADD CONSTRAINT "alert_read_status_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "alert_read_status" ADD CONSTRAINT "alert_read_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cleaning_records" ADD CONSTRAINT "cleaning_records_receptionist_id_fkey" FOREIGN KEY ("receptionist_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cleaning_records" ADD CONSTRAINT "cleaning_records_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "guest_details" ADD CONSTRAINT "guest_details_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notification_read_status" ADD CONSTRAINT "notification_read_status_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notification_read_status" ADD CONSTRAINT "notification_read_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_target_role_id_fkey" FOREIGN KEY ("target_role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reservation_guests" ADD CONSTRAINT "reservation_guests_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reservation_guests" ADD CONSTRAINT "reservation_guests_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reservation_promotions" ADD CONSTRAINT "reservation_promotions_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reservation_promotions" ADD CONSTRAINT "reservation_promotions_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reservation_rooms" ADD CONSTRAINT "reservation_rooms_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reservation_rooms" ADD CONSTRAINT "reservation_rooms_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reservation_services" ADD CONSTRAINT "reservation_services_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reservation_services" ADD CONSTRAINT "reservation_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_main_guest_id_fkey" FOREIGN KEY ("main_guest_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_receptionist_id_fkey" FOREIGN KEY ("receptionist_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_booking_group_id_fkey" FOREIGN KEY ("booking_group_id") REFERENCES "booking_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_errors" ADD CONSTRAINT "system_errors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_service_daily" ADD CONSTRAINT "room_service_daily_reservation_room_id_fkey" FOREIGN KEY ("reservation_room_id") REFERENCES "reservation_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_service_daily" ADD CONSTRAINT "room_service_daily_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_drafts" ADD CONSTRAINT "reservation_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_guest_assignments" ADD CONSTRAINT "room_guest_assignments_reservation_room_id_fkey" FOREIGN KEY ("reservation_room_id") REFERENCES "reservation_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_guest_assignments" ADD CONSTRAINT "room_guest_assignments_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_guest_assignments" ADD CONSTRAINT "room_guest_assignments_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reservation_history" ADD CONSTRAINT "reservation_history_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reservation_history" ADD CONSTRAINT "reservation_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "additional_charges" ADD CONSTRAINT "additional_charges_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "additional_charges" ADD CONSTRAINT "additional_charges_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "additional_charges" ADD CONSTRAINT "additional_charges_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "additional_charges" ADD CONSTRAINT "additional_charges_charged_by_id_fkey" FOREIGN KEY ("charged_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

