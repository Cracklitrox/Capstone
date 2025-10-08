const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


/**
 * Limpiar RUT (eliminar puntos, espacios y guiones)
 */
const cleanRut = (rutString) => {
  if (!rutString) return "";
  return rutString.replace(/[.\s-]/g, "");
};

/**
 * Separar RUT y DV desde un string
 */
const parseRut = (rutString) => {
  if (!rutString) return { rut: "", dv: "" };

  // Usa cleanRut (local) para eliminar todos los caracteres de formato
  const cleanedAll = cleanRut(rutString);
  
  // Separa el número base del DV
  const rutBase = cleanedAll.slice(0, -1);
  const dv = cleanedAll.slice(-1);

  return {
    rut: rutBase || "",
    dv: dv || "",
  };
};


/**
 * Buscar huésped por número de identificación
 */
async function searchGuestByIdentification(identificationNumber) {
  // 2. Limpiar el RUT de puntos y obtener el formato limpio XXXXXXXX-X
  const { rut: rutBase, dv } = parseRut(identificationNumber);
  const cleanIdNumber = `${rutBase}-${dv}`;

  const guest = await prisma.users.findFirst({
    where: {
      // Usar el valor limpio
      identification_number: cleanIdNumber,
      deleted_at: null,
      user_roles: {
        some: {
          roles: {
            name: "guest",
          },
        },
      },
    },
    include: {
      guest_details: true,
      user_roles: {
        include: {
          roles: true,
        },
      },
    },
  });

  if (!guest) {
    return { found: false };
  }

  return {
    found: true,
    guest: {
      id: guest.id,
      identificationNumber: guest.identification_number,
      firstName: guest.first_name,
      paternalLastName: guest.paternal_last_name,
      maternalLastName: guest.maternal_last_name,
      email: guest.email,
      phoneNumber: guest.phone_number,
      birthDate: guest.birth_date,
      gender: guest.gender,
      country: guest.country,
      region: guest.region,
      city: guest.city,
      travelsWithChildren: guest.guest_details?.travels_with_children,
      childrenUnderFour: guest.guest_details?.children_under_four || 0,
      specialRequests: guest.guest_details?.special_requests,
      observations: guest.guest_details?.observations,
    },
  };
}

/**
 * Crear o actualizar huésped
 */
async function createOrUpdateGuest(
  guestData,
  isMainGuest = true,
  isUpdate = false,
  guestId = null
) {
  const {
    identificationNumber,
    firstName,
    paternalLastName,
    maternalLastName,
    email,
    phoneNumber,
    birthDate,
    gender,
    country,
    region,
    city,
    travelsWithChildren,
    childrenUnderFour,
    specialRequests,
    observations,
  } = guestData;

  // 3. Limpiar y formatear el RUT para el almacenamiento en la BD (XXXXXXXX-X)
  const { rut: rutBase, dv } = parseRut(identificationNumber);
  const formattedIdNumber = `${rutBase}-${dv}`;

  const cleanData = {
    // Usar el RUT limpio y formateado
    identificationNumber: formattedIdNumber,
    firstName,
    paternalLastName,
    maternalLastName,
    email: email && email.trim() !== "" ? email : null,
    phoneNumber,
    birthDate: birthDate && birthDate.trim() !== "" ? birthDate : null,
    gender: gender && gender.trim() !== "" ? gender : null,
    country,
    region,
    city,
    travelsWithChildren,
    childrenUnderFour,
    specialRequests:
      specialRequests && specialRequests.trim() !== "" ? specialRequests : null,
    observations:
      observations && observations.trim() !== "" ? observations : null,
  };

  // Calcular is_fully_registered dinámicamente
  const allRequiredFields = [
    "identificationNumber",
    "firstName",
    "paternalLastName",
    "maternalLastName",
    "phoneNumber",
    "birthDate",
    "gender",
    "country",
    "region",
    "city",
  ];
  const isFullyRegistered = allRequiredFields.every(
    (field) => cleanData[field] && cleanData[field].trim() !== ""
  );

  if (isUpdate && guestId) {
    // Actualizar huésped existente
    const updatedGuest = await prisma.users.update({
      where: { id: guestId },
      data: {
        // ... (el identification_number no se actualiza aquí)
        first_name: cleanData.firstName,
        paternal_last_name: cleanData.paternalLastName,
        maternal_last_name: cleanData.maternalLastName,
        email: cleanData.email,
        phone_number: cleanData.phoneNumber,
        birth_date: cleanData.birthDate ? new Date(cleanData.birthDate) : null,
        gender: cleanData.gender,
        country: cleanData.country,
        region: cleanData.region,
        city: cleanData.city,
        is_fully_registered: isFullyRegistered,
        guest_details: {
          upsert: {
            create: {
              travels_with_children: cleanData.travelsWithChildren || false,
              children_under_four: cleanData.childrenUnderFour || 0,
              special_requests: cleanData.specialRequests,
              observations: cleanData.observations,
            },
            update: {
              travels_with_children: cleanData.travelsWithChildren || false,
              children_under_four: cleanData.childrenUnderFour || 0,
              special_requests: cleanData.specialRequests,
              observations: cleanData.observations,
            },
          },
        },
      },
    });

    return updatedGuest;
  }

  // Crear nuevo huésped
  const newGuest = await prisma.users.create({
    data: {
      // Usar el RUT limpio y formateado
      identification_number: cleanData.identificationNumber,
      first_name: cleanData.firstName,
      paternal_last_name: cleanData.paternalLastName,
      maternal_last_name: cleanData.maternalLastName,
      email: cleanData.email,
      phone_number: cleanData.phoneNumber,
      birth_date: cleanData.birthDate ? new Date(cleanData.birthDate) : null,
      gender: cleanData.gender,
      country: cleanData.country || "Chile",
      region: cleanData.region,
      city: cleanData.city,
      password_hash: "GUEST_NO_PASSWORD",
      status: "active",
      is_fully_registered: isFullyRegistered,
      user_roles: {
        create: {
          roles: {
            connect: { name: "guest" },
          },
        },
      },
      guest_details: {
        create: {
          travels_with_children: cleanData.travelsWithChildren || false,
          children_under_four: cleanData.childrenUnderFour || 0,
          special_requests: cleanData.specialRequests,
          observations: cleanData.observations,
        },
      },
    },
  });

  return newGuest;
}

