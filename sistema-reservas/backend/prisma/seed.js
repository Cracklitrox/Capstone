const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Importamos faker de forma dinámica dentro de la función async
  const { faker } = await import('@faker-js/faker');

  console.log('🏁 Iniciando el script de seed...');

  // 1. LIMPIEZA DE LA BASE DE DATOS
  console.log('🧹 Limpiando la base de datos...');
  await prisma.reservation_rooms.deleteMany({});
  await prisma.reservation_services.deleteMany({});
  await prisma.payments.deleteMany({});
  await prisma.reservation_guests.deleteMany({});
  await prisma.reservations.deleteMany({});
  await prisma.user_roles.deleteMany({});
  await prisma.users.deleteMany({});
  await prisma.rooms.deleteMany({});
  await prisma.room_types.deleteMany({});
  await prisma.services.deleteMany({});
  await prisma.promotions.deleteMany({});
  await prisma.roles.deleteMany({});
  console.log('✅ Base de datos limpia.');

  // 2. CREACIÓN DE DATOS FUNDAMENTALES
  console.log('🌱 Creando datos fundamentales...');
  const roles = await prisma.roles.createManyAndReturn({
    data: [
      { name: 'administrator', description: 'Acceso total al sistema.' },
      { name: 'receptionist', description: 'Gestión de reservas y huéspedes.' },
      { name: 'guest', description: 'Cliente del hotel con acceso limitado.' },
    ],
  });
  const adminRole = roles.find(r => r.name === 'administrator');
  const receptionistRole = roles.find(r => r.name === 'receptionist');
  const guestRole = roles.find(r => r.name === 'guest');
  console.log(`✅ Roles creados: ${roles.length}`);

  const roomTypes = await prisma.room_types.createManyAndReturn({
    data: [
      { name: 'Individual', base_capacity: 1, description: 'Habitación para una persona.' },
      { name: 'Doble', base_capacity: 2, description: 'Habitación con cama matrimonial o dos camas.' },
      { name: 'Suite Junior', base_capacity: 2, description: 'Suite espaciosa con área de estar.' },
      { name: 'Suite Presidencial', base_capacity: 4, description: 'La mejor habitación del hotel, con múltiples espacios.' },
    ],
  });
  console.log(`✅ Tipos de Habitación creados: ${roomTypes.length}`);

  const roomsData = [];
  for (let i = 1; i <= 30; i++) {
    const floor = Math.ceil(i / 10) + 1;
    const roomNumber = `${floor}0${i % 10}`;
    const roomType = faker.helpers.arrayElement(roomTypes);
    roomsData.push({
      room_number: roomNumber,
      floor: floor,
      room_type_id: roomType.id,
      capacity: roomType.base_capacity + faker.number.int({ min: 0, max: 1 }),
      base_price: faker.number.int({ min: 50000, max: 250000 }),
      status: 'available',
    });
  }
  const rooms = await prisma.rooms.createManyAndReturn({ data: roomsData });
  console.log(`✅ Habitaciones creadas: ${rooms.length}`);

  const services = await prisma.services.createManyAndReturn({
    data: [
      { name: 'Desayuno Buffet', unit: 'per_person', price: 15000 },
      { name: 'Estacionamiento', unit: 'per_night', price: 10000 },
      { name: 'Servicio de Lavandería', unit: 'per_unit', price: 5000 },
      { name: 'Acceso a Spa', unit: 'per_person', price: 25000 },
    ],
  });
  console.log(`✅ Servicios creados: ${services.length}`);

  const promotions = await prisma.promotions.createManyAndReturn({
    data: [
        { code: 'WEEKEND20', description: '20% de descuento en fines de semana', discount_percentage: 20.00 },
        { code: 'LARGAESTANCIA15', description: '15% de descuento para estancias de 5+ noches', discount_percentage: 15.00 },
    ]
  });
  console.log(`✅ Promociones creadas: ${promotions.length}`);

  // 3. CREACIÓN DE USUARIOS
  console.log('👤 Creando usuarios...');
  const password = await bcrypt.hash('password123', 10);
  
  await prisma.users.create({
    data: {
      rut: '11111111', rut_dv: '1', first_name: 'Super', paternal_last_name: 'Admin',
      email: 'super.admin@hotel.com', password_hash: password, status: 'active',
      user_roles: { create: { role_id: adminRole.id } },
    },
  });

  const receptionists = [];
  for (let i = 0; i < 2; i++) {
    const user = await prisma.users.create({
      data: {
        rut: faker.string.numeric(8), rut_dv: faker.string.numeric(1),
        first_name: faker.person.firstName(), paternal_last_name: faker.person.lastName(),
        email: faker.internet.email(), password_hash: password, status: 'active',
        user_roles: { create: { role_id: receptionistRole.id } },
      },
    });
    receptionists.push(user);
  }

  const guests = [];
  for (let i = 0; i < 20; i++) {
    const user = await prisma.users.create({
      data: {
        rut: faker.string.numeric(8), rut_dv: faker.string.numeric(1),
        first_name: faker.person.firstName(), paternal_last_name: faker.person.lastName(),
        email: faker.internet.email(), password_hash: password, status: 'active',
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

  // 4. CREACIÓN DE RESERVACIONES
  console.log('🏨 Creando reservaciones complejas...');
  for (let i = 0; i < 25; i++) {
    const mainGuest = faker.helpers.arrayElement(guests);
    const receptionist = faker.helpers.arrayElement(receptionists);
    const checkIn = faker.date.between({ from: '2025-09-01T00:00:00.000Z', to: '2026-03-01T00:00:00.000Z' });
    const checkOut = new Date(checkIn.getTime() + faker.number.int({ min: 1, max: 7 }) * 24 * 60 * 60 * 1000);
    const reservedRoom = faker.helpers.arrayElement(rooms);
    const subtotalRoom = reservedRoom.base_price * ( (checkOut - checkIn) / (1000 * 60 * 60 * 24) );
    const service = faker.helpers.arrayElement(services);
    const subtotalService = service.price * faker.number.int({ min: 1, max: 2 });
    const totalAmount = subtotalRoom + subtotalService;

    await prisma.reservations.create({
      data: {
        code: `RES-${faker.string.alphanumeric(10).toUpperCase()}`,
        main_guest_id: mainGuest.id,
        receptionist_id: receptionist.id,
        channel: faker.helpers.arrayElement(['web', 'reception', 'chatbot']),
        status: faker.helpers.arrayElement(['confirmed', 'pending', 'completed']),
        check_in_date: checkIn,
        check_out_date: checkOut,
        guest_count: faker.number.int({ min: 1, max: reservedRoom.capacity }),
        total_amount: totalAmount,
        paid_amount: faker.helpers.arrayElement([0, totalAmount / 2, totalAmount]),
        reservation_rooms: {
          create: {
            room_id: reservedRoom.id,
            start_date: checkIn,
            end_date: checkOut,
            unit_price: reservedRoom.base_price,
            subtotal: subtotalRoom,
          },
        },
        reservation_services: {
          create: {
            service_id: service.id,
            quantity: subtotalService / service.price,
            unit_price: service.price,
            subtotal: subtotalService,
          },
        },
        payments: {
          create: {
            amount: totalAmount / 2,
            payment_method: faker.helpers.arrayElement(['credit_card', 'bank_transfer']),
            status: 'confirmed',
            is_deposit: true
          }
        },
      },
    });
  }
  console.log('✅ 25 Reservaciones creadas.');
  console.log('🎉 Seed finalizado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });