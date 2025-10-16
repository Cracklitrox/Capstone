const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

async function getFaker() {
  const { faker } = await import("@faker-js/faker/locale/es");
  return faker;
}

const prisma = new PrismaClient();

// -----------------------------------------------------------
// FUNCIÓN AGREGADA: Lógica para calcular el Dígito Verificador (DV)
// Basada en rutValidator.js para generar RUTs válidos.
// -----------------------------------------------------------
function calculateDv(rut) {
  if (!rut) return "";

  // Convertir a string y limpiar no-dígitos para el cálculo
  const cleanRut = String(rut).replace(/[^0-9]/g, "");

  let suma = 0;
  let multiplicador = 2;

  for (let i = cleanRut.length - 1; i >= 0; i--) {
    suma += parseInt(cleanRut[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const dvEsperado = 11 - (suma % 11);

  if (dvEsperado === 11) return "0";
  if (dvEsperado === 10) return "K";
  return dvEsperado.toString();
}

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
    services: [desayunoService, lavanderiaService],
  };
}

async function createUsers(roles) {
  console.log("👤 Creando usuarios staff...");
  const password = await bcrypt.hash("password123", 10);

  // Usuario Administrador
  // RUT 11.111.111-1 es válido
  const existingAdmin = await prisma.users.findUnique({
    where: { email: "super.admin@hotel.com" },
  });
  if (!existingAdmin) {
    await prisma.users.create({
      data: {
        identification_number: "11111111-1",
        first_name: "Super",
        paternal_last_name: "Admin",
        maternal_last_name: "Sistema",
        email: "super.admin@hotel.com",
        phone_number: "+56912345678",
        country: "Chile",
        region: "Metropolitana",
        city: "Santiago",
        password_hash: password,
        status: "active",
        is_fully_registered: true,
        user_roles: { create: { role_id: roles.adminRole.id } },
      },
    });
  }

  // Recepcionistas
  // RUT 22.222.222-2 es válido
  const existingCarlos = await prisma.users.findUnique({
    where: { email: "carlos.recepcionista@hotel.com" },
  });
  let carlos;
  if (!existingCarlos) {
    carlos = await prisma.users.create({
      data: {
        identification_number: "22222222-2",
        first_name: "Carlos",
        paternal_last_name: "Gacitúa",
        maternal_last_name: "Rojas",
        email: "carlos.recepcionista@hotel.com",
        phone_number: "+56987654321",
        country: "Chile",
        region: "Metropolitana",
        city: "Santiago",
        password_hash: password,
        status: "active",
        is_fully_registered: true,
        user_roles: { create: { role_id: roles.receptionistRole.id } },
      },
    });
  } else {
    carlos = existingCarlos;
  }

  // RUT 33.333.333-3 es válido
  const existingJuan = await prisma.users.findUnique({
    where: { email: "juan.recepcionista@hotel.com" },
  });
  let juan;
  if (!existingJuan) {
    juan = await prisma.users.create({
      data: {
        identification_number: "33333333-3",
        first_name: "Juan",
        paternal_last_name: "Ampuero",
        maternal_last_name: "Silva",
        email: "juan.recepcionista@hotel.com",
        phone_number: "+56976543210",
        country: "Chile",
        region: "Metropolitana",
        city: "Santiago",
        password_hash: password,
        status: "active",
        is_fully_registered: true,
        user_roles: { create: { role_id: roles.receptionistRole.id } },
      },
    });
  } else {
    juan = existingJuan;
  }

  console.log(`✅ Usuarios staff creados: 1 admin, 2 recepcionistas`);

  return { carlos, juan };
}

async function createGuests(faker, guestRole) {
  console.log("👥 Creando huéspedes...");
  const password = await bcrypt.hash("password123", 10);

  const completeGuests = [];
  const incompleteGuests = [];

  // 10 Huéspedes COMPLETOS (pueden ser principales)
  for (let i = 0; i < 10; i++) {
    let identNumber;
    let existingUser;

    do {
      // MODIFICACIÓN 1: Usar un rango de números más altos (ej: 40 millones a 99 millones)
      // para evitar colisiones con staff (11111111, 22222222, 33333333) y valores muy bajos.
      const rutBase = faker.number
        .int({ min: 40000000, max: 99999999 })
        .toString();

      const dv = calculateDv(rutBase);
      identNumber = `${rutBase}-${dv}`;

      existingUser = await prisma.users.findUnique({
        where: { identification_number: identNumber },
      });
    } while (existingUser);

    const guest = await prisma.users.create({
      data: {
        identification_number: identNumber,
        first_name: faker.person.firstName(),
        paternal_last_name: faker.person.lastName(),
        maternal_last_name: faker.person.lastName(),
        email: faker.internet.email().toLowerCase(),
        phone_number: `+569${faker.string.numeric(8)}`,
        birth_date: faker.date.birthdate({ min: 18, max: 65, mode: "age" }),
        gender: faker.helpers.arrayElement(["male", "female", "other"]),
        country: "Chile",
        region: faker.helpers.arrayElement([
          "Metropolitana",
          "Valparaíso",
          "Biobío",
        ]),
        city: faker.helpers.arrayElement([
          "Santiago",
          "Viña del Mar",
          "Concepción",
        ]),
        password_hash: password,
        status: "active",
        is_fully_registered: true,
        user_roles: { create: { role_id: guestRole.id } },
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
              ? faker.number.int({ min: 1, max: 2 })
              : 0,
          },
        },
      },
    });
    completeGuests.push(guest);
  }

  // 10 Huéspedes INCOMPLETOS (solo adicionales)
  for (let i = 0; i < 10; i++) {
    // MODIFICACIÓN 2: Aplicar el bucle DO/WHILE faltante en esta sección
    let identNumber;
    let existingUser;

    do {
      // Generar RUT base (entre 40 millones y 99 millones)
      const rutBase = faker.number
        .int({ min: 40000000, max: 99999999 })
        .toString();

      // Calcular DV
      const dv = calculateDv(rutBase);
      identNumber = `${rutBase}-${dv}`;

      existingUser = await prisma.users.findUnique({
        where: { identification_number: identNumber },
      });
    } while (existingUser);

    const guest = await prisma.users.create({
      data: {
        identification_number: identNumber,
        first_name: faker.person.firstName(),
        paternal_last_name: faker.person.lastName(),
        maternal_last_name: faker.person.lastName(),
        email: null, // SIN email
        phone_number: `+569${faker.string.numeric(8)}`,
        birth_date: null, // SIN birthDate
        gender: null, // SIN gender
        country: "Chile",
        region: faker.helpers.arrayElement([
          "Metropolitana",
          "Valparaíso",
          "Biobío",
        ]),
        city: faker.helpers.arrayElement([
          "Santiago",
          "Viña del Mar",
          "Concepción",
        ]),
        password_hash: password,
        status: "active",
        is_fully_registered: false,
        user_roles: { create: { role_id: guestRole.id } },
      },
    });
    incompleteGuests.push(guest);
  }

  console.log(
    `✅ Huéspedes creados: ${completeGuests.length} completos, ${incompleteGuests.length} incompletos`
  );

  return { completeGuests, incompleteGuests };
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

  const allRooms = await prisma.rooms.findMany();
  console.log(`✅ ${allRooms.length} Habitaciones creadas`);

  return allRooms;
}

