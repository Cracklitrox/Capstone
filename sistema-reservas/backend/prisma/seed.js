const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

async function getFaker() {
  const { faker } = await import("@faker-js/faker/locale/es");
  return faker;
}

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log("🧹 Limpiando la base de datos...");
  await prisma.notification_read_status.deleteMany({});
  await prisma.notifications.deleteMany({});
  await prisma.alert_read_status.deleteMany({});
  await prisma.maintenance_tasks.deleteMany({});
  await prisma.alerts.deleteMany({});
  await prisma.system_errors.deleteMany({});
  await prisma.activity_logs.deleteMany({});
  await prisma.cleaning_records.deleteMany({});
  await prisma.reservation_promotions.deleteMany({});
  await prisma.room_service_daily.deleteMany({});
  await prisma.reservation_services.deleteMany({});
  await prisma.reservation_rooms.deleteMany({});
  await prisma.payments.deleteMany({});
  await prisma.reservation_guests.deleteMany({});
  await prisma.reservations.deleteMany({});
  await prisma.reservation_drafts.deleteMany({});
  await prisma.user_roles.deleteMany({});
  await prisma.guest_details.deleteMany({});
  await prisma.LoginHistory.deleteMany({});
  await prisma.user_preferences.deleteMany({});
  await prisma.users.deleteMany({});
  await prisma.rooms.deleteMany({});
  await prisma.room_types.deleteMany({});
  await prisma.breakfast_menu_items.deleteMany({});
  await prisma.services.deleteMany({});
  await prisma.promotions.deleteMany({});
  await prisma.seasons.deleteMany({});
  await prisma.booking_groups.deleteMany({});
  await prisma.roles.deleteMany({});
  console.log("✅ Base de datos limpia.");
}

