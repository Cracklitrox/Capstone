const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

async function getFaker() {
  const { faker } = await import("@faker-js/faker/locale/es");
  return faker;
}

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log("🧹 Limpiando la base de datos...");

  // Orden correcto de eliminación por dependencias
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

  // Roles - Buscar o crear
  let adminRole = await prisma.roles.findUnique({
    where: { name: "administrator" },
  });
  if (!adminRole) {
    adminRole = await prisma.roles.create({
      data: { name: "administrator", description: "Acceso total al sistema." },
    });
  }

  let receptionistRole = await prisma.roles.findUnique({
    where: { name: "receptionist" },
  });
  if (!receptionistRole) {
    receptionistRole = await prisma.roles.create({
      data: {
        name: "receptionist",
        description: "Gestión de reservas y huéspedes.",
      },
    });
  }

  let guestRole = await prisma.roles.findUnique({ where: { name: "guest" } });
  if (!guestRole) {
    guestRole = await prisma.roles.create({
      data: { name: "guest", description: "Cliente del hotel." },
    });
  }

  console.log(`✅ Roles creados: 3`);

  // Tipos de Habitación
  const suiteType =
    (await prisma.room_types.findUnique({ where: { name: "Suite" } })) ||
    (await prisma.room_types.create({
      data: {
        name: "Suite",
        base_capacity: 2,
        description: "Habitación premium con sala de estar separada",
        bed_configuration: "Cama King + Living",
      },
    }));

  const suiteJuniorType =
    (await prisma.room_types.findUnique({ where: { name: "Suite Junior" } })) ||
    (await prisma.room_types.create({
      data: {
        name: "Suite Junior",
        base_capacity: 2,
        description: "Suite compacta con todas las comodidades",
        bed_configuration: "Cama Queen",
      },
    }));

  const matrimonialType =
    (await prisma.room_types.findUnique({ where: { name: "Matrimonial" } })) ||
    (await prisma.room_types.create({
      data: {
        name: "Matrimonial",
        base_capacity: 2,
        description: "Habitación estándar con cama matrimonial",
        bed_configuration: "Cama de 2 plazas matrimonial",
      },
    }));

  const dobleDosType =
    (await prisma.room_types.findUnique({
      where: { name: "Doble dos camas" },
    })) ||
    (await prisma.room_types.create({
      data: {
        name: "Doble dos camas",
        base_capacity: 2,
        description: "Habitación con dos camas separadas",
        bed_configuration: "2 camas de plaza y media",
      },
    }));

  const tripleType =
    (await prisma.room_types.findUnique({ where: { name: "Triple" } })) ||
    (await prisma.room_types.create({
      data: {
        name: "Triple",
        base_capacity: 3,
        description: "Habitación espaciosa para tres personas",
        bed_configuration: "3 camas de plaza y media",
      },
    }));

  const cuadrupleType =
    (await prisma.room_types.findUnique({ where: { name: "Cuádruple" } })) ||
    (await prisma.room_types.create({
      data: {
        name: "Cuádruple",
        base_capacity: 4,
        description: "Habitación amplia ideal para familias",
        bed_configuration: "4 camas de plaza y media",
      },
    }));

  const dobleAdicionalType =
    (await prisma.room_types.findUnique({
      where: { name: "Doble adicional" },
    })) ||
    (await prisma.room_types.create({
      data: {
        name: "Doble adicional",
        base_capacity: 3,
        description: "Habitación con cama matrimonial y adicional",
        bed_configuration: "1 cama matrimonial + 1 cama de plaza y media",
      },
    }));

  console.log(`✅ Tipos de Habitación creados: 7`);

  // Servicios
  const desayunoService =
    (await prisma.services.findUnique({ where: { name: "Desayuno" } })) ||
    (await prisma.services.create({
      data: {
        name: "Desayuno",
        description:
          "Desayuno buffet continental con variedad de opciones calientes y frías",
        unit: "per_person",
        price: 3000,
        is_active: true,
        allows_custom_price: false,
      },
    }));

  const lavanderiaService =
    (await prisma.services.findUnique({ where: { name: "Lavandería" } })) ||
    (await prisma.services.create({
      data: {
        name: "Lavandería",
        description:
          "Servicio de lavandería con precio definido por recepcionista según cantidad",
        unit: "custom",
        price: 0,
        is_active: true,
        allows_custom_price: true,
      },
    }));

  console.log(`✅ Servicios creados: 2`);

  // Menú de Desayuno
  const menuItemsData = [
    { name: "Café", category: "Bebidas Calientes" },
    { name: "Té", category: "Bebidas Calientes" },
    { name: "Leche", category: "Bebidas Calientes" },
    { name: "Jugo Natural", category: "Bebidas Frías" },
    { name: "Pan Amasado", category: "Panadería" },
    { name: "Hallulla", category: "Panadería" },
    { name: "Mermelada", category: "Acompañamientos" },
    { name: "Mantequilla", category: "Acompañamientos" },
    { name: "Huevos Revueltos", category: "Platos Calientes" },
    { name: "Jamón", category: "Fiambres" },
    { name: "Queso", category: "Fiambres" },
    { name: "Yogurt", category: "Lácteos" },
    { name: "Frutas de Temporada", category: "Frutas" },
  ];

  const existingMenuCount = await prisma.breakfast_menu_items.count();
  if (existingMenuCount === 0) {
    for (const item of menuItemsData) {
      await prisma.breakfast_menu_items.create({ data: item });
    }
  }
  console.log(`✅ Menú de desayuno: 13 items`);

  // Promociones
  const promo1 =
    (await prisma.promotions.findUnique({ where: { code: "WEEKEND20" } })) ||
    (await prisma.promotions.create({
      data: {
        code: "WEEKEND20",
        description: "20% de descuento en fines de semana",
        discount_percentage: 20.0,
        start_date: new Date("2025-01-01"),
        end_date: new Date("2026-12-31"),
      },
    }));

  const promo2 =
    (await prisma.promotions.findUnique({
      where: { code: "LARGAESTANCIA15" },
    })) ||
    (await prisma.promotions.create({
      data: {
        code: "LARGAESTANCIA15",
        description: "15% de descuento para estancias de 5+ noches",
        discount_percentage: 15.0,
        start_date: new Date("2025-01-01"),
        end_date: new Date("2026-12-31"),
      },
    }));

  console.log(`✅ Promociones creadas: 2`);

  // Temporadas
  const currentYear = new Date().getFullYear();

  const verano =
    (await prisma.seasons.findUnique({
      where: { name: `Temporada Verano ${currentYear}` },
    })) ||
    (await prisma.seasons.create({
      data: {
        name: `Temporada Verano ${currentYear}`,
        start_date: new Date(`${currentYear}-11-01`),
        end_date: new Date(`${currentYear + 1}-03-30`),
        price_modifier: 5000.0,
        is_active: true,
      },
    }));

  const baja =
    (await prisma.seasons.findUnique({
      where: { name: `Temporada Baja ${currentYear}` },
    })) ||
    (await prisma.seasons.create({
      data: {
        name: `Temporada Baja ${currentYear}`,
        start_date: new Date(`${currentYear}-04-01`),
        end_date: new Date(`${currentYear}-10-31`),
        price_modifier: 0.0,
        is_active: true,
      },
    }));

  console.log(`✅ Temporadas creadas: 2`);

  return {
    roles: { adminRole, receptionistRole, guestRole },
    roomTypes: {
      suiteType,
      suiteJuniorType,
      matrimonialType,
      dobleDosType,
      tripleType,
      cuadrupleType,
      dobleAdicionalType,
    },
  };
}

