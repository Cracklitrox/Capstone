const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Importamos faker de forma dinámica.
async function getFaker() {
  const { faker } = await import('@faker-js/faker/locale/es'); // Usamos el localizador en español para datos más realistas.
  return faker;
}

const prisma = new PrismaClient();

/**
 * Limpia todas las tablas de la base de datos en el orden correcto para evitar errores de constraints.
 */
async function cleanDatabase() {
  console.log('🧹 Limpiando la base de datos...');
  // El orden es importante para respetar las relaciones (foreign keys)
  await prisma.notification_read_status.deleteMany({});
  await prisma.notifications.deleteMany({});
  await prisma.alert_read_status.deleteMany({});
  await prisma.maintenance_tasks.deleteMany({});
  await prisma.alerts.deleteMany({});
  await prisma.system_errors.deleteMany({});
  await prisma.activity_logs.deleteMany({});
  await prisma.cleaning_records.deleteMany({});
  await prisma.reservation_promotions.deleteMany({});
  await prisma.reservation_services.deleteMany({});
  await prisma.reservation_rooms.deleteMany({});
  await prisma.payments.deleteMany({});
  await prisma.reservation_guests.deleteMany({});
  await prisma.reservations.deleteMany({});
  await prisma.user_roles.deleteMany({});
  await prisma.guest_details.deleteMany({});
  await prisma.users.deleteMany({});
  await prisma.rooms.deleteMany({});
  await prisma.room_types.deleteMany({});
  await prisma.services.deleteMany({});
  await prisma.promotions.deleteMany({});
  await prisma.seasons.deleteMany({});
  await prisma.roles.deleteMany({});
  console.log('✅ Base de datos limpia.');
}

/**
 * Crea los datos maestros y fundamentales del sistema.
 */
async function createCoreData() {
  console.log('🌱 Creando datos fundamentales...');
  
  // Roles
  const roles = await prisma.roles.createManyAndReturn({
    data: [
      { name: 'administrator', description: 'Acceso total al sistema.' },
      { name: 'receptionist', description: 'Gestión de reservas y huéspedes.' },
      { name: 'guest', description: 'Cliente del hotel con acceso limitado.' },
    ],
  });
  console.log(`✅ Roles creados: ${roles.length}`);

  // Tipos de Habitación
  const roomTypes = await prisma.room_types.createManyAndReturn({
    data: [
      { name: 'Individual', base_capacity: 1, description: 'Habitación para una persona.' },
      { name: 'Doble', base_capacity: 2, description: 'Habitación con cama matrimonial o dos camas.' },
      { name: 'Suite Junior', base_capacity: 2, description: 'Suite espaciosa con área de estar.' },
      { name: 'Suite Presidencial', base_capacity: 4, description: 'La mejor habitación del hotel, con múltiples espacios.' },
    ],
  });
  console.log(`✅ Tipos de Habitación creados: ${roomTypes.length}`);

  // Servicios
  const services = await prisma.services.createManyAndReturn({
    data: [
      { name: 'Desayuno Buffet', unit: 'per_person', price: 15000 },
      { name: 'Estacionamiento', unit: 'per_night', price: 10000 },
      { name: 'Servicio de Lavandería', unit: 'per_unit', price: 5000 },
      { name: 'Acceso a Spa', unit: 'per_person', price: 25000 },
    ],
  });
  console.log(`✅ Servicios creados: ${services.length}`);

  // Promociones
  const promotions = await prisma.promotions.createManyAndReturn({
    data: [
        { code: 'WEEKEND20', description: '20% de descuento en fines de semana', discount_percentage: 20.00, start_date: new Date('2025-01-01'), end_date: new Date('2026-12-31') },
        { code: 'LARGAESTANCIA15', description: '15% de descuento para estancias de 5+ noches', discount_percentage: 15.00, start_date: new Date('2025-01-01'), end_date: new Date('2026-12-31') },
    ]
  });
  console.log(`✅ Promociones creadas: ${promotions.length}`);

    // Temporadas (Seasons)
  await prisma.seasons.createMany({
    data: [
      { name: 'Temporada Alta', start_date: new Date('2025-12-15'), end_date: new Date('2026-02-28'), price_modifier: 1.50, is_active: true },
      { name: 'Temporada Baja', start_date: new Date('2026-03-01'), end_date: new Date('2026-12-14'), price_modifier: 1.00, is_active: true },
    ]
  });
  console.log('✅ Temporadas creadas.');

  return { roles, roomTypes, services, promotions };
}