async function createCoreData() {
  console.log("🌱 Creando datos fundamentales...");

  // Roles
  const roles = await prisma.roles.createManyAndReturn({
    data: [
      { name: "administrator", description: "Acceso total al sistema." },
      { name: "receptionist", description: "Gestión de reservas y huéspedes." },
      { name: "guest", description: "Cliente del hotel." },
    ],
  });
  console.log(`✅ Roles creados: ${roles.length}`);

  // Tipos de Habitación según datos reales del hotel
  const roomTypes = await prisma.room_types.createManyAndReturn({
    data: [
      {
        name: "Suite",
        base_capacity: 2,
        description: "Habitación premium con sala de estar separada",
        bed_configuration: "Cama King + Living",
      },
      {
        name: "Suite Junior",
        base_capacity: 2,
        description: "Suite compacta con todas las comodidades",
        bed_configuration: "Cama Queen",
      },
      {
        name: "Matrimonial",
        base_capacity: 2,
        description: "Habitación estándar con cama matrimonial",
        bed_configuration: "Cama de 2 plazas matrimonial",
      },
      {
        name: "Doble dos camas",
        base_capacity: 2,
        description: "Habitación con dos camas separadas",
        bed_configuration: "2 camas de plaza y media",
      },
      {
        name: "Triple",
        base_capacity: 3,
        description: "Habitación espaciosa para tres personas",
        bed_configuration: "3 camas de plaza y media",
      },
      {
        name: "Cuádruple",
        base_capacity: 4,
        description: "Habitación amplia ideal para familias",
        bed_configuration: "4 camas de plaza y media",
      },
      {
        name: "Doble adicional",
        base_capacity: 3,
        description: "Habitación con cama matrimonial y adicional",
        bed_configuration: "1 cama matrimonial + 1 cama de plaza y media",
      },
    ],
  });
  console.log(`✅ Tipos de Habitación creados: ${roomTypes.length}`);

  // Servicios
  const services = await prisma.services.createManyAndReturn({
    data: [
      {
        name: "Desayuno",
        description:
          "Desayuno buffet continental con variedad de opciones calientes y frías",
        unit: "per_person",
        price: 3000,
        allows_custom_price: false,
      },
      {
        name: "Lavandería",
        description: "Servicio de lavado y planchado de prendas",
        unit: "per_unit",
        price: 0,
        allows_custom_price: true,
      },
    ],
  });
  console.log(`✅ Servicios creados: ${services.length}`);

  // Menú de desayunos
  const breakfastItems = await prisma.breakfast_menu_items.createManyAndReturn({
    data: [
      // Bebidas calientes
      {
        name: "Café americano",
        category: "Bebidas calientes",
        description: "Café filtrado recién hecho",
      },
      {
        name: "Café con leche",
        category: "Bebidas calientes",
        description: "Café con leche vaporizada",
      },
      {
        name: "Té verde",
        category: "Bebidas calientes",
        description: "Té verde premium",
      },
      {
        name: "Té negro",
        category: "Bebidas calientes",
        description: "Té negro aromático",
      },
      {
        name: "Chocolate caliente",
        category: "Bebidas calientes",
        description: "Chocolate con leche",
      },

      // Jugos
      {
        name: "Jugo de naranja natural",
        category: "Jugos",
        description: "Jugo recién exprimido",
      },
      {
        name: "Jugo de manzana",
        category: "Jugos",
        description: "Jugo natural de manzana",
      },

      // Panadería
      {
        name: "Pan amasado",
        category: "Panadería",
        description: "Pan tradicional chileno",
      },
      {
        name: "Hallullas",
        category: "Panadería",
        description: "Pan redondo tradicional",
      },
      {
        name: "Croissant",
        category: "Panadería",
        description: "Croissant de mantequilla",
      },
      {
        name: "Tostadas integrales",
        category: "Panadería",
        description: "Pan integral tostado",
      },

      // Acompañamientos
      {
        name: "Mantequilla",
        category: "Acompañamientos",
        description: "Mantequilla fresca",
      },
      {
        name: "Mermelada",
        category: "Acompañamientos",
        description: "Mermeladas variadas",
      },
      {
        name: "Manjar",
        category: "Acompañamientos",
        description: "Dulce de leche",
      },

      // Lácteos
      {
        name: "Yogurt natural",
        category: "Lácteos",
        description: "Yogurt sin azúcar",
      },
      {
        name: "Yogurt de frutas",
        category: "Lácteos",
        description: "Yogurt con trozos de fruta",
      },
      { name: "Leche", category: "Lácteos", description: "Leche fresca" },

      // Frutas
      {
        name: "Frutas de temporada",
        category: "Frutas",
        description: "Selección de frutas frescas",
      },
      {
        name: "Ensalada de frutas",
        category: "Frutas",
        description: "Macedonia de frutas",
      },

      // Platos calientes
      {
        name: "Huevos revueltos",
        category: "Platos calientes",
        description: "Huevos revueltos cremosos",
      },
      {
        name: "Huevos fritos",
        category: "Platos calientes",
        description: "Huevos fritos a gusto",
      },
      {
        name: "Tortilla",
        category: "Platos calientes",
        description: "Tortilla de huevos",
      },
      {
        name: "Salchichas",
        category: "Platos calientes",
        description: "Salchichas de cerdo",
      },
      {
        name: "Tocino",
        category: "Platos calientes",
        description: "Tocino crujiente",
      },
    ],
  });
  console.log(`✅ Items de menú de desayuno creados: ${breakfastItems.length}`);

  // Promociones
  const promotions = await prisma.promotions.createManyAndReturn({
    data: [
      {
        code: "WEEKEND20",
        description: "20% de descuento en fines de semana",
        discount_percentage: 20.0,
        start_date: new Date("2025-01-01"),
        end_date: new Date("2026-12-31"),
      },
      {
        code: "LARGAESTANCIA15",
        description: "15% de descuento para estancias de 5+ noches",
        discount_percentage: 15.0,
        start_date: new Date("2025-01-01"),
        end_date: new Date("2026-12-31"),
      },
    ],
  });
  console.log(`✅ Promociones creadas: ${promotions.length}`);

  // Temporadas según datos reales
  const currentYear = new Date().getFullYear();
  const seasons = await prisma.seasons.createManyAndReturn({
    data: [
      {
        name: `Temporada Verano ${currentYear}`,
        start_date: new Date(`${currentYear}-11-01`),
        end_date: new Date(`${currentYear + 1}-03-30`),
        price_modifier: 5000.0,
        is_active: true,
      },
      {
        name: `Temporada Baja ${currentYear}`,
        start_date: new Date(`${currentYear}-04-01`),
        end_date: new Date(`${currentYear}-10-31`),
        price_modifier: 0.0,
        is_active: true,
      },
    ],
  });
  console.log(`✅ Temporadas creadas: ${seasons.length}`);

  return { roles, roomTypes, services, promotions, seasons };
}