async function createComplexScenarios(
  faker,
  { completeGuests, incompleteGuests, receptionists, rooms, services }
) {
  console.log("🏨 Creando escenarios complejos...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // RESERVAS CON CHECK-OUT HOY (5 reservas)
  console.log("📅 Creando reservas con check-out HOY...");
  const occupiedRooms = rooms
    .filter((r) => r.status === "occupied")
    .slice(0, 5);

  for (let i = 0; i < Math.min(5, occupiedRooms.length); i++) {
    const room = occupiedRooms[i];
    const mainGuest = faker.helpers.arrayElement(completeGuests);
    const receptionist = faker.helpers.arrayElement(receptionists);

    const stayDays = faker.number.int({ min: 1, max: 3 });
    const checkInDate = new Date(today);
    checkInDate.setDate(today.getDate() - stayDays);
    checkInDate.setHours(8, 0, 0, 0);

    const checkOutToday = new Date(today);
    checkOutToday.setHours(11, 0, 0, 0);

    const subtotalRoom = room.base_price * stayDays;
    const service = faker.helpers.arrayElement(services);
    const serviceQuantity = faker.number.int({ min: 1, max: 3 });
    const subtotalService = service.price * serviceQuantity;
    const totalAmount = subtotalRoom + subtotalService;

    await prisma.reservations.create({
      data: {
        code: `CHECKOUT-TODAY-${String(i + 1).padStart(3, "0")}`,
        main_guest_id: mainGuest.id,
        receptionist_id: receptionist.id,
        channel: faker.helpers.arrayElement(["reception", "web", "chatbot", "in_person", "walk_in"]),
        status: "in_progress",
        check_in_date: checkInDate,
        check_out_date: checkOutToday,
        guest_count: faker.number.int({ min: 1, max: room.capacity }),
        total_amount: totalAmount,
        paid_amount: totalAmount,
        reservation_rooms: {
          create: {
            room_id: room.id,
            start_date: checkInDate,
            end_date: checkOutToday,
            unit_price: room.base_price,
            subtotal: subtotalRoom,
          },
        },
        reservation_services: {
          create: {
            service_id: service.id,
            quantity: serviceQuantity,
            unit_price: service.price,
            subtotal: subtotalService,
          },
        },
        payments: {
          create: {
            amount: totalAmount,
            payment_method: faker.helpers.arrayElement([
              "credit_card",
              "debit_card",
              "cash",
            ]),
            status: "confirmed",
            is_deposit: false,
          },
        },
      },
    });
  }

  console.log(
    `✅ ${Math.min(5, occupiedRooms.length)} reservas con check-out HOY creadas`
  );

  // 50 RESERVAS ADICIONALES (pasadas, futuras)
  console.log("📋 Creando 50 reservas adicionales...");

  const availableRooms = rooms.filter((r) =>
    ["available", "pending", "occupied"].includes(r.status)
  );

  for (let i = 0; i < 50; i++) {
    const mainGuest = faker.helpers.arrayElement(completeGuests);
    const receptionist = faker.helpers.arrayElement(receptionists);

    // Rango: últimas 2 semanas O próximas 2 semanas
    const isPast = faker.datatype.boolean();
    let checkIn;

    if (isPast) {
      // Pasadas: últimas 2 semanas
      checkIn = faker.date.recent({ days: 14, refDate: today });
    } else {
      // Futuras: próximas 2 semanas
      checkIn = faker.date.soon({ days: 14, refDate: today });
    }

    const stayDays = faker.number.int({ min: 1, max: 7 });
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkIn.getDate() + stayDays);

    const reservedRoom = faker.helpers.arrayElement(availableRooms);
    const subtotalRoom = reservedRoom.base_price * stayDays;

    const service = faker.helpers.arrayElement(services);
    const serviceQuantity = faker.number.int({ min: 1, max: 2 });
    const subtotalService = service.price * serviceQuantity;
    const totalAmount = subtotalRoom + subtotalService;

    const guestCount = faker.number.int({ min: 1, max: reservedRoom.capacity });

    // Crear reservation_guests con mix de completos e incompletos
    const additionalGuestsData = [];
    const numAdditional = Math.min(guestCount - 1, 2);

    for (let j = 0; j < numAdditional; j++) {
      const useIncomplete = faker.datatype.boolean();
      const additionalGuest = useIncomplete
        ? faker.helpers.arrayElement(incompleteGuests)
        : faker.helpers.arrayElement(
            completeGuests.filter((g) => g.id !== mainGuest.id)
          );

      additionalGuestsData.push({ guest_id: additionalGuest.id });
    }

    await prisma.reservations.create({
      data: {
        code: `RES-${faker.string.alphanumeric(10).toUpperCase()}`,
        main_guest_id: mainGuest.id,
        receptionist_id: receptionist.id,
        channel: faker.helpers.arrayElement(["reception", "chatbot", "web", "in_person", "walk_in"]),
        status: isPast
          ? "completed"
          : faker.helpers.arrayElement(["pending", "confirmed", "in_progress"]),
        check_in_date: checkIn,
        check_out_date: checkOut,
        guest_count: guestCount,
        total_amount: totalAmount,
        paid_amount: isPast
          ? totalAmount
          : faker.helpers.arrayElement([0, totalAmount / 2, totalAmount]),
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
            quantity: serviceQuantity,
            unit_price: service.price,
            subtotal: subtotalService,
          },
        },
        payments: {
          create: {
            amount: totalAmount / 2,
            payment_method: faker.helpers.arrayElement([
              "credit_card",
              "bank_transfer",
              "debit_card",
              "cash",
            ]),
            status: "confirmed",
            is_deposit: true,
          },
        },
        reservation_guests:
          additionalGuestsData.length > 0
            ? { create: additionalGuestsData }
            : undefined,
      },
    });
  }

  console.log("✅ 50 reservas adicionales creadas");

  // ALERTAS, MANTENIMIENTO, LIMPIEZA
  console.log("🔧 Creando mantenimiento y alertas...");

  const maintenanceRooms = rooms.filter((r) => r.status === "maintenance");
  for (const room of maintenanceRooms) {
    await prisma.maintenance_tasks.create({
      data: {
        room_id: room.id,
        category: "room",
        description: faker.helpers.arrayElement([
          "Fuga de agua en el lavamanos",
          "Problema eléctrico en lámpara",
          "Puerta del baño no cierra",
          "Aire acondicionado no funciona",
        ]),
        start_date: faker.date.recent({ days: 10 }),
        status: faker.helpers.arrayElement([
          "in_progress",
          "pending",
          "delayed",
        ]),
        priority: faker.helpers.arrayElement(["high", "medium", "critical"]),
        created_by_id: faker.helpers.arrayElement(receptionists).id,
      },
    });
  }

  const cleaningRooms = rooms.filter((r) => r.status === "cleaning");
  for (const room of cleaningRooms) {
    await prisma.cleaning_records.create({
      data: {
        room_id: room.id,
        receptionist_id: faker.helpers.arrayElement(receptionists).id,
        record_date: faker.date.recent({ days: 7 }),
        observations: faker.helpers.arrayElement([
          "Limpieza profunda realizada",
          "Toallas y sábanas cambiadas",
          "Baño desinfectado",
          null,
        ]),
        is_completed: faker.datatype.boolean(),
        completed_at: faker.datatype.boolean() ? new Date() : null,
      },
    });
  }

  console.log("✅ Mantenimiento, alertas y limpieza creados");
}

async function main() {
  const faker = await getFaker();
  console.log("🚀 Iniciando seed del Hotel Don Teo...");

  await cleanDatabase();
  const coreData = await createCoreData();
  const receptionists = await createUsers(coreData.roles);
  const guests = await createGuests(faker, coreData.roles.guestRole);
  const rooms = await createRooms(coreData.roomTypes);

  await createComplexScenarios(faker, {
    completeGuests: guests.completeGuests,
    incompleteGuests: guests.incompleteGuests,
    receptionists: [receptionists.carlos, receptionists.juan],
    rooms,
    services: coreData.services,
  });

  console.log("\n🎉 Seed completado exitosamente!");
  console.log("\n🔑 Credenciales:");
  console.log("   Admin: super.admin@hotel.com / password123");
  console.log("   Recepcionista: carlos.recepcionista@hotel.com / password123");
  console.log("   Recepcionista: juan.recepcionista@hotel.com / password123");
}

module.exports = { main };