/**
 * Obtener perfil completo de huésped por ID
 */
async function getGuestProfileById(guestId) {
  const guest = await prisma.users.findFirst({
    where: {
      id: guestId,
      deleted_at: null,
      user_roles: {
        some: {
          roles: {
            name: "guest",
          },
        },
      },
    },
    include: {
      guest_details: true,
      user_roles: {
        include: {
          roles: true,
        },
      },
      reservations_reservations_main_guest_idTousers: {
        select: {
          id: true,
          code: true,
          status: true,
          check_in_date: true,
          check_out_date: true,
          total_amount: true,
        },
        where: {
          deleted_at: null,
        },
      },
    },
  });

  if (!guest) {
    return { found: false };
  }

  // Calcular estadísticas básicas
  const totalReservations = guest.reservations_reservations_main_guest_idTousers.length;
  const completedReservations = guest.reservations_reservations_main_guest_idTousers.filter(
    r => r.status === "completed"
  ).length;
  const totalSpent = guest.reservations_reservations_main_guest_idTousers
    .filter(r => r.status === "completed")
    .reduce((sum, r) => sum + (r.total_amount || 0), 0);

  return {
    found: true,
    guest: {
      id: guest.id,
      identificationNumber: guest.identification_number,
      firstName: guest.first_name,
      paternalLastName: guest.paternal_last_name,
      maternalLastName: guest.maternal_last_name,
      email: guest.email,
      phoneNumber: guest.phone_number,
      birthDate: guest.birth_date,
      gender: guest.gender,
      country: guest.country,
      region: guest.region,
      city: guest.city,
      status: guest.status,
      createdAt: guest.created_at,
      lastLoginAt: guest.last_login_at,
      // Detalles adicionales
      travelsWithChildren: guest.guest_details?.travels_with_children,
      childrenUnderFour: guest.guest_details?.children_under_four || 0,
      specialRequests: guest.guest_details?.special_requests,
      observations: guest.guest_details?.observations,
      // Estadísticas
      stats: {
        totalReservations,
        completedReservations,
        totalSpent,
      },
    },
  };
}

/**
 * Obtener historial de reservas de huésped con filtros y paginación
 */
