-- Agregar 'multiple' al enum payment_method_enum
ALTER TYPE payment_method_enum ADD VALUE IF NOT EXISTS 'multiple';

-- Crear tabla de asignaciones huésped-habitación
CREATE TABLE room_guest_assignments (
  id SERIAL PRIMARY KEY,
  reservation_room_id INT NOT NULL REFERENCES reservation_rooms(id) ON DELETE CASCADE,
  guest_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Para cambios de habitación futuros
  assigned_at TIMESTAMP DEFAULT NOW(),
  valid_from TIMESTAMP NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMP,
  
  change_reason VARCHAR(100),
  changed_by_user_id INT REFERENCES users(id),
  
  -- Soft delete
  deleted_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_room_guest_active ON room_guest_assignments(reservation_room_id, guest_id) 
  WHERE deleted_at IS NULL AND valid_to IS NULL;

CREATE INDEX idx_room_guest_deleted ON room_guest_assignments(deleted_at) 
  WHERE deleted_at IS NOT NULL;

-- Agregar soft delete a tablas críticas
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE reservation_rooms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE reservation_guests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE reservation_services ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE booking_groups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Índices para soft delete
CREATE INDEX idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_reservations_deleted ON reservations(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_reservation_rooms_deleted ON reservation_rooms(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_reservation_guests_deleted ON reservation_guests(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_payments_deleted ON payments(deleted_at) WHERE deleted_at IS NOT NULL;