/**
 * Crea usuarios de prueba, incluyendo usuarios predecibles para desarrollo.
 */
async function createUsers(faker, roles) {
  console.log('👤 Creando usuarios...');
  const password = await bcrypt.hash('password123', 10);
  
  const adminRole = roles.find(r => r.name === 'administrator');
  const receptionistRole = roles.find(r => r.name === 'receptionist');
  const guestRole = roles.find(r => r.name === 'guest');

  // Usuario Administrador (Predecible para pruebas)
  await prisma.users.create({
    data: {
      rut: '11111111', rut_dv: '1', first_name: 'Super', paternal_last_name: 'Admin',
      email: 'super.admin@hotel.com', password_hash: password, status: 'active',
      user_roles: { create: { role_id: adminRole.id } },
    },
  });

  // Usuarios Recepcionistas (Predecibles para pruebas)
  const receptionist1 = await prisma.users.create({
    data: {
      rut: '22222222', rut_dv: '2', first_name: 'Carlos', paternal_last_name: 'Gacitúa',
      email: 'carlos.recepcionista@hotel.com', password_hash: password, status: 'active',
      user_roles: { create: { role_id: receptionistRole.id } },
    },
  });
  const receptionist2 = await prisma.users.create({
    data: {
        rut: '33333333', rut_dv: '3', first_name: 'Juan', paternal_last_name: 'Ampuero',
        email: 'juan.recepcionista@hotel.com', password_hash: password, status: 'active',
        user_roles: { create: { role_id: receptionistRole.id } },
      },
  });
  const receptionists = [receptionist1, receptionist2];

  // Creación masiva de Huéspedes
  const guests = [];
  for (let i = 0; i < 20; i++) {
    const user = await prisma.users.create({
      data: {
        rut: faker.string.numeric(8), rut_dv: faker.string.numeric(1),
        first_name: faker.person.firstName(), paternal_last_name: faker.person.lastName(),
        email: faker.internet.email(), password_hash: password, status: 'active',
        country: 'Chile',
        user_roles: { create: { role_id: guestRole.id } },
        guest_details: {
            create: {
                special_requests: faker.helpers.arrayElement(['Piso alto', 'Cerca del ascensor', 'Sin peticiones especiales']),
                travels_with_children: faker.datatype.boolean(),
            }
        }
      },
    });
    guests.push(user);
  }
  console.log(`✅ Usuarios creados: 1 Admin, ${receptionists.length} Recepcionistas, ${guests.length} Huéspedes.`);
  return { receptionists, guests, adminRole, receptionistRole };
}

/**
 * Crea las habitaciones del hotel con diferentes estados.
 */
async function createRooms(faker, roomTypes) {
    console.log('🚪 Creando habitaciones...');
    const roomsData = [];
    // Estados distribuidos por rango solicitado
    for (let i = 1; i <= 30; i++) {
      const floor = Math.ceil(i / 10);
      const roomNumber = `${floor}0${i % 10}`;
      const roomType = faker.helpers.arrayElement(roomTypes);
      let status;
      if (i >= 1 && i <= 7) status = 'occupied';
      else if (i >= 8 && i <= 12) status = 'pending';
      else if (i >= 13 && i <= 24) status = 'available';
      else if (i >= 25 && i <= 27) status = 'cleaning';
      else status = 'maintenance';
      roomsData.push({
        room_number: roomNumber,
        floor: floor,
        room_type_id: roomType.id,
        capacity: roomType.base_capacity + faker.number.int({ min: 0, max: 1 }),
        base_price: faker.number.int({ min: 50000, max: 250000 }),
        status,
      });
    }
    const rooms = await prisma.rooms.createManyAndReturn({ data: roomsData });
    console.log(`✅ Habitaciones creadas: ${rooms.length}`);
    return rooms;
}

/**
 * Simula escenarios complejos: reservas, pagos, alertas, notificaciones, etc.
 */
