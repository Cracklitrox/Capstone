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
  await prisma.reservation_history.deleteMany({});
  await prisma.additional_charges.deleteMany({});
  await prisma.system_errors.deleteMany({});
  await prisma.activity_logs.deleteMany({});
  await prisma.cleaning_records.deleteMany({});
  await prisma.reservation_promotions.deleteMany({});
  await prisma.room_service_daily.deleteMany({});
  await prisma.room_guest_assignments.deleteMany({});
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
  await prisma.system_settings.deleteMany({});
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

  // System Settings
  console.log("⚙️  Creando configuraciones del sistema...");

  const systemSettings = await prisma.system_settings.createMany({
    data: [
      // Horarios de Check-in/Check-out
      {
        setting_key: 'checkin_start_time',
        setting_value: '11:00',
        description: 'Hora de inicio de check-in',
        data_type: 'time',
        category: 'schedule',
        is_editable: true,
      },
      {
        setting_key: 'checkin_end_time',
        setting_value: '15:00',
        description: 'Hora límite de check-in (después se marca no-show)',
        data_type: 'time',
        category: 'schedule',
        is_editable: true,
      },
      {
        setting_key: 'checkout_start_time',
        setting_value: '09:00',
        description: 'Hora de inicio de check-out',
        data_type: 'time',
        category: 'schedule',
        is_editable: true,
      },
      {
        setting_key: 'checkout_end_time',
        setting_value: '11:00',
        description: 'Hora límite de check-out',
        data_type: 'time',
        category: 'schedule',
        is_editable: true,
      },

      // Tiempos de transición automática
      {
        setting_key: 'noshow_hours_after_checkin',
        setting_value: '2',
        description: 'Horas después del check-in para marcar no-show',
        data_type: 'number',
        category: 'schedule',
        is_editable: true,
      },
      {
        setting_key: 'pending_expiry_hours',
        setting_value: '2',
        description: 'Horas límite para confirmar pago de reservas pending',
        data_type: 'number',
        category: 'payments',
        is_editable: true,
      },

      // Políticas de cancelación
      {
        setting_key: 'cancellation_free_days',
        setting_value: '7',
        description: 'Días de anticipación para cancelación sin cargo (100% reembolso)',
        data_type: 'number',
        category: 'policies',
        is_editable: true,
      },
      {
        setting_key: 'cancellation_partial_days',
        setting_value: '3',
        description: 'Días de anticipación para cancelación con cargo parcial (50% reembolso)',
        data_type: 'number',
        category: 'policies',
        is_editable: true,
      },

      // Políticas de pago
      {
        setting_key: 'require_full_payment_checkin',
        setting_value: 'false',
        description: '¿Requiere pago completo antes de check-in?',
        data_type: 'boolean',
        category: 'payments',
        is_editable: true,
      },
      {
        setting_key: 'min_deposit_percentage',
        setting_value: '50',
        description: 'Porcentaje mínimo de depósito',
        data_type: 'number',
        category: 'payments',
        is_editable: true,
      },

      // Configuraciones de extensión
      {
        setting_key: 'allow_room_change_extension',
        setting_value: 'true',
        description: '¿Permitir cambio de habitación durante extensión?',
        data_type: 'boolean',
        category: 'extensions',
        is_editable: true,
      },
      {
        setting_key: 'allow_guest_change_extension',
        setting_value: 'false',
        description: '¿Permitir cambio de huéspedes durante extensión?',
        data_type: 'boolean',
        category: 'extensions',
        is_editable: true,
      },

      // Configuraciones generales
      {
        setting_key: 'timezone',
        setting_value: 'America/Santiago',
        description: 'Zona horaria del hotel',
        data_type: 'string',
        category: 'general',
        is_editable: false,
      },
      {
        setting_key: 'currency',
        setting_value: 'CLP',
        description: 'Moneda del hotel',
        data_type: 'string',
        category: 'general',
        is_editable: false,
      },
      {
        setting_key: 'hotel_name',
        setting_value: 'Hotel Don Teo',
        description: 'Nombre del hotel',
        data_type: 'string',
        category: 'general',
        is_editable: false,
      },
    ],
    skipDuplicates: true,
  });

  console.log(`✅ Configuraciones del sistema creadas: ${systemSettings.count}`);

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

    // País y ciudad variada para reportes por país
    const countryData = faker.helpers.arrayElement([
      { country: "Chile", region: "Metropolitana", city: "Santiago" },
      { country: "Chile", region: "Valparaíso", city: "Viña del Mar" },
      { country: "Chile", region: "Biobío", city: "Concepción" },
      { country: "Argentina", region: "Buenos Aires", city: "Buenos Aires" },
      { country: "Argentina", region: "Mendoza", city: "Mendoza" },
      { country: "Perú", region: "Lima", city: "Lima" },
      { country: "Brasil", region: "São Paulo", city: "São Paulo" },
      { country: "Colombia", region: "Bogotá", city: "Bogotá" },
      { country: "México", region: "Ciudad de México", city: "Ciudad de México" },
      { country: "España", region: "Madrid", city: "Madrid" },
      { country: "Estados Unidos", region: "California", city: "Los Angeles" },
    ]);

    const guest = await prisma.users.create({
      data: {
        identification_number: identNumber,
        first_name: faker.person.firstName(),
        paternal_last_name: faker.person.lastName(),
        maternal_last_name: faker.person.lastName(),
        email: faker.internet.email().toLowerCase(),
        phone_number: `+569${faker.string.numeric(8)}`,
        birth_date: faker.date.birthdate({ min: 18, max: 70, mode: "age" }),
        gender: faker.helpers.arrayElement(["male", "female", "other"]),
        country: countryData.country,
        region: countryData.region,
        city: countryData.city,
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
      status: "occupied", // Para pending_checkout
    },
    {
      room_number: "104",
      floor: 1,
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "occupied", // Para pending_checkout
    },
    {
      room_number: "105",
      floor: 1,
      room_type_id: dobleDosType.id,
      capacity: 2,
      base_price: 30000,
      status: "occupied", // Para pending_checkout
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
      status: "occupied", // Para pending_checkout
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
      status: "occupied", // Para pending_checkout
    },
    // PISO 2
    {
      room_number: "201",
      floor: 2,
      room_type_id: suiteType.id,
      capacity: 2,
      base_price: 45000,
      status: "occupied", // Para pending_checkout
      description: "Suite premium con living",
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
      status: "available",
    },
    {
      room_number: "204",
      floor: 2,
      room_type_id: matrimonialType.id,
      capacity: 2,
      base_price: 30000,
      status: "occupied", // Para in_progress
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
      status: "occupied", // Para in_progress
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
      status: "occupied", // Para pending_checkout
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
      status: "occupied", // Para pending_checkout
    },
    // PISO 3
    {
      room_number: "301",
      floor: 3,
      room_type_id: cuadrupleType.id,
      capacity: 4,
      base_price: 40000,
      status: "occupied", // Para pending_checkout
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

async function createLoginHistory(faker, users) {
  console.log("🔐 Creando historial de logins...");

  for (const user of users) {
    // Crear entre 3 y 10 logins por usuario
    const loginCount = faker.number.int({ min: 3, max: 10 });
    for (let i = 0; i < loginCount; i++) {
      await prisma.LoginHistory.create({
        data: {
          userId: user.id,
          ipAddress: faker.internet.ipv4(),
          userAgent: faker.internet.userAgent(),
          timestamp: faker.date.recent({ days: 30 }),
        },
      });
    }
  }

  console.log("✅ Historial de logins creado");
}

async function createUserPreferences(faker, users) {
  console.log("⚙️  Creando preferencias de usuarios...");

  for (const user of users) {
    await prisma.user_preferences.create({
      data: {
        user_id: user.id,
        default_theme: faker.helpers.arrayElement(["light", "dark", "system"]),
        default_dashboard: faker.helpers.arrayElement([
          "reservations",
          "rooms",
          "reports",
          null,
        ]),
      },
    });
  }

  console.log("✅ Preferencias de usuarios creadas");
}

async function createComplexScenarios(
  faker,
  { completeGuests, incompleteGuests, receptionists, rooms, services, allUsers }
) {
  console.log("🏨 Creando escenarios complejos...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log("🧠 Creando reservas con lógica inteligente...");

  // Helper: crear huéspedes adicionales
  const createAdditionalGuests = (mainGuestId, maxCount) => {
    const count = faker.number.int({ min: 0, max: Math.min(maxCount, 2) });
    const guests = [];
    for (let i = 0; i < count; i++) {
      const useIncomplete = faker.datatype.boolean({ probability: 0.3 });
      const guest = useIncomplete
        ? faker.helpers.arrayElement(incompleteGuests)
        : faker.helpers.arrayElement(completeGuests.filter(g => g.id !== mainGuestId));
      guests.push({ guest_id: guest.id });
    }
    return guests;
  };

  // Helper: calcular totales
  const calculateTotals = (room, nights, includeService = true) => {
    const roomTotal = room.base_price * nights;
    let serviceTotal = 0;
    let serviceData = null;

    if (includeService && faker.datatype.boolean({ probability: 0.7 })) {
      const service = faker.helpers.arrayElement(services);
      const qty = faker.number.int({ min: 1, max: 3 });
      serviceTotal = service.price * qty;
      serviceData = { service, quantity: qty, subtotal: serviceTotal };
    }

    return { roomTotal, serviceTotal, total: roomTotal + serviceTotal, serviceData };
  };

  let resCounter = 1;

  // 1️⃣ COMPLETADAS HISTÓRICAS (últimos 12 meses): 80 reservas para reportes
  console.log("  ↳ Completadas históricas (últimos 12 meses)...");
  const allRoomsForHistory = rooms.slice(0, 20); // Usar las primeras 20 habitaciones
  for (let i = 0; i < 80; i++) {
    const room = faker.helpers.arrayElement(allRoomsForHistory);
    const nights = faker.number.int({ min: 1, max: 7 });

    // Distribuir en los últimos 12 meses
    const daysAgo = faker.number.int({ min: 30, max: 365 });
    const checkOut = new Date(today);
    checkOut.setDate(today.getDate() - daysAgo);
    const checkIn = new Date(checkOut);
    checkIn.setDate(checkOut.getDate() - nights);
    checkIn.setHours(14, 0, 0, 0);
    checkOut.setHours(11, 0, 0, 0);

    const mainGuest = faker.helpers.arrayElement(completeGuests);
    const { roomTotal, serviceTotal, total, serviceData } = calculateTotals(room, nights);

    await prisma.reservations.create({
      data: {
        code: `RES-${faker.string.alphanumeric(10).toUpperCase()}`,
        main_guest_id: mainGuest.id,
        receptionist_id: faker.helpers.arrayElement(receptionists).id,
        channel: faker.helpers.arrayElement(["reception", "web", "chatbot", "in_person"]),
        status: "completed",
        check_in_date: checkIn,
        check_out_date: checkOut,
        guest_count: faker.number.int({ min: 1, max: room.capacity }),
        total_amount: total,
        paid_amount: total,
        reservation_rooms: {
          create: {
            room_id: room.id,
            start_date: checkIn,
            end_date: checkOut,
            unit_price: room.base_price,
            subtotal: roomTotal,
          },
        },
        reservation_services: serviceData ? {
          create: {
            service_id: serviceData.service.id,
            quantity: serviceData.quantity,
            unit_price: serviceData.service.price,
            subtotal: serviceData.subtotal,
          },
        } : undefined,
        payments: {
          create: {
            amount: total,
            payment_method: faker.helpers.arrayElement(["credit_card", "debit_card", "cash", "bank_transfer"]),
            status: "confirmed",
            is_deposit: false,
          },
        },
        reservation_guests: { create: createAdditionalGuests(mainGuest.id, room.capacity - 1) },
      },
    });
  }

  // 2️⃣ CHECK-OUTS HOY (pending_checkout): 6 reservas
  console.log("  ↳ Check-outs hoy...");
  const occupiedForCheckout = rooms.filter(r => r.status === "occupied").slice(0, 6);
  for (let i = 0; i < occupiedForCheckout.length; i++) {
    const room = occupiedForCheckout[i];
    const nights = faker.number.int({ min: 2, max: 4 });
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() - nights);
    checkIn.setHours(14, 0, 0, 0);
    const checkOut = new Date(today);
    checkOut.setHours(11, 0, 0, 0);

    const mainGuest = faker.helpers.arrayElement(completeGuests);
    const { roomTotal, serviceTotal, total, serviceData } = calculateTotals(room, nights);

    // 50% con saldo pendiente, 50% pagado completo
    const hasPending = faker.datatype.boolean();
    const paidAmount = hasPending ? total * 0.8 : total;

    await prisma.reservations.create({
      data: {
        code: `CHECKOUT-TODAY-${String(i + 1).padStart(3, "0")}`,
        main_guest_id: mainGuest.id,
        receptionist_id: faker.helpers.arrayElement(receptionists).id,
        channel: faker.helpers.arrayElement(["reception", "web"]),
        status: "pending_checkout",
        check_in_date: checkIn,
        check_out_date: checkOut,
        guest_count: faker.number.int({ min: 1, max: room.capacity }),
        total_amount: total,
        paid_amount: paidAmount,
        reservation_rooms: {
          create: {
            room_id: room.id,
            start_date: checkIn,
            end_date: checkOut,
            unit_price: room.base_price,
            subtotal: roomTotal,
          },
        },
        reservation_services: serviceData ? {
          create: {
            service_id: serviceData.service.id,
            quantity: serviceData.quantity,
            unit_price: serviceData.service.price,
            subtotal: serviceData.subtotal,
          },
        } : undefined,
        payments: {
          create: {
            amount: paidAmount,
            payment_method: faker.helpers.arrayElement(["credit_card", "bank_transfer"]),
            status: "confirmed",
            is_deposit: false,
          },
        },
        reservation_guests: { create: createAdditionalGuests(mainGuest.id, room.capacity - 1) },
      },
    });
  }

  // 3️⃣ EN PROGRESO (in_progress): 2 reservas
  console.log("  ↳ En progreso...");
  const occupiedForProgress = rooms.filter(r => r.status === "occupied").slice(6, 8);
  for (let i = 0; i < occupiedForProgress.length; i++) {
    const room = occupiedForProgress[i];
    const nightsPast = faker.number.int({ min: 1, max: 3 });
    const nightsFuture = faker.number.int({ min: 2, max: 5 });
    const totalNights = nightsPast + nightsFuture;

    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() - nightsPast);
    checkIn.setHours(14, 0, 0, 0);
    const checkOut = new Date(today);
    checkOut.setDate(today.getDate() + nightsFuture);
    checkOut.setHours(11, 0, 0, 0);

    const mainGuest = faker.helpers.arrayElement(completeGuests);
    const { roomTotal, serviceTotal, total, serviceData } = calculateTotals(room, totalNights);

    // Algunos con cargos adicionales pendientes
    const hasExtraCharges = faker.datatype.boolean({ probability: 0.4 });
    const extraCharge = hasExtraCharges ? faker.number.int({ min: 5000, max: 15000 }) : 0;
    const finalTotal = total + extraCharge;
    const paidAmount = total; // Pagaron lo original, falta el cargo extra

    await prisma.reservations.create({
      data: {
        code: `RES-${faker.string.alphanumeric(10).toUpperCase()}`,
        main_guest_id: mainGuest.id,
        receptionist_id: faker.helpers.arrayElement(receptionists).id,
        channel: faker.helpers.arrayElement(["reception", "chatbot", "web"]),
        status: "in_progress",
        check_in_date: checkIn,
        check_out_date: checkOut,
        guest_count: faker.number.int({ min: 1, max: room.capacity }),
        total_amount: finalTotal,
        paid_amount: paidAmount,
        reservation_rooms: {
          create: {
            room_id: room.id,
            start_date: checkIn,
            end_date: checkOut,
            unit_price: room.base_price,
            subtotal: roomTotal,
          },
        },
        reservation_services: serviceData ? {
          create: {
            service_id: serviceData.service.id,
            quantity: serviceData.quantity,
            unit_price: serviceData.service.price,
            subtotal: serviceData.subtotal,
          },
        } : undefined,
        payments: {
          create: {
            amount: paidAmount,
            payment_method: faker.helpers.arrayElement(["credit_card", "debit_card"]),
            status: "confirmed",
            is_deposit: false,
          },
        },
        additional_charges: hasExtraCharges ? {
          create: {
            charge_type: faker.helpers.arrayElement(["minibar", "extra_service", "room_damage"]),
            description: "Cargo adicional durante estadía",
            amount: extraCharge,
            quantity: 1,
            subtotal: extraCharge,
            charged_by_id: faker.helpers.arrayElement(receptionists).id,
            room_id: room.id,
          },
        } : undefined,
        reservation_guests: { create: createAdditionalGuests(mainGuest.id, room.capacity - 1) },
      },
    });
  }

  // 4️⃣ CHECK-INS HOY (ready_for_checkin): 2 reservas
  console.log("  ↳ Check-ins hoy...");
  const availableForCheckin = rooms.filter(r => r.status === "available").slice(0, 2);
  for (let i = 0; i < availableForCheckin.length; i++) {
    const room = availableForCheckin[i];
    const nights = faker.number.int({ min: 2, max: 6 });
    const checkIn = new Date(today);
    checkIn.setHours(14, 0, 0, 0);
    const checkOut = new Date(today);
    checkOut.setDate(today.getDate() + nights);
    checkOut.setHours(11, 0, 0, 0);

    const mainGuest = faker.helpers.arrayElement(completeGuests);
    const { roomTotal, serviceTotal, total, serviceData } = calculateTotals(room, nights);

    // 70% pagado completo, 30% con 80%
    const paidAmount = faker.datatype.boolean({ probability: 0.7 }) ? total : total * 0.8;

    await prisma.reservations.create({
      data: {
        code: `CHECKIN-TODAY-${String(i + 1).padStart(3, "0")}`,
        main_guest_id: mainGuest.id,
        receptionist_id: faker.helpers.arrayElement(receptionists).id,
        channel: faker.helpers.arrayElement(["web", "chatbot", "reception"]),
        status: "ready_for_checkin",
        check_in_date: checkIn,
        check_out_date: checkOut,
        guest_count: faker.number.int({ min: 1, max: room.capacity }),
        total_amount: total,
        paid_amount: paidAmount,
        reservation_rooms: {
          create: {
            room_id: room.id,
            start_date: checkIn,
            end_date: checkOut,
            unit_price: room.base_price,
            subtotal: roomTotal,
          },
        },
        reservation_services: serviceData ? {
          create: {
            service_id: serviceData.service.id,
            quantity: serviceData.quantity,
            unit_price: serviceData.service.price,
            subtotal: serviceData.subtotal,
          },
        } : undefined,
        payments: {
          create: {
            amount: paidAmount,
            payment_method: faker.helpers.arrayElement(["credit_card", "bank_transfer"]),
            status: "confirmed",
            is_deposit: paidAmount < total,
          },
        },
        reservation_guests: { create: createAdditionalGuests(mainGuest.id, room.capacity - 1) },
      },
    });
  }

  // 5️⃣ CONFIRMADAS (próximos 2-7 días): 5 reservas
  console.log("  ↳ Confirmadas (futuro cercano)...");
  const availableForConfirmed = rooms.filter(r => r.status === "available").slice(2, 7);
  for (let i = 0; i < availableForConfirmed.length; i++) {
    const room = availableForConfirmed[i];
    const nights = faker.number.int({ min: 2, max: 7 });
    const daysUntilCheckin = faker.number.int({ min: 2, max: 7 });
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + daysUntilCheckin);
    checkIn.setHours(14, 0, 0, 0);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkIn.getDate() + nights);
    checkOut.setHours(11, 0, 0, 0);

    const mainGuest = faker.helpers.arrayElement(completeGuests);
    const { roomTotal, serviceTotal, total, serviceData } = calculateTotals(room, nights);

    // 60% pagado 50%, 40% pagado completo
    const paidAmount = faker.datatype.boolean({ probability: 0.6 }) ? total * 0.5 : total;

    await prisma.reservations.create({
      data: {
        code: `RES-${faker.string.alphanumeric(10).toUpperCase()}`,
        main_guest_id: mainGuest.id,
        receptionist_id: faker.helpers.arrayElement(receptionists).id,
        channel: faker.helpers.arrayElement(["web", "chatbot", "in_person"]),
        status: "confirmed",
        check_in_date: checkIn,
        check_out_date: checkOut,
        guest_count: faker.number.int({ min: 1, max: room.capacity }),
        total_amount: total,
        paid_amount: paidAmount,
        reservation_rooms: {
          create: {
            room_id: room.id,
            start_date: checkIn,
            end_date: checkOut,
            unit_price: room.base_price,
            subtotal: roomTotal,
          },
        },
        reservation_services: serviceData ? {
          create: {
            service_id: serviceData.service.id,
            quantity: serviceData.quantity,
            unit_price: serviceData.service.price,
            subtotal: serviceData.subtotal,
          },
        } : undefined,
        payments: {
          create: {
            amount: paidAmount,
            payment_method: faker.helpers.arrayElement(["bank_transfer", "credit_card"]),
            status: "confirmed",
            is_deposit: paidAmount < total,
          },
        },
        reservation_guests: { create: createAdditionalGuests(mainGuest.id, room.capacity - 1) },
      },
    });
  }

  // 6️⃣ PENDIENTES (8-30 días futuro): 5 reservas
  console.log("  ↳ Pendientes (futuro lejano)...");
  const availableForPending = rooms.filter(r => r.status === "available").slice(7, 12);
  for (let i = 0; i < availableForPending.length; i++) {
    const room = availableForPending[i];
    const nights = faker.number.int({ min: 1, max: 5 });
    const daysUntilCheckin = faker.number.int({ min: 8, max: 30 });
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + daysUntilCheckin);
    checkIn.setHours(14, 0, 0, 0);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkIn.getDate() + nights);
    checkOut.setHours(11, 0, 0, 0);

    const mainGuest = faker.helpers.arrayElement(completeGuests);
    const { roomTotal, serviceTotal, total, serviceData } = calculateTotals(room, nights);

    // 70% sin pago, 30% con 30% pagado
    const paidAmount = faker.datatype.boolean({ probability: 0.3 }) ? total * 0.3 : 0;

    await prisma.reservations.create({
      data: {
        code: `RES-${faker.string.alphanumeric(10).toUpperCase()}`,
        main_guest_id: mainGuest.id,
        receptionist_id: faker.helpers.arrayElement(receptionists).id,
        channel: faker.helpers.arrayElement(["chatbot", "web", "in_person"]),
        status: "pending",
        check_in_date: checkIn,
        check_out_date: checkOut,
        guest_count: faker.number.int({ min: 1, max: room.capacity }),
        total_amount: total,
        paid_amount: paidAmount,
        reservation_rooms: {
          create: {
            room_id: room.id,
            start_date: checkIn,
            end_date: checkOut,
            unit_price: room.base_price,
            subtotal: roomTotal,
          },
        },
        reservation_services: serviceData ? {
          create: {
            service_id: serviceData.service.id,
            quantity: serviceData.quantity,
            unit_price: serviceData.service.price,
            subtotal: serviceData.subtotal,
          },
        } : undefined,
        payments: paidAmount > 0 ? {
          create: {
            amount: paidAmount,
            payment_method: "bank_transfer",
            status: "confirmed",
            is_deposit: true,
          },
        } : undefined,
        reservation_guests: { create: createAdditionalGuests(mainGuest.id, room.capacity - 1) },
      },
    });
  }

  console.log("✅ 100+ reservas inteligentes creadas (80 completadas históricas + 6 checkout hoy + 2 en progreso + 2 checkin hoy + 5 confirmadas + 5 pendientes)");

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

  // ❌ COMENTADO: Ya no se crean cleaning_records directamente
  // Los cleaning_records se crean automáticamente cuando se hace checkout de una reserva
  // Esto sigue el flujo real: checkout → estado cleaning + cleaning_record → completar limpieza → available
  /*
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
  */

  console.log("✅ Mantenimiento y alertas creados");
}

