import prisma from '../../db/prisma.client.js';

/**
 * Limpiar RUT (eliminar puntos, espacios y guiones)
 */
export const cleanRut = (rutString) => {
  if (!rutString) return "";
  return rutString.replace(/[.\s-]/g, "");
};

/**
 * Separar RUT y DV desde un string
 */
export const parseRut = (rutString) => {
  if (!rutString) return { rut: "", dv: "" };

  const cleanedAll = cleanRut(rutString);
  const rutBase = cleanedAll.slice(0, -1);
  const dv = cleanedAll.slice(-1);

  return {
    rut: rutBase || "",
    dv: dv || "",
  };
};

/**
 * ✅ HELPER: Convertir strings vacíos a NULL
 * Mantiene la integridad de datos en la BD
 */
export const sanitizeGuestData = (data) => {
  const sanitized = {};

  // Campos requeridos (nunca null)
  sanitized.identificationNumber = data.identificationNumber;
  sanitized.firstName = data.firstName;
  sanitized.paternalLastName = data.paternalLastName;

  // Campos opcionales (pueden ser null)
  sanitized.maternalLastName =
    data.maternalLastName && data.maternalLastName.trim() !== ""
      ? data.maternalLastName
      : null;

  sanitized.email = data.email && data.email.trim() !== "" ? data.email : null;

  sanitized.phoneNumber =
    data.phoneNumber && data.phoneNumber.trim() !== ""
      ? data.phoneNumber
      : null;

  sanitized.birthDate =
    data.birthDate && data.birthDate.trim() !== "" ? data.birthDate : null;

  sanitized.gender =
    data.gender && data.gender.trim() !== "" ? data.gender : null;

  sanitized.country =
    data.country && data.country.trim() !== "" ? data.country : "Chile";

  sanitized.region =
    data.region && data.region.trim() !== "" ? data.region : null;

  sanitized.city = data.city && data.city.trim() !== "" ? data.city : null;

  // Campos booleanos/numéricos
  sanitized.travelsWithChildren = data.travelsWithChildren || false;
  sanitized.childrenUnderFour = data.childrenUnderFour || 0;

  sanitized.specialRequests =
    data.specialRequests && data.specialRequests.trim() !== ""
      ? data.specialRequests
      : null;

  sanitized.observations =
    data.observations && data.observations.trim() !== ""
      ? data.observations
      : null;

  return sanitized;
};

/**
 * ✅ HELPER: Calcular si el huésped está completamente registrado
 */
export const calculateIsFullyRegistered = (cleanData, isMainGuest) => {
  if (isMainGuest) {
    // Huésped principal: TODOS los campos obligatorios
    const requiredFields = [
      "identificationNumber",
      "firstName",
      "paternalLastName",
      "maternalLastName",
      "email",
      "phoneNumber",
      "birthDate",
      "gender",
      "country",
      "region",
      "city",
    ];

    return requiredFields.every(
      (field) => cleanData[field] && String(cleanData[field]).trim() !== ""
    );
  } else {
    // Huésped adicional: SOLO 3 campos mínimos
    const requiredFields = [
      "identificationNumber",
      "firstName",
      "paternalLastName",
    ];

    return requiredFields.every(
      (field) => cleanData[field] && String(cleanData[field]).trim() !== ""
    );
  }
};

/**
 * Buscar huésped por número de identificación
 */
