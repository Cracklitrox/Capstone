-- ========= PASO 1: CREACIÓN DE TIPOS ENUMERADOS (ENUMs) =========
-- Estos tipos aseguran que solo valores permitidos se inserten en ciertas columnas.

CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');
CREATE TYPE role_name_enum AS ENUM ('administrator', 'receptionist', 'guest');
CREATE TYPE user_status_enum AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE room_status_enum AS ENUM ('available', 'pending', 'occupied', 'unavailable', 'cleaning', 'maintenance');
CREATE TYPE reservation_status_enum AS ENUM ('pending', 'confirmed', 'in_progress', 'canceled', 'completed', 'no_show');
CREATE TYPE reservation_channel_enum AS ENUM ('chatbot', 'reception', 'walk_in', 'web');
CREATE TYPE payment_method_enum AS ENUM ('bank_transfer', 'cash', 'credit_card', 'debit_card');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'confirmed', 'rejected', 'refunded');
CREATE TYPE service_unit_enum AS ENUM ('per_night', 'per_person', 'per_unit');
CREATE TYPE maintenance_category_enum AS ENUM ('room', 'common_area', 'other');
CREATE TYPE maintenance_status_enum AS ENUM ('pending', 'in_progress', 'delayed', 'completed', 'blocked');
CREATE TYPE maintenance_priority_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE notification_status_enum AS ENUM ('read', 'unread', 'archived');
CREATE TYPE alert_type_enum AS ENUM ('reservation', 'payment', 'maintenance', 'guest');
CREATE TYPE alert_status_enum AS ENUM ('pending', 'resolved', 'ignored');
CREATE TYPE error_severity_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE error_status_enum AS ENUM ('pending', 'in_review', 'resolved');


-- ========= PASO 2: CREACIÓN DE TABLAS =========

-- Sección 1: Identidad y Seguridad
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name role_name_enum UNIQUE NOT NULL,
    description VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    rut VARCHAR(8) UNIQUE NOT NULL,
    rut_dv CHAR(1) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    paternal_last_name VARCHAR(80) NOT NULL,
    maternal_last_name VARCHAR(80),
    email VARCHAR(150) UNIQUE NOT NULL,
    phone_number VARCHAR(30),
    birth_date DATE,
    gender gender_enum,
    country VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    commune VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    status user_status_enum DEFAULT 'active',
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

CREATE TABLE guest_details (
    user_id INT PRIMARY KEY,
    travels_with_children BOOLEAN,
    special_requests VARCHAR(200),
    observations VARCHAR(250),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sección 2: Habitaciones e Inventario
CREATE TABLE room_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    base_capacity INT NOT NULL,
    description VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    room_number VARCHAR(10) UNIQUE NOT NULL,
    floor INT,
    room_type_id INT NOT NULL,
    capacity INT NOT NULL,
    base_price INT NOT NULL,
    status room_status_enum DEFAULT 'available',
    description VARCHAR(250),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE RESTRICT
);

-- Sección 3: Reservas, Servicios y Políticas
CREATE TABLE seasons (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    price_modifier DECIMAL(5, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE promotions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_percentage DECIMAL(5, 2) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    main_guest_id INT NOT NULL,
    channel reservation_channel_enum,
    status reservation_status_enum DEFAULT 'pending',
    check_in_date TIMESTAMP NOT NULL,
    check_out_date TIMESTAMP NOT NULL,
    guest_count INT NOT NULL,
    total_amount INT,
    paid_amount INT DEFAULT 0,
    receptionist_id INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (main_guest_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (receptionist_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE reservation_guests (
    id SERIAL PRIMARY KEY,
    reservation_id INT NOT NULL,
    guest_id INT NOT NULL,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    FOREIGN KEY (guest_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE reservation_rooms (
    id SERIAL PRIMARY KEY,
    reservation_id INT NOT NULL,
    room_id INT NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    unit_price INT NOT NULL,
    subtotal INT NOT NULL,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT
);

CREATE TABLE reservation_promotions (
    id SERIAL PRIMARY KEY,
    reservation_id INT NOT NULL,
    promotion_id INT NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE RESTRICT
);

CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(80) UNIQUE NOT NULL,
    unit service_unit_enum NOT NULL,
    price INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE reservation_services (
    id SERIAL PRIMARY KEY,
    reservation_id INT NOT NULL,
    service_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price INT NOT NULL,
    subtotal INT NOT NULL,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT
);

-- Sección 4: Pagos
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    reservation_id INT NOT NULL,
    payment_method payment_method_enum,
    status payment_status_enum DEFAULT 'pending',
    amount INT NOT NULL,
    is_deposit BOOLEAN DEFAULT FALSE,
    transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

-- Sección 5: Limpieza
CREATE TABLE cleaning_records (
    id SERIAL PRIMARY KEY,
    room_id INT NOT NULL,
    receptionist_id INT NOT NULL,
    record_date TIMESTAMP DEFAULT NOW(),
    observations VARCHAR(250),
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (receptionist_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Sección 6: Mantenimiento y Comunicación
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    type alert_type_enum NOT NULL,
    status alert_status_enum DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    origin_user_id INT,
    reservation_id INT,
    payment_id INT,
    detail VARCHAR(250),
    FOREIGN KEY (origin_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
);

CREATE TABLE maintenance_tasks (
    id SERIAL PRIMARY KEY,
    alert_id INT,
    room_id INT,
    category maintenance_category_enum NOT NULL,
    description TEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    status maintenance_status_enum,
    priority maintenance_priority_enum,
    created_by_id INT NOT NULL,
    last_updated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE SET NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL,
    target_role_id INT,
    title VARCHAR(120) NOT NULL,
    message TEXT,
    sent_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE notification_read_status (
    id SERIAL PRIMARY KEY,
    notification_id INT NOT NULL,
    user_id INT NOT NULL,
    status notification_status_enum DEFAULT 'unread',
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE alert_read_status (
    id SERIAL PRIMARY KEY,
    alert_id INT NOT NULL,
    user_id INT NOT NULL,
    status alert_status_enum DEFAULT 'pending',
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sección 7: Auditoría y Errores
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INT,
    user_role VARCHAR(30),
    action VARCHAR(80),
    timestamp TIMESTAMP DEFAULT NOW(),
    affected_table VARCHAR(60),
    record_id INT,
    details TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE system_errors (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    user_id INT,
    user_role VARCHAR(30),
    description TEXT,
    origin_module VARCHAR(40),
    severity error_severity_enum,
    status error_status_enum DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ========= FIN DEL SCRIPT =========