async function createUsers(faker, roles) {
  console.log("👤 Creando usuarios...");
  const password = await bcrypt.hash("password123", 10);

  const adminRole = roles.find((r) => r.name === "administrator");
  const receptionistRole = roles.find((r) => r.name === "receptionist");
  const guestRole = roles.find((r) => r.name === "guest");

  // Usuario Administrador
  await prisma.users.create({
    data: {
      identification_number: "111111111",
      first_name: "Super",
      paternal_last_name: "Admin",
      email: "super.admin@hotel.com",
      password_hash: password,
      status: "active",
      is_fully_registered: true,
      user_roles: { create: { role_id: adminRole.id } },
    },
  });

  // Recepcionistas
  const receptionist1 = await prisma.users.create({
    data: {
      identification_number: "222222222",
      first_name: "Carlos",
      paternal_last_name: "Gacitúa",
      email: "carlos.recepcionista@hotel.com",
      password_hash: password,
      status: "active",
      is_fully_registered: true,
      user_roles: { create: { role_id: receptionistRole.id } },
    },
  });

  const receptionist2 = await prisma.users.create({
    data: {
      identification_number: "333333333",
      first_name: "Juan",
      paternal_last_name: "Ampuero",
      email: "juan.recepcionista@hotel.com",
      password_hash: password,
      status: "active",
      is_fully_registered: true,
      user_roles: { create: { role_id: receptionistRole.id } },
    },
  });

  const receptionists = [receptionist1, receptionist2];

  // Huéspedes
  const guests = [];
  for (let i = 0; i < 20; i++) {
    const user = await prisma.users.create({
      data: {
        identification_number:
          faker.string.numeric(8) + faker.string.numeric(1),
        first_name: faker.person.firstName(),
        paternal_last_name: faker.person.lastName(),
        email: faker.internet.email(),
        password_hash: password,
        status: "active",
        country: "Chile",
        is_fully_registered: true,
        user_roles: { create: { role_id: guestRole.id } },
        guest_details: {
          create: {
            special_requests: faker.helpers.arrayElement([
              "Piso alto",
              "Cerca del ascensor",
              "Sin peticiones especiales",
            ]),
            travels_with_children: faker.datatype.boolean(),
            children_under_four: faker.datatype.boolean()
              ? faker.number.int({ min: 0, max: 2 })
              : 0,
          },
        },
      },
    });
    guests.push(user);
  }

  console.log(
    `✅ Usuarios creados: 1 Admin, ${receptionists.length} Recepcionistas, ${guests.length} Huéspedes.`
  );
  return { receptionists, guests, adminRole, receptionistRole };
}