async function getGuestReservationsHistory(guestId, filters = {}, pagination = {}) {
  const { page = 1, limit = 10 } = pagination;
  const offset = (page - 1) * limit;

  // Construir filtros dinámicos
  const whereConditions = {
    main_guest_id: guestId,
    deleted_at: null,
  };

  if (filters.status) {
    whereConditions.status = filters.status;
  }

  if (filters.startDate && filters.endDate) {
    whereConditions.check_in_date = {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate),
    };
  } else if (filters.startDate) {
    whereConditions.check_in_date = {
      gte: new Date(filters.startDate),
    };
  } else if (filters.endDate) {
    whereConditions.check_in_date = {
      lte: new Date(filters.endDate),
    };
  }

  // Obtener reservas con paginación
  const [reservations, totalCount] = await Promise.all([
    prisma.reservations.findMany({
      where: whereConditions,
      include: {
        reservation_rooms: {
          include: {
            rooms: {
              include: {
                room_types: true,
              },
            },
          },
        },
        reservation_services: {
          include: {
            services: true,
          },
        },
        payments: {
          where: {
            deleted_at: null,
          },
        },
        reservation_guests: {
          include: {
            users: true,
          },
          where: {
            deleted_at: null,
          },
        },
      },
      orderBy: {
        check_in_date: "desc",
      },
      skip: offset,
      take: limit,
    }),
    prisma.reservations.count({
      where: whereConditions,
    }),
  ]);

  // Formatear datos de respuesta
  const formattedReservations = reservations.map(reservation => ({
    id: reservation.id,
    code: reservation.code,
    status: reservation.status,
    channel: reservation.channel,
    checkInDate: reservation.check_in_date,
    checkOutDate: reservation.check_out_date,
    guestCount: reservation.guest_count,
    totalAmount: reservation.total_amount,
    paidAmount: reservation.paid_amount,
    bookingType: reservation.booking_type,
    stayType: reservation.stay_type,
    createdAt: reservation.created_at,
    // Habitaciones
    rooms: reservation.reservation_rooms.map(rr => ({
      id: rr.rooms.id,
      roomNumber: rr.rooms.room_number,
      roomType: rr.rooms.room_types.name,
      unitPrice: rr.unit_price,
      subtotal: rr.subtotal,
      startDate: rr.start_date,
      endDate: rr.end_date,
    })),
    // Servicios
    services: reservation.reservation_services.map(rs => ({
      id: rs.services.id,
      name: rs.services.name,
      quantity: rs.quantity,
      unitPrice: rs.unit_price,
      subtotal: rs.subtotal,
    })),
    // Pagos
    payments: reservation.payments.map(p => ({
      id: p.id,
      method: p.payment_method,
      status: p.status,
      amount: p.amount,
      isDeposit: p.is_deposit,
      createdAt: p.created_at,
    })),
    // Huéspedes adicionales
    additionalGuests: reservation.reservation_guests
      .filter(rg => rg.guest_id !== guestId)
      .map(rg => ({
        id: rg.users.id,
        name: `${rg.users.first_name} ${rg.users.paternal_last_name}`,
        email: rg.users.email,
      })),
  }));

  const totalPages = Math.ceil(totalCount / limit);

  return {
    data: formattedReservations,
    meta: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Buscar todos los huéspedes con filtros y paginación
 */
async function searchAllGuestsService(searchTerm = "", pagination = {}) {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  // Construir filtros de búsqueda
  const whereConditions = {
    deleted_at: null,
    user_roles: {
      some: {
        roles: {
          name: "guest",
        },
      },
    },
  };

  if (searchTerm) {
    whereConditions.OR = [
      {
        identification_number: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      {
        first_name: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      {
        paternal_last_name: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      {
        maternal_last_name: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
    ];
  }

  // Obtener huéspedes con paginación
  const [guests, totalCount] = await Promise.all([
    prisma.users.findMany({
      where: whereConditions,
      select: {
        id: true,
        identification_number: true,
        first_name: true,
        paternal_last_name: true,
        maternal_last_name: true,
        email: true,
        phone_number: true,
        country: true,
        created_at: true,
        last_login_at: true,
        _count: {
          select: {
            reservations_reservations_main_guest_idTousers: {
              where: {
                deleted_at: null,
              },
            },
          },
        },
      },
      orderBy: [
        { last_login_at: "desc" },
        { created_at: "desc" },
      ],
      skip: offset,
      take: limit,
    }),
    prisma.users.count({
      where: whereConditions,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    data: guests.map(guest => ({
      id: guest.id,
      identificationNumber: guest.identification_number,
      fullName: `${guest.first_name} ${guest.paternal_last_name} ${guest.maternal_last_name}`.trim(),
      email: guest.email,
      phoneNumber: guest.phone_number,
      country: guest.country,
      createdAt: guest.created_at,
      lastLoginAt: guest.last_login_at,
      totalReservations: guest._count.reservations_reservations_main_guest_idTousers,
    })),
    meta: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

module.exports = {
  searchGuestByIdentification,
  createOrUpdateGuest,
  getGuestProfileById,
  getGuestReservationsHistory,
  searchAllGuestsService,
};