async function createUsers(faker, roles) {
  console.log("👤 Creando usuarios...");
  const password = await bcrypt.hash("password123", 10);

  // Usuario Administrador
  const existingAdmin = await prisma.users.findUnique({
    where: { email: "super.admin@hotel.com" },
  });
  if (!existingAdmin) {
    await prisma.users.create({
      data: {
        identification_number: "11111111-1",
        first_name: "Super",
        paternal_last_name: "Admin",
        email: "super.admin@hotel.com",
        password_hash: password,
        status: "active",
        is_fully_registered: true,
        user_roles: { create: { role_id: roles.adminRole.id } },
      },
    });
  }

  // Recepcionistas
  const existingCarlos = await prisma.users.findUnique({
    where: { email: "carlos.recepcionista@hotel.com" },
  });
  if (!existingCarlos) {
    await prisma.users.create({
      data: {
        identification_number: "22222222-2",
        first_name: "Carlos",
        paternal_last_name: "Gacitúa",
        email: "carlos.recepcionista@hotel.com",
        password_hash: password,
        status: "active",
        is_fully_registered: true,
        user_roles: { create: { role_id: roles.receptionistRole.id } },
      },
    });
  }

  const existingJuan = await prisma.users.findUnique({
    where: { email: "juan.recepcionista@hotel.com" },
  });
  if (!existingJuan) {
    await prisma.users.create({
      data: {
        identification_number: "33333333-3",
        first_name: "Juan",
        paternal_last_name: "Ampuero",
        email: "juan.recepcionista@hotel.com",
        password_hash: password,
        status: "active",
        is_fully_registered: true,
        user_roles: { create: { role_id: roles.receptionistRole.id } },
      },
    });
  }

  console.log(`✅ Usuarios staff creados`);

  // Huéspedes
  const guestCount = await prisma.users.count({
    where: {
      user_roles: { some: { role_id: roles.guestRole.id } },
    },
  });

  if (guestCount === 0) {
    for (let i = 0; i < 20; i++) {
      const rut = faker.string.numeric(8);
      const dv = faker.helpers.arrayElement([
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "K",
      ]);

      await prisma.users.create({
        data: {
          identification_number: `${rut}-${dv}`,
          first_name: faker.person.firstName(),
          paternal_last_name: faker.person.lastName(),
          maternal_last_name: faker.person.lastName(),
          email: faker.internet.email().toLowerCase(),
          password_hash: password,
          status: "active",
          country: "Chile",
          is_fully_registered: true,
          user_roles: { create: { role_id: roles.guestRole.id } },
          guest_details: {
            create: {
              special_requests: faker.helpers.arrayElement([
                "Piso alto",
                "Cerca del ascensor",
                "Habitación tranquila",
                null,
              ]),
              travels_with_children: faker.datatype.boolean(),
              children_under_four: faker.datatype.boolean()
                ? faker.number.int({ min: 0, max: 2 })
                : 0,
            },
          },
        },
      });
    }
  }

  const totalGuests = await prisma.users.count({
    where: { user_roles: { some: { role_id: roles.guestRole.id } } },
  });

  console.log(`✅ Total huéspedes: ${totalGuests}`);
}