export async function searchGuestByIdentification(identificationNumber) {
  const { rut: rutBase, dv } = parseRut(identificationNumber);
  const cleanIdNumber = `${rutBase}-${dv}`;

  const guest = await prisma.users.findFirst({
    where: {
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
 * ✅ CREAR huésped nuevo
 */
export async function createGuest(guestData, isMainGuest = true) {
  // Limpiar y formatear datos
  const cleanData = sanitizeGuestData(guestData);
  const { rut: rutBase, dv } = parseRut(cleanData.identificationNumber);
  const formattedIdNumber = `${rutBase}-${dv}`;

  // ✅ Verificar si ya existe
  const existingGuest = await prisma.users.findFirst({
    where: {
      identification_number: formattedIdNumber,
      deleted_at: null,
    },
    include: {
      guest_details: true,
    },
  });

  if (existingGuest) {
    // ✅ IMPORTANTE: Devolver 409 con los datos del huésped existente
    const error = new Error("Ya existe un huésped con esta identificación");
    error.statusCode = 409;
    error.existingGuest = {
      id: existingGuest.id,
      identificationNumber: existingGuest.identification_number,
      firstName: existingGuest.first_name,
      paternalLastName: existingGuest.paternal_last_name,
      maternalLastName: existingGuest.maternal_last_name,
      email: existingGuest.email,
      phoneNumber: existingGuest.phone_number,
      birthDate: existingGuest.birth_date,
      gender: existingGuest.gender,
      country: existingGuest.country,
      region: existingGuest.region,
      city: existingGuest.city,
      travelsWithChildren: existingGuest.guest_details?.travels_with_children,
      childrenUnderFour: existingGuest.guest_details?.children_under_four || 0,
      specialRequests: existingGuest.guest_details?.special_requests,
      observations: existingGuest.guest_details?.observations,
    };
    throw error;
  }

  // Calcular si está completamente registrado
  const isFullyRegistered = calculateIsFullyRegistered(cleanData, isMainGuest);

  // Crear nuevo huésped
  const newGuest = await prisma.users.create({
    data: {
      identification_number: formattedIdNumber,
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
          travels_with_children: cleanData.travelsWithChildren,
          children_under_four: cleanData.childrenUnderFour,
          special_requests: cleanData.specialRequests,
          observations: cleanData.observations,
        },
      },
    },
    include: {
      guest_details: true,
    },
  });

  return {
    id: newGuest.id,
    identificationNumber: newGuest.identification_number,
    firstName: newGuest.first_name,
    paternalLastName: newGuest.paternal_last_name,
    maternalLastName: newGuest.maternal_last_name,
    email: newGuest.email,
    phoneNumber: newGuest.phone_number,
    birthDate: newGuest.birth_date,
    gender: newGuest.gender,
    country: newGuest.country,
    region: newGuest.region,
    city: newGuest.city,
    isFullyRegistered: newGuest.is_fully_registered,
    travelsWithChildren: newGuest.guest_details?.travels_with_children,
    childrenUnderFour: newGuest.guest_details?.children_under_four || 0,
    specialRequests: newGuest.guest_details?.special_requests,
    observations: newGuest.guest_details?.observations,
  };
}

/**
 * ✅ ACTUALIZAR huésped existente
 */
export async function updateGuest(guestId, guestData, isMainGuest = true) {
  // Limpiar datos
  const cleanData = sanitizeGuestData(guestData);

  // Calcular si está completamente registrado
  const isFullyRegistered = calculateIsFullyRegistered(cleanData, isMainGuest);

  // Actualizar huésped
  const updatedGuest = await prisma.users.update({
    where: { id: guestId },
    data: {
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
            travels_with_children: cleanData.travelsWithChildren,
            children_under_four: cleanData.childrenUnderFour,
            special_requests: cleanData.specialRequests,
            observations: cleanData.observations,
          },
          update: {
            travels_with_children: cleanData.travelsWithChildren,
            children_under_four: cleanData.childrenUnderFour,
            special_requests: cleanData.specialRequests,
            observations: cleanData.observations,
          },
        },
      },
    },
    include: {
      guest_details: true,
    },
  });

  return {
    id: updatedGuest.id,
    identificationNumber: updatedGuest.identification_number,
    firstName: updatedGuest.first_name,
    paternalLastName: updatedGuest.paternal_last_name,
    maternalLastName: updatedGuest.maternal_last_name,
    email: updatedGuest.email,
    phoneNumber: updatedGuest.phone_number,
    birthDate: updatedGuest.birth_date,
    gender: updatedGuest.gender,
    country: updatedGuest.country,
    region: updatedGuest.region,
    city: updatedGuest.city,
    isFullyRegistered: updatedGuest.is_fully_registered,
    travelsWithChildren: updatedGuest.guest_details?.travels_with_children,
    childrenUnderFour: updatedGuest.guest_details?.children_under_four || 0,
    specialRequests: updatedGuest.guest_details?.special_requests,
    observations: updatedGuest.guest_details?.observations,
  };
}

/**
 * ✅ Buscar todos los huéspedes con paginación y filtros
 */