async function createRooms(roomTypes) {
  console.log("🚪 Creando 23 habitaciones del hotel...");

  // Mapear tipos por nombre
  const suiteType = roomTypes.find((rt) => rt.name === "Suite");
  const suiteJuniorType = roomTypes.find((rt) => rt.name === "Suite Junior");
  const matrimonialType = roomTypes.find((rt) => rt.name === "Matrimonial");
  const dobleDosType = roomTypes.find((rt) => rt.name === "Doble dos camas");
  const tripleType = roomTypes.find((rt) => rt.name === "Triple");
  const cuadrupleType = roomTypes.find((rt) => rt.name === "Cuádruple");
  const dobleAdicionalType = roomTypes.find(
    (rt) => rt.name === "Doble adicional"
  );

  const roomsData = [
    // PISO 1 (9 habitaciones) - 101 a 109
    {
      room_number: "101",
      floor: 1,
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "available",
    },
    {
      room_number: "102",
      floor: 1,
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "available",
    },
    {
      room_number: "103",
      floor: 1,
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "occupied",
    },
    {
      room_number: "104",
      floor: 1,
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "occupied",
    },
    {
      room_number: "105",
      floor: 1,
      room_type_id: dobleDosType.id,
      capacity: 2,
      base_price: 30000,
      status: "available",
    },
    {
      room_number: "106",
      floor: 1,
      room_type_id: tripleType.id,
      capacity: 3,
      base_price: 35000,
      status: "pending",
    },
    {
      room_number: "107",
      floor: 1,
      room_type_id: dobleAdicionalType.id,
      capacity: 3,
      base_price: 35000,
      status: "cleaning",
    },
    {
      room_number: "108",
      floor: 1,
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "available",
    },
    {
      room_number: "109",
      floor: 1,
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "maintenance",
    },

    // PISO 2 (13 habitaciones) - 201 a 213
    {
      room_number: "201",
      floor: 2,
      room_type_id: suiteType.id,
      capacity: 2,
      base_price: 45000,
      status: "available",
      description: "Suite con vista panorámica",
    },
    {
      room_number: "202",
      floor: 2,
      room_type_id: suiteJuniorType.id,
      capacity: 2,
      base_price: 40000,
      status: "available",
    },
    {
      room_number: "203",
      floor: 2,
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "occupied",
    },
    {
      room_number: "204",
      floor: 2,
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "occupied",
    },
    {
      room_number: "205",
      floor: 2,
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "available",
    },
    {
      room_number: "206",
      floor: 2,
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "available",
    },
    {
      room_number: "207",
      floor: 2,
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "pending",
    },
    {
      room_number: "208",
      floor: 2,
      room_type_id: dobleDosType.id,
      capacity: 2,
      base_price: 30000,
      status: "available",
    },
    {
      room_number: "209",
      floor: 2,
      room_type_id: tripleType.id,
      capacity: 3,
      base_price: 35000,
      status: "available",
    },
    {
      room_number: "210",
      floor: 2,
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "cleaning",
    },
    {
      room_number: "211",
      floor: 2,
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "available",
    },
    {
      room_number: "212",
      floor: 2,
      room_type_id: dobleAdicionalType.id,
      capacity: 3,
      base_price: 35000,
      status: "available",
    },
    {
      room_number: "213",
      floor: 2,
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "occupied",
    },

    // PISO 3 (1 habitación) - 301
    {
      room_number: "301",
      floor: 3,
      room_type_id: cuadrupleType.id,
      capacity: 4,
      base_price: 40000,
      status: "available",
      description: "Habitación familiar en último piso",
    },
  ];

  const rooms = await prisma.rooms.createManyAndReturn({ data: roomsData });
  console.log(`✅ 23 Habitaciones creadas según distribución real del hotel`);
  return rooms;
}

async function main() {
  const faker = await getFaker();
  console.log("🚀 Iniciando seed del Hotel Don Teo...");

  await cleanDatabase();
  const coreData = await createCoreData();
  const userData = await createUsers(faker, coreData.roles);
  const rooms = await createRooms(coreData.roomTypes);

  console.log("🎉 Seed completado exitosamente!");
  console.log("\n📊 Resumen:");
  console.log(`   - ${coreData.roles.length} Roles`);
  console.log(`   - ${coreData.roomTypes.length} Tipos de Habitación`);
  console.log(`   - ${rooms.length} Habitaciones`);
  console.log(`   - ${coreData.services.length} Servicios`);
  console.log(`   - 3 Usuarios staff (1 admin + 2 recepcionistas)`);
  console.log(`   - ${userData.guests.length} Huéspedes de prueba`);
  console.log("\n🔑 Credenciales de prueba:");
  console.log("   Admin: super.admin@hotel.com / password123");
  console.log("   Recepcionista: carlos.recepcionista@hotel.com / password123");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