async function createRooms(roomTypes) {
  console.log("🚪 Creando habitaciones...");

  const {
    suiteType,
    suiteJuniorType,
    matrimonialType,
    dobleDosType,
    tripleType,
    cuadrupleType,
    dobleAdicionalType,
  } = roomTypes;

  const roomsData = [
    // PISO 1
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
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "available",
    },
    {
      room_number: "107",
      floor: 1,
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "cleaning",
    },
    {
      room_number: "108",
      floor: 1,
      room_type_id: tripleType.id,
      capacity: 3,
      base_price: 35000,
      status: "available",
    },
    {
      room_number: "109",
      floor: 1,
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "available",
    },
    // PISO 2
    {
      room_number: "201",
      floor: 2,
      room_type_id: suiteType.id,
      capacity: 2,
      base_price: 45000,
      status: "available",
      description: "Suite premium con living",
    },
    {
      room_number: "202",
      floor: 2,
      room_type_id: suiteJuniorType.id,
      capacity: 2,
      base_price: 40000,
      status: "available",
      description: "Suite Junior con vista",
    },
    {
      room_number: "203",
      floor: 2,
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "available",
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
    // PISO 3
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

  for (const roomData of roomsData) {
    const existing = await prisma.rooms.findUnique({
      where: { room_number: roomData.room_number },
    });
    if (!existing) {
      await prisma.rooms.create({ data: roomData });
    }
  }

  const totalRooms = await prisma.rooms.count();
  console.log(`✅ ${totalRooms} Habitaciones creadas`);
}

async function main() {
  const faker = await getFaker();
  console.log("🚀 Iniciando seed del Hotel Don Teo...");

  await cleanDatabase();
  const coreData = await createCoreData();
  await createUsers(faker, coreData.roles);
  await createRooms(coreData.roomTypes);

  console.log("\n🎉 Seed completado exitosamente!");
  console.log("\n🔑 Credenciales:");
  console.log("   Admin: super.admin@hotel.com / password123");
  console.log("   Recepcionista: carlos.recepcionista@hotel.com / password123");
}

module.exports = { main };