export async function searchAllGuestsService(searchTerm = "", pagination = {}) {
  const { page = 1, limit = 20 } = pagination;
  const skip = (page - 1) * limit;

  // Construir filtros de búsqueda
  const whereClause = {
    deleted_at: null,
    user_roles: {
      some: {
        roles: {
          name: "guest",
        },
      },
    },
  };

  // Si hay término de búsqueda, buscar en múltiples campos
  if (searchTerm && searchTerm.trim() !== "") {
    const search = searchTerm.trim();
    whereClause.OR = [
      { identification_number: { contains: search, mode: "insensitive" } },
      { first_name: { contains: search, mode: "insensitive" } },
      { paternal_last_name: { contains: search, mode: "insensitive" } },
      { maternal_last_name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  // Query paralelo para data y count
  const [guests, total] = await Promise.all([
    prisma.users.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        identification_number: true,
        first_name: true,
        paternal_last_name: true,
        maternal_last_name: true,
        email: true,
        phone_number: true,
        status: true,
        created_at: true,
      },
    }),
    prisma.users.count({ where: whereClause }),
  ]);

  // Contar reservas de cada huésped
  const guestsWithReservations = await Promise.all(
    guests.map(async (guest) => {
      const reservationCount = await prisma.reservations.count({
        where: {
          main_guest_id: guest.id,
          deleted_at: null,
        },
      });

      return {
        id: guest.id,
        identificationNumber: guest.identification_number,
        fullName: `${guest.first_name} ${guest.paternal_last_name}${guest.maternal_last_name ? ` ${guest.maternal_last_name}` : ""
          }`,
        email: guest.email || "Sin email",
        phone: guest.phone_number || "Sin teléfono",
        status: guest.status,
        totalReservations: reservationCount,
        createdAt: guest.created_at,
      };
    })
  );

  return {
    data: guestsWithReservations,
    meta: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
      totalCount: total,
      hasPrevPage: page > 1,
      hasNextPage: page < Math.ceil(total / limit),
    },
  };
}

/**
 * ✅ Obtener perfil completo de huésped por ID
 */
export async function getGuestProfileById(guestId) {
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
    },
  });

  if (!guest) {
    throw new Error("Huésped no encontrado");
  }

  // Obtener estadísticas de reservas
  const [
    totalReservations,
    completedReservations,
    pendingReservations,
    inProgressReservations,
    canceledReservations,
    activeReservation,
  ] = await Promise.all([
    prisma.reservations.count({
      where: { main_guest_id: guestId, deleted_at: null },
    }),
    prisma.reservations.count({
      where: { main_guest_id: guestId, status: "completed", deleted_at: null },
    }),
    prisma.reservations.count({
      where: { main_guest_id: guestId, status: "pending", deleted_at: null },
    }),
    prisma.reservations.count({
      where: {
        main_guest_id: guestId,
        status: "in_progress",
        deleted_at: null,
      },
    }),
    prisma.reservations.count({
      where: { main_guest_id: guestId, status: "canceled", deleted_at: null },
    }),
    // Buscar reserva activa (confirmed o in_progress)
    prisma.reservations.findFirst({
      where: {
        main_guest_id: guestId,
        status: { in: ["confirmed", "in_progress"] },
        deleted_at: null,
      },
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
        reservation_guests: {
          include: {
            users: {
              select: {
                id: true,
                first_name: true,
                paternal_last_name: true,
                maternal_last_name: true,
                email: true,
                phone_number: true,
              },
            },
          },
        },
        payments: {
          where: { deleted_at: null },
          orderBy: { created_at: "desc" },
        },
      },
      orderBy: { check_in_date: "asc" },
    }),
  ]);

  // Calcular montos totales de reservas completadas
  const completedReservationsData = await prisma.reservations.findMany({
    where: {
      main_guest_id: guestId,
      status: "completed",
      deleted_at: null,
    },
    include: {
      payments: {
        where: {
          status: "confirmed",
          deleted_at: null,
        },
      },
    },
  });

  const completedPaidAmount = completedReservationsData.reduce((sum, res) => {
    const paidInReservation = res.payments.reduce(
      (s, p) => s + (p.amount || 0),
      0
    );
    return sum + paidInReservation;
  }, 0);

  // Calcular saldo pendiente de reservas activas
  let activePendingAmount = 0;
  if (activeReservation) {
    const paidAmount = activeReservation.payments
      .filter((p) => p.status === "confirmed")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    activePendingAmount = (activeReservation.total_amount || 0) - paidAmount;
  }

  // Formatear reserva activa si existe
  let formattedActiveReservation = null;
  if (activeReservation) {
    const paidAmount = activeReservation.payments
      .filter((p) => p.status === "confirmed")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    formattedActiveReservation = {
      id: activeReservation.id,
      code: activeReservation.code,
      status: activeReservation.status,
      checkInDate: activeReservation.check_in_date,
      checkOutDate: activeReservation.check_out_date,
      guestCount: activeReservation.guest_count,
      totalAmount: activeReservation.total_amount,
      paidAmount,
      pendingAmount: (activeReservation.total_amount || 0) - paidAmount,
      mainGuest: {
        name: `${guest.first_name} ${guest.paternal_last_name}${guest.maternal_last_name ? ` ${guest.maternal_last_name}` : ""
          }`,
        isMainGuest: true,
      },
      additionalGuests: activeReservation.reservation_guests.map((rg) => ({
        id: rg.users.id,
        name: `${rg.users.first_name} ${rg.users.paternal_last_name}${rg.users.maternal_last_name ? ` ${rg.users.maternal_last_name}` : ""
          }`,
        email: rg.users.email,
        phone: rg.users.phone_number,
        isCurrentGuest: rg.users.id === guestId,
      })),
      rooms: activeReservation.reservation_rooms.map((rr) => ({
        roomNumber: rr.rooms.room_number,
        roomType: rr.rooms.room_types.name,
        unitPrice: rr.unit_price,
        subtotal: rr.subtotal,
      })),
      services: activeReservation.reservation_services.map((rs) => ({
        name: rs.services.name,
        quantity: rs.quantity,
        unitPrice: rs.unit_price,
        subtotal: rs.subtotal,
      })),
      payments: activeReservation.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.payment_method,
        status: p.status,
        isDeposit: p.is_deposit,
        createdAt: p.created_at,
      })),
    };
  }

  return {
    id: guest.id,
    identificationNumber: guest.identification_number,
    firstName: guest.first_name,
    paternalLastName: guest.paternal_last_name,
    maternalLastName: guest.maternal_last_name,
    fullName: `${guest.first_name} ${guest.paternal_last_name}${guest.maternal_last_name ? ` ${guest.maternal_last_name}` : ""
      }`,
    email: guest.email,
    phone: guest.phone_number,
    birthDate: guest.birth_date,
    gender: guest.gender,
    nationality: guest.country,
    region: guest.region,
    city: guest.city,
    specialRequests: guest.guest_details?.special_requests,
    observations: guest.guest_details?.observations,
    status: guest.status,
    registrationDate: guest.created_at,
    stats: {
      totalReservations,
      completedReservations,
      pendingReservations,
      inProgressReservations,
      canceledReservations,
      completedPaidAmount,
      activePendingAmount,
    },
    activeReservation: formattedActiveReservation,
  };
}