async function createComplexScenarios(faker, { users, rooms, services, receptionists, adminRole, receptionistRole }) {
    console.log('🏨 Creando escenarios y reservaciones complejas...');

    // Escenario 1: Reserva completada en el pasado.
    const completedReservation = await prisma.reservations.create({
        data: {
          code: `RES-PAST-001`, main_guest_id: users.guests[0].id, receptionist_id: users.receptionists[0].id,
          channel: 'web', status: 'completed',
          check_in_date: faker.date.past({ years: 1 }), check_out_date: faker.date.past({ years: 1, refDate: new Date() - 3 * 24 * 60 * 60 * 1000 }),
          guest_count: 2, total_amount: 150000, paid_amount: 150000,
          reservation_rooms: { create: { room_id: rooms.find(r => r.status === 'available').id, start_date: new Date(), end_date: new Date(), unit_price: 150000, subtotal: 150000 } },
          payments: { create: { amount: 150000, payment_method: 'credit_card', status: 'confirmed' } }
        }
    });

    // Escenario 2: Reserva futura con pago pendiente, generando una alerta.
    const pendingPaymentReservation = await prisma.reservations.create({
        data: {
          code: `RES-ALERT-002`, main_guest_id: users.guests[1].id, receptionist_id: users.receptionists[1].id,
          channel: 'reception', status: 'pending',
          check_in_date: faker.date.soon({ days: 10 }), check_out_date: faker.date.soon({ days: 15 }),
          guest_count: 1, total_amount: 250000, paid_amount: 0,
          reservation_rooms: { create: { room_id: rooms.find(r => r.status === 'available' && r.id !== completedReservation.id).id, start_date: new Date(), end_date: new Date(), unit_price: 250000, subtotal: 250000 } }
        }
    });
    await prisma.alerts.create({
        data: {
            type: 'payment', status: 'pending', reservation_id: pendingPaymentReservation.id, origin_user_id: users.guests[1].id,
            detail: 'El huésped no ha realizado el pago del depósito para confirmar la reserva.'
        }
    });
    console.log("✅ Creada reserva con alerta de pago.");

  // Tareas de mantenimiento para todas las habitaciones en estado 'maintenance'
  const maintenanceDescriptions = [
    'Fuga de agua en el lavamanos.',
    'Problema eléctrico en la lámpara principal.',
    'Puerta del baño no cierra correctamente.',
    'Aire acondicionado no funciona.',
    'Mancha de humedad en la pared.',
    'Grieta en el techo.',
    'Ventana rota.',
    'Insectos encontrados en la habitación.',
    'Pintura descascarada en la pared.',
    'Cerradura de puerta dañada.'
  ];
  const maintenanceRooms = rooms.filter(r => r.status === 'maintenance');
  for (const room of maintenanceRooms) {
    await prisma.maintenance_tasks.create({
      data: {
        room_id: room.id,
        category: 'room',
        description: faker.helpers.arrayElement(maintenanceDescriptions),
        start_date: faker.date.recent({ days: 15 }),
        status: faker.helpers.arrayElement(['in_progress', 'pending', 'delayed']),
        priority: faker.helpers.arrayElement(['high', 'medium', 'critical']),
        created_by_id: faker.helpers.arrayElement(receptionists).id,
      }
    });
  }
  console.log(`✅ Tareas de mantenimiento creadas para habitaciones en mantenimiento (${maintenanceRooms.length}).`);

    // Escenario 4: Notificación del administrador a los recepcionistas.
    const notification = await prisma.notifications.create({
        data: {
            sender_id: (await prisma.users.findUnique({where: {email: 'super.admin@hotel.com'}})).id,
            target_role_id: receptionistRole.id,
            title: "Reunión de equipo semanal",
            message: "Recordatorio: La reunión de equipo es mañana a las 10:00 AM en la sala de conferencias."
        }
    });
    // Marcarla como no leída para un recepcionista
    await prisma.notification_read_status.create({
        data: { notification_id: notification.id, user_id: users.receptionists[1].id, status: 'unread' }
    });
    console.log("✅ Creada notificación para recepcionistas.");


    // Creación Masiva de Reservas Variadas
    for (let i = 0; i < 50; i++) {
        const mainGuest = faker.helpers.arrayElement(users.guests);
        const receptionist = faker.helpers.arrayElement(users.receptionists);
        const checkIn = faker.date.between({ from: '2025-09-01T00:00:00.000Z', to: '2026-03-01T00:00:00.000Z' });
        const checkOut = new Date(checkIn.getTime() + faker.number.int({ min: 1, max: 7 }) * 24 * 60 * 60 * 1000);
        // Permitir habitaciones en estado available, pending y occupied para simular reservas en curso
        const reservables = rooms.filter(r => ['available', 'pending', 'occupied'].includes(r.status));
        const reservedRoom = faker.helpers.arrayElement(reservables);
        const subtotalRoom = reservedRoom.base_price * ( (checkOut - checkIn) / (1000 * 60 * 60 * 24) );
        const service = faker.helpers.arrayElement(services);
        const subtotalService = service.price * faker.number.int({ min: 1, max: 2 });
        const totalAmount = subtotalRoom + subtotalService;
    
        await prisma.reservations.create({
          data: {
            code: `RES-${faker.string.alphanumeric(10).toUpperCase()}`,
            main_guest_id: mainGuest.id, receptionist_id: receptionist.id,
            channel: faker.helpers.arrayElement(['reception', 'chatbot']),
            status: faker.helpers.arrayElement(['pending', 'completed', 'canceled']),
            check_in_date: checkIn, check_out_date: checkOut,
            guest_count: faker.number.int({ min: 1, max: reservedRoom.capacity }),
            total_amount: totalAmount, paid_amount: faker.helpers.arrayElement([0, totalAmount / 2, totalAmount]),
            reservation_rooms: { create: { room_id: reservedRoom.id, start_date: checkIn, end_date: checkOut, unit_price: reservedRoom.base_price, subtotal: subtotalRoom } },
            reservation_services: { create: { service_id: service.id, quantity: subtotalService / service.price, unit_price: service.price, subtotal: subtotalService } },
            payments: { create: { amount: totalAmount / 2, payment_method: faker.helpers.arrayElement(['credit_card', 'bank_transfer', 'debit_card', 'cash']), status: 'confirmed', is_deposit: true } },
            reservation_guests: { create: { guest_id: faker.helpers.arrayElement(users.guests.filter(g => g.id !== mainGuest.id)).id } } // Agrega un acompañante
          },
        });
    }
    console.log('✅ 50 Reservaciones adicionales creadas.');
  // Creación de registros de limpieza realistas para habitaciones en estado 'cleaning'
  const cleaningRooms = rooms.filter(r => r.status === 'cleaning');
  for (const room of cleaningRooms) {
    await prisma.cleaning_records.create({
      data: {
        room_id: room.id,
        receptionist_id: faker.helpers.arrayElement(receptionists).id,
        record_date: faker.date.recent({ days: 10 }),
        observations: faker.helpers.arrayElement([
          'Limpieza profunda realizada, sin observaciones.',
          'Se encontró polvo bajo la cama, se limpió.',
          'Toallas y sábanas cambiadas.',
          'Baño desinfectado, sin anomalías.',
          'Se detectó olor a humedad, se ventiló la habitación.',
          'Se retiró basura acumulada en el escritorio.',
          'Manchas en alfombra tratadas con producto especial.',
          'Ventanas limpiadas y cortinas revisadas.'
        ]),
        is_completed: faker.datatype.boolean(),
        completed_at: faker.datatype.boolean() ? new Date() : null
      }
    });
  }
  console.log('✅ Registros de limpieza creados para habitaciones en limpieza.');
}


async function main() {
  const faker = await getFaker();
  console.log('🏁 Iniciando el script de seed...');
  
  await cleanDatabase();
  const coreData = await createCoreData();
  const userData = await createUsers(faker, coreData.roles);
  const rooms = await createRooms(faker, coreData.roomTypes);

  await createComplexScenarios(faker, {
    users: {
        guests: userData.guests,
        receptionists: userData.receptionists
    },
    rooms,
    services: coreData.services,
    receptionists: userData.receptionists,
    adminRole: userData.adminRole,
    receptionistRole: userData.receptionistRole
  });

  console.log('🎉 Seed finalizado exitosamente!');
}

module.exports = { main };