async function createCleaningRecords(faker, receptionists) {
  console.log("🧹 Creando registros de limpieza...");

  // Crear registros de limpieza para habitaciones que ya completaron checkout
  const completedReservations = await prisma.reservations.findMany({
    where: { status: "completed" },
    include: { reservation_rooms: { include: { rooms: true } } },
  });

  for (const reservation of completedReservations) {
    for (const resRoom of reservation.reservation_rooms) {
      await prisma.cleaning_records.create({
        data: {
          room_id: resRoom.room_id,
          receptionist_id: faker.helpers.arrayElement(receptionists).id,
          record_date: new Date(reservation.check_out_date),
          observations: faker.helpers.arrayElement([
            "Limpieza profunda realizada",
            "Toallas y sábanas cambiadas",
            "Baño desinfectado",
            "Habitación en perfecto estado",
            null,
          ]),
          is_completed: true,
          completed_at: faker.date.between({
            from: reservation.check_out_date,
            to: new Date(reservation.check_out_date.getTime() + 3600000), // +1 hora
          }),
        },
      });
    }
  }

  console.log("✅ Registros de limpieza creados");
}

async function createRoomServiceDaily(faker, services) {
  console.log("🍽️  Creando servicios diarios de habitación...");

  // Obtener reservas en progreso y pending_checkout
  const activeReservations = await prisma.reservations.findMany({
    where: {
      status: { in: ["in_progress", "pending_checkout"] },
    },
    include: {
      reservation_rooms: true,
      reservation_services: { include: { services: true } },
    },
  });

  const desayunoService = services.find((s) => s.name === "Desayuno");

  for (const reservation of activeReservations) {
    // Solo crear para reservas que tienen desayuno
    const hasBreakfast = reservation.reservation_services.some(
      (rs) => rs.service_id === desayunoService?.id
    );

    if (hasBreakfast && desayunoService) {
      for (const resRoom of reservation.reservation_rooms) {
        // Crear registros diarios de desayuno
        const checkIn = new Date(reservation.check_in_date);
        const today = new Date();
        const endDate = new Date(
          Math.min(today.getTime(), new Date(reservation.check_out_date).getTime())
        );

        let currentDate = new Date(checkIn);
        while (currentDate <= endDate) {
          const guestCount = faker.number.int({ min: 1, max: 3 });
          await prisma.room_service_daily.create({
            data: {
              reservation_room_id: resRoom.id,
              service_id: desayunoService.id,
              service_date: new Date(currentDate),
              unit_price: desayunoService.price,
              quantity: guestCount,
              subtotal: desayunoService.price * guestCount,
            },
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }
  }

  console.log("✅ Servicios diarios de habitación creados");
}

async function createRoomGuestAssignments(faker) {
  console.log("👥 Creando asignaciones de huéspedes a habitaciones...");

  const activeReservations = await prisma.reservations.findMany({
    where: {
      status: { in: ["in_progress", "pending_checkout"] },
    },
    include: {
      reservation_rooms: true,
      reservation_guests: true,
    },
  });

  for (const reservation of activeReservations) {
    for (const resRoom of reservation.reservation_rooms) {
      // Asignar huésped principal
      await prisma.room_guest_assignments.create({
        data: {
          reservation_room_id: resRoom.id,
          guest_id: reservation.main_guest_id,
          assigned_at: reservation.check_in_date,
          valid_from: reservation.check_in_date,
          valid_to: null,
        },
      });

      // Asignar huéspedes adicionales (algunos)
      const additionalGuestsToAssign = reservation.reservation_guests.slice(
        0,
        faker.number.int({ min: 0, max: Math.min(2, reservation.reservation_guests.length) })
      );

      for (const resGuest of additionalGuestsToAssign) {
        await prisma.room_guest_assignments.create({
          data: {
            reservation_room_id: resRoom.id,
            guest_id: resGuest.guest_id,
            assigned_at: reservation.check_in_date,
            valid_from: reservation.check_in_date,
            valid_to: null,
          },
        });
      }
    }
  }

  console.log("✅ Asignaciones de huéspedes a habitaciones creadas");
}

async function createReservationHistory(faker, receptionists) {
  console.log("📜 Creando historial de cambios en reservas...");

  const allReservations = await prisma.reservations.findMany({
    where: {
      status: { in: ["confirmed", "in_progress", "pending_checkout", "completed"] },
    },
  });

  for (const reservation of allReservations) {
    // Evento: Creación de reserva
    await prisma.reservation_history.create({
      data: {
        reservation_id: reservation.id,
        change_type: "created",
        field_changed: null,
        old_value: null,
        new_value: null,
        changed_by_user_id: reservation.receptionist_id,
        change_reason: "Reserva creada en el sistema",
        created_at: reservation.created_at,
      },
    });

    // Evento: Confirmación de pago (si está confirmada o más)
    if (["confirmed", "in_progress", "pending_checkout", "completed"].includes(reservation.status)) {
      await prisma.reservation_history.create({
        data: {
          reservation_id: reservation.id,
          change_type: "payment_confirmed",
          field_changed: "status",
          old_value: "pending",
          new_value: "confirmed",
          changed_by_user_id: reservation.receptionist_id,
          change_reason: "Pago confirmado por recepcionista",
          created_at: new Date(reservation.created_at.getTime() + 1800000), // +30 min
        },
      });
    }

    // Evento: Check-in (si está in_progress o más)
    if (["in_progress", "pending_checkout", "completed"].includes(reservation.status)) {
      await prisma.reservation_history.create({
        data: {
          reservation_id: reservation.id,
          change_type: "checked_in",
          field_changed: "status",
          old_value: "ready_for_checkin",
          new_value: "in_progress",
          changed_by_user_id: faker.helpers.arrayElement(receptionists).id,
          change_reason: "Check-in realizado",
          created_at: reservation.check_in_date,
        },
      });
    }

    // Evento: Check-out (si está completed)
    if (reservation.status === "completed") {
      await prisma.reservation_history.create({
        data: {
          reservation_id: reservation.id,
          change_type: "checked_out",
          field_changed: "status",
          old_value: "pending_checkout",
          new_value: "completed",
          changed_by_user_id: faker.helpers.arrayElement(receptionists).id,
          change_reason: "Check-out completado",
          created_at: reservation.check_out_date,
        },
      });
    }

    // Algunos tienen cambios adicionales (modificaciones aleatorias)
    if (faker.datatype.boolean({ probability: 0.3 })) {
      // Solo crear si created_at es antes de check_in_date
      if (reservation.created_at < reservation.check_in_date) {
        await prisma.reservation_history.create({
          data: {
            reservation_id: reservation.id,
            change_type: "updated",
            field_changed: "guest_count",
            old_value: String(reservation.guest_count - 1),
            new_value: String(reservation.guest_count),
            changed_by_user_id: faker.helpers.arrayElement(receptionists).id,
            change_reason: "Huésped adicional agregado",
            created_at: faker.date.between({
              from: reservation.created_at,
              to: reservation.check_in_date,
            }),
          },
        });
      }
    }
  }

  console.log("✅ Historial de cambios en reservas creado");
}

async function createNotificationsAndAlerts(faker, receptionists, allUsers, roles) {
  console.log("🔔 Creando notificaciones y alertas...");

  // Crear notificaciones generales
  for (let i = 0; i < 8; i++) {
    const sender = faker.helpers.arrayElement(receptionists);
    const targetRole = faker.helpers.arrayElement([
      roles.receptionistRole,
      roles.adminRole,
      null,
    ]);

    const notification = await prisma.notifications.create({
      data: {
        sender_id: sender.id,
        target_role_id: targetRole?.id || null,
        title: faker.helpers.arrayElement([
          "Reunión de equipo programada",
          "Actualización del sistema",
          "Nueva política de cancelación",
          "Revisión mensual de inventario",
          "Capacitación sobre nuevo módulo",
        ]),
        message: faker.lorem.paragraph(),
        category: faker.helpers.arrayElement([
          "general",
          "operational",
          "administrative",
        ]),
        sent_at: faker.date.recent({ days: 15 }),
      },
    });

    // Crear estados de lectura para usuarios
    const targetUsers = targetRole
      ? allUsers.filter((u) =>
          u.user_roles.some((ur) => ur.role_id === targetRole.id)
        )
      : [faker.helpers.arrayElement(allUsers)];

    for (const user of targetUsers) {
      await prisma.notification_read_status.create({
        data: {
          notification_id: notification.id,
          user_id: user.id,
          status: faker.helpers.arrayElement(["read", "unread", "archived"]),
          updated_at: faker.date.between({
            from: notification.sent_at,
            to: new Date(),
          }),
        },
      });
    }
  }

  // Crear alertas relacionadas con reservas
  const pendingCheckoutReservations = await prisma.reservations.findMany({
    where: { status: "pending_checkout" },
    take: 3,
  });

  for (const reservation of pendingCheckoutReservations) {
    const alert = await prisma.alerts.create({
      data: {
        type: "checkout",
        status: faker.helpers.arrayElement(["pending", "resolved"]),
        reservation_id: reservation.id,
        detail: `Checkout pendiente para reserva ${reservation.code}`,
        full_summary: {
          reservation_code: reservation.code,
          check_out_date: reservation.check_out_date,
          guest_count: reservation.guest_count,
        },
        created_at: new Date(reservation.check_out_date),
      },
    });

    // Crear estados de lectura de alertas
    for (const receptionist of receptionists) {
      await prisma.alert_read_status.create({
        data: {
          alert_id: alert.id,
          user_id: receptionist.id,
          status: faker.helpers.arrayElement(["pending", "resolved"]),
          updated_at: faker.date.between({
            from: alert.created_at,
            to: new Date(),
          }),
        },
      });
    }
  }

  // Crear alertas de pago
  const reservationsWithPending = await prisma.reservations.findMany({
    where: {
      status: { in: ["confirmed", "ready_for_checkin"] },
      NOT: {
        paid_amount: {
          equals: prisma.reservations.fields.total_amount,
        },
      },
    },
    take: 3,
  });

  for (const reservation of reservationsWithPending) {
    const alert = await prisma.alerts.create({
      data: {
        type: "payment",
        status: "pending",
        reservation_id: reservation.id,
        detail: `Pago pendiente para reserva ${reservation.code}`,
        full_summary: {
          reservation_code: reservation.code,
          total_amount: reservation.total_amount,
          paid_amount: reservation.paid_amount,
          pending_amount: reservation.total_amount - (reservation.paid_amount || 0),
        },
      },
    });

    for (const receptionist of receptionists) {
      await prisma.alert_read_status.create({
        data: {
          alert_id: alert.id,
          user_id: receptionist.id,
          status: "pending",
        },
      });
    }
  }

  console.log("✅ Notificaciones y alertas creadas");
}

async function createActivityLogs(faker, receptionists, allUsers) {
  console.log("📋 Creando registros de actividad...");

  const allReservations = await prisma.reservations.findMany({
    where: {
      status: { in: ["confirmed", "in_progress", "pending_checkout", "completed"] },
    },
  });

  for (const reservation of allReservations) {
    // Log de creación de reserva
    await prisma.activity_logs.create({
      data: {
        user_id: reservation.receptionist_id,
        user_role: "receptionist",
        action: "CREATE_RESERVATION",
        timestamp: reservation.created_at,
        affected_table: "reservations",
        record_id: reservation.id,
        details: `Reserva ${reservation.code} creada`,
      },
    });

    // Log de confirmación de pago
    if (["confirmed", "in_progress", "pending_checkout", "completed"].includes(reservation.status)) {
      await prisma.activity_logs.create({
        data: {
          user_id: reservation.receptionist_id,
          user_role: "receptionist",
          action: "CONFIRM_PAYMENT",
          timestamp: new Date(reservation.created_at.getTime() + 1800000),
          affected_table: "payments",
          record_id: reservation.id,
          details: `Pago confirmado para reserva ${reservation.code}`,
        },
      });
    }

    // Log de check-in
    if (["in_progress", "pending_checkout", "completed"].includes(reservation.status)) {
      await prisma.activity_logs.create({
        data: {
          user_id: faker.helpers.arrayElement(receptionists).id,
          user_role: "receptionist",
          action: "CHECK_IN",
          timestamp: reservation.check_in_date,
          affected_table: "reservations",
          record_id: reservation.id,
          details: `Check-in realizado para reserva ${reservation.code}`,
        },
      });
    }

    // Log de check-out
    if (reservation.status === "completed") {
      await prisma.activity_logs.create({
        data: {
          user_id: faker.helpers.arrayElement(receptionists).id,
          user_role: "receptionist",
          action: "CHECK_OUT",
          timestamp: reservation.check_out_date,
          affected_table: "reservations",
          record_id: reservation.id,
          details: `Check-out completado para reserva ${reservation.code}`,
        },
      });
    }
  }

  // Logs de actualización de perfil para algunos usuarios
  for (let i = 0; i < 5; i++) {
    const user = faker.helpers.arrayElement(allUsers);
    await prisma.activity_logs.create({
      data: {
        user_id: user.id,
        user_role: user.user_roles[0]?.role_id === 1 ? "administrator" : user.user_roles[0]?.role_id === 2 ? "receptionist" : "guest",
        action: "UPDATE_PROFILE",
        timestamp: faker.date.recent({ days: 30 }),
        affected_table: "users",
        record_id: user.id,
        details: `Usuario actualizó su perfil`,
      },
    });
  }

  console.log("✅ Registros de actividad creados");
}

async function createSystemErrors(faker, receptionists) {
  console.log("⚠️  Creando errores del sistema...");

  for (let i = 0; i < 5; i++) {
    const userOrNull = faker.helpers.arrayElement([...receptionists, null]);
    await prisma.system_errors.create({
      data: {
        timestamp: faker.date.recent({ days: 30 }),
        user_id: userOrNull?.id || null,
        user_role: faker.helpers.arrayElement(["receptionist", "administrator", null]),
        description: faker.helpers.arrayElement([
          "Error al procesar pago con tarjeta",
          "Timeout en conexión a servicio externo",
          "Error de validación en formulario de reserva",
          "Fallo al enviar correo de confirmación",
          "Error al generar reporte PDF",
        ]),
        origin_module: faker.helpers.arrayElement([
          "payments",
          "reservations",
          "notifications",
          "reports",
          "authentication",
        ]),
        severity: faker.helpers.arrayElement(["low", "medium", "high", "critical"]),
        status: faker.helpers.arrayElement(["pending", "in_review", "resolved"]),
      },
    });
  }

  console.log("✅ Errores del sistema creados");
}

async function main() {
  const faker = await getFaker();
  console.log("🚀 Iniciando seed del Hotel Don Teo...");

  await cleanDatabase();
  const coreData = await createCoreData();
  const receptionists = await createUsers(coreData.roles);
  const guests = await createGuests(faker, coreData.roles.guestRole);
  const rooms = await createRooms(coreData.roomTypes);

  // Obtener todos los usuarios (incluyendo admin)
  const allUsers = await prisma.users.findMany({
    include: { user_roles: true },
  });

  // Crear LoginHistory para todos los usuarios
  await createLoginHistory(faker, allUsers);

  // Crear preferencias para todos los usuarios
  await createUserPreferences(faker, allUsers);

  // Crear reservas y escenarios complejos
  await createComplexScenarios(faker, {
    completeGuests: guests.completeGuests,
    incompleteGuests: guests.incompleteGuests,
    receptionists: [receptionists.carlos, receptionists.juan],
    rooms,
    services: coreData.services,
    allUsers,
  });

  // Crear registros de limpieza para reservas completadas
  await createCleaningRecords(faker, [receptionists.carlos, receptionists.juan]);

  // Crear servicios diarios de habitación (desayunos)
  await createRoomServiceDaily(faker, coreData.services);

  // Crear asignaciones de huéspedes a habitaciones
  await createRoomGuestAssignments(faker);

  // Crear historial de cambios en reservas
  await createReservationHistory(faker, [receptionists.carlos, receptionists.juan]);

  // Crear notificaciones y alertas
  await createNotificationsAndAlerts(
    faker,
    [receptionists.carlos, receptionists.juan],
    allUsers,
    coreData.roles
  );

  // Crear registros de actividad
  await createActivityLogs(faker, [receptionists.carlos, receptionists.juan], allUsers);

  // Crear errores del sistema
  await createSystemErrors(faker, [receptionists.carlos, receptionists.juan]);

  console.log("\n🎉 Seed completado exitosamente!");
  console.log("\n📊 Resumen de datos creados:");
  console.log("   ✓ Usuarios (staff + huéspedes)");
  console.log("   ✓ Habitaciones y tipos de habitación");
  console.log("   ✓ Servicios y menú de desayuno");
  console.log("   ✓ Temporadas y promociones");
  console.log("   ✓ Reservas en múltiples estados");
  console.log("   ✓ Pagos y cargos adicionales");
  console.log("   ✓ Registros de limpieza");
  console.log("   ✓ Servicios diarios de habitación");
  console.log("   ✓ Asignaciones de huéspedes a habitaciones");
  console.log("   ✓ Historial de cambios en reservas");
  console.log("   ✓ Tareas de mantenimiento");
  console.log("   ✓ Notificaciones y alertas");
  console.log("   ✓ Registros de actividad");
  console.log("   ✓ Historial de logins");
  console.log("   ✓ Preferencias de usuarios");
  console.log("   ✓ Errores del sistema");
  console.log("\n🔑 Credenciales:");
  console.log("   Admin: super.admin@hotel.com / password123");
  console.log("   Recepcionista: carlos.recepcionista@hotel.com / password123");
  console.log("   Recepcionista: juan.recepcionista@hotel.com / password123");
}

module.exports = { main };