/**
 * ✅ Obtener historial de reservas de un huésped
 */
export async function getGuestReservationsHistory(
  guestId,
  filters = {},
  pagination = {}
) {
  const { status, startDate, endDate } = filters;
  const { page = 1, limit = 10 } = pagination;
  const skip = (page - 1) * limit;

  // Construir filtros
  const whereClause = {
    main_guest_id: guestId,
    deleted_at: null,
  };

  if (status) {
    whereClause.status = status;
  }

  if (startDate) {
    whereClause.check_in_date = { gte: new Date(startDate) };
  }

  if (endDate) {
    whereClause.check_out_date = { lte: new Date(endDate) };
  }

  const [reservations, total] = await Promise.all([
    prisma.reservations.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { check_in_date: "desc" },
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
          where: { deleted_at: null },
        },
      },
    }),
    prisma.reservations.count({ where: whereClause }),
  ]);

  const formattedReservations = reservations.map((res) => ({
    id: res.id,
    code: res.code,
    status: res.status,
    checkInDate: res.check_in_date,
    checkOutDate: res.check_out_date,
    guestCount: res.guest_count,
    totalAmount: res.total_amount,
    paidAmount: res.paid_amount || 0,
    currentGuestRole: "principal", // Siempre principal en este caso
    rooms: res.reservation_rooms.map((rr) => ({
      roomNumber: rr.rooms.room_number,
      roomType: rr.rooms.room_types.name,
    })),
    services: res.reservation_services.map((rs) => ({
      name: rs.services.name,
      quantity: rs.quantity,
    })),
  }));

  return {
    data: formattedReservations,
    meta: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * ✅ Actualizar observaciones de huésped
 */
export async function updateGuestObservationsService(guestId, observations) {
  // Verificar que el huésped existe
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
    },
  });

  if (!guest) {
    return { found: false };
  }

  // Actualizar o crear guest_details
  if (guest.guest_details) {
    await prisma.guest_details.update({
      where: { user_id: guestId },
      data: { observations },
    });
  } else {
    await prisma.guest_details.create({
      data: {
        user_id: guestId,
        observations,
      },
    });
  }

  // Obtener datos actualizados
  const updatedGuest = await prisma.users.findUnique({
    where: { id: guestId },
    include: { guest_details: true },
  });

  return {
    found: true,
    guest: {
      id: updatedGuest.id,
      observations: updatedGuest.guest_details?.observations,
    },
  };
}

/**
 * ✅ Eliminar huésped (soft delete)
 */
export async function deleteGuestService(guestId) {
  // Verificar que el huésped existe
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
  });

  if (!guest) {
    return { found: false };
  }

  // Verificar si tiene reservas activas
  const activeReservations = await prisma.reservations.count({
    where: {
      main_guest_id: guestId,
      status: { in: ["pending", "confirmed", "in_progress"] },
      deleted_at: null,
    },
  });

  if (activeReservations > 0) {
    const error = new Error(
      "No se puede eliminar el huésped porque tiene reservas activas"
    );
    error.code = "HAS_ACTIVE_RESERVATIONS";
    throw error;
  }

  // Soft delete del huésped
  await prisma.users.update({
    where: { id: guestId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });

  return {
    found: true,
    deleted: true,
    message: "Huésped eliminado exitosamente",
  };
}

/**
 * ✅ Actualizar perfil completo de huésped
 */
export async function updateGuestProfileService(guestId, updateData) {
  // Verificar que el huésped existe
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
    },
  });

  if (!guest) {
    return { found: false };
  }

  // Construir objeto de actualización
  const userUpdateData = {};
  const guestDetailsUpdateData = {};

  // Campos de users
  if (updateData.firstName !== undefined)
    userUpdateData.first_name = updateData.firstName;
  if (updateData.paternalLastName !== undefined)
    userUpdateData.paternal_last_name = updateData.paternalLastName;
  if (updateData.maternalLastName !== undefined)
    userUpdateData.maternal_last_name = updateData.maternalLastName || null;
  if (updateData.identificationNumber !== undefined) {
    const { rut: rutBase, dv } = parseRut(updateData.identificationNumber);
    userUpdateData.identification_number = `${rutBase}-${dv}`;
  }
  if (updateData.email !== undefined)
    userUpdateData.email = updateData.email || null;
  if (updateData.phoneNumber !== undefined)
    userUpdateData.phone_number = updateData.phoneNumber || null;
  if (updateData.gender !== undefined)
    userUpdateData.gender = updateData.gender || null;
  if (updateData.birthDate !== undefined)
    userUpdateData.birth_date = updateData.birthDate
      ? new Date(updateData.birthDate)
      : null;
  if (updateData.nationality !== undefined)
    userUpdateData.country = updateData.nationality || null;
  if (updateData.country !== undefined)
    userUpdateData.country = updateData.country || null;
  if (updateData.region !== undefined)
    userUpdateData.region = updateData.region || null;
  if (updateData.city !== undefined)
    userUpdateData.city = updateData.city || null;
  if (updateData.status !== undefined)
    userUpdateData.status = updateData.status;

  // Campos de guest_details
  if (updateData.specialRequests !== undefined)
    guestDetailsUpdateData.special_requests =
      updateData.specialRequests || null;
  if (updateData.observations !== undefined)
    guestDetailsUpdateData.observations = updateData.observations || null;

  // Actualizar users
  if (Object.keys(userUpdateData).length > 0) {
    userUpdateData.updated_at = new Date();
    await prisma.users.update({
      where: { id: guestId },
      data: userUpdateData,
    });
  }

  // Actualizar o crear guest_details
  if (Object.keys(guestDetailsUpdateData).length > 0) {
    if (guest.guest_details) {
      await prisma.guest_details.update({
        where: { user_id: guestId },
        data: guestDetailsUpdateData,
      });
    } else {
      await prisma.guest_details.create({
        data: {
          user_id: guestId,
          ...guestDetailsUpdateData,
        },
      });
    }
  }

  // Obtener datos actualizados
  const updatedGuest = await prisma.users.findUnique({
    where: { id: guestId },
    include: { guest_details: true },
  });

  return {
    found: true,
    guest: {
      id: updatedGuest.id,
      identificationNumber: updatedGuest.identification_number,
      firstName: updatedGuest.first_name,
      paternalLastName: updatedGuest.paternal_last_name,
      maternalLastName: updatedGuest.maternal_last_name,
      email: updatedGuest.email,
      phoneNumber: updatedGuest.phone_number,
      gender: updatedGuest.gender,
      birthDate: updatedGuest.birth_date,
      nationality: updatedGuest.country,
      region: updatedGuest.region,
      city: updatedGuest.city,
      status: updatedGuest.status,
      specialRequests: updatedGuest.guest_details?.special_requests,
      observations: updatedGuest.guest_details?.observations,
    },
  };
}
