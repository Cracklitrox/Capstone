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
 * Obtener perfil completo del huésped con información financiera y huéspedes adicionales
 */
async function getGuestProfileById(guestId) {
  try {
    // Obtener información básica del huésped
    const guest = await prisma.users.findUnique({
      where: { 
        id: parseInt(guestId),
        deleted_at: null 
      },
      include: {
        guest_details: true,
        user_roles: {
          include: {
            roles: true
          }
        }
      }
    });

    if (!guest) {
      throw new Error('Huésped no encontrado');
    }

    // Verificar que es un huésped
    const isGuest = guest.user_roles.some(ur => ur.roles.name === 'guest');
    if (!isGuest) {
      throw new Error('Usuario no es un huésped');
    }

    // Obtener reserva activa (si existe)
    const activeReservation = await prisma.reservations.findFirst({
      where: {
        OR: [
          { main_guest_id: parseInt(guestId) },
          { 
            reservation_guests: {
              some: { guest_id: parseInt(guestId) }
            }
          }
        ],
        status: {
          in: ['confirmed', 'in_progress', 'pending']
        },
        deleted_at: null
      },
      include: {
        reservation_rooms: {
          include: {
            rooms: {
              include: {
                room_types: true
              }
            }
          }
        },
        reservation_services: {
          include: {
            services: true
          }
        },
        reservation_guests: {
          include: {
            users: {
              select: {
                id: true,
                first_name: true,
                paternal_last_name: true,
                maternal_last_name: true,
                identification_number: true,
                email: true,
                phone_number: true,
                country: true,
                gender: true,
                birth_date: true,
                created_at: true
              }
            }
          }
        },
        users_reservations_main_guest_idTousers: {
          select: {
            id: true,
            first_name: true,
            paternal_last_name: true,
            maternal_last_name: true,
            identification_number: true
          }
        },
        payments: true
      }
    });

    // Obtener estadísticas completas de reservas
    const allReservations = await prisma.reservations.findMany({
      where: {
        OR: [
          { main_guest_id: parseInt(guestId) },
          { 
            reservation_guests: {
              some: { guest_id: parseInt(guestId) }
            }
          }
        ],
        deleted_at: null
      },
      include: {
        payments: true,
        reservation_rooms: {
          include: {
            rooms: {
              include: {
                room_types: true
              }
            }
          }
        },
        reservation_services: {
          include: {
            services: true
          }
        }
      }
    });

    // Calcular estadísticas financieras separadas por estado
    const completedReservations = allReservations.filter(r => r.status === 'completed');
    const activeReservations = allReservations.filter(r => ['confirmed', 'in_progress', 'pending'].includes(r.status));
    const canceledReservations = allReservations.filter(r => r.status === 'canceled');

    // Estadísticas de reservas completadas
    const completedStats = completedReservations.reduce((acc, reservation) => {
      const totalAmount = reservation.total_amount || 0;
      // Para reservas completadas, si paid_amount es 0 o null, asumir que se pagó todo
      const paidAmount = reservation.status === 'completed' 
        ? (reservation.paid_amount || totalAmount)
        : (reservation.paid_amount || 0);

      acc.totalReservationAmount += totalAmount;
      acc.totalPaidAmount += paidAmount;
      
      return acc;
    }, {
      totalReservationAmount: 0,
      totalPaidAmount: 0
    });

    // Estadísticas de reservas activas/pendientes
    const activeStats = activeReservations.reduce((acc, reservation) => {
      const totalAmount = reservation.total_amount || 0;
      const paidAmount = reservation.paid_amount || 0;
      const pendingAmount = totalAmount - paidAmount;

      acc.totalReservationAmount += totalAmount;
      acc.totalPaidAmount += paidAmount;
      acc.totalPendingAmount += pendingAmount;
      
      return acc;
    }, {
      totalReservationAmount: 0,
      totalPaidAmount: 0,
      totalPendingAmount: 0
    });

    // Estadísticas financieras totales (para compatibilidad)
    const financialStats = {
      totalReservationAmount: completedStats.totalReservationAmount + activeStats.totalReservationAmount,
      totalPaidAmount: completedStats.totalPaidAmount + activeStats.totalPaidAmount,
      totalPendingAmount: activeStats.totalPendingAmount
    };
    
    // Verificar si viaja con niños basado en reservas históricas
    const travelsWithChildren = allReservations.some(reservation => {
      return reservation.reservation_rooms.some(room => room.children_count > 0);
    });

    const profile = {
      id: guest.id,
      firstName: guest.first_name,
      lastName: guest.paternal_last_name + (guest.maternal_last_name ? ` ${guest.maternal_last_name}` : ''),
      paternalLastName: guest.paternal_last_name,
      maternalLastName: guest.maternal_last_name,
      fullName: `${guest.first_name} ${guest.paternal_last_name}${guest.maternal_last_name ? ` ${guest.maternal_last_name}` : ''}`,
      email: guest.email,
      phone: guest.phone_number,
      identificationNumber: guest.identification_number,
      nationality: guest.country,
      region: guest.region,
      city: guest.city,
      gender: guest.gender || 'Sin datos',
      birthDate: guest.birth_date,
      registrationDate: guest.created_at,
      travelsWithChildren: travelsWithChildren,
      specialRequests: guest.guest_details?.special_requests || 'Sin datos',
      observations: guest.guest_details?.observations || 'Sin datos',
      status: guest.deleted_at ? 'inactive' : 'active',
      stats: {
        totalReservations: allReservations.length,
        completedReservations: completedReservations.length,
        pendingReservations: activeReservations.filter(r => r.status === 'pending').length,
        inProgressReservations: activeReservations.filter(r => ['confirmed', 'in_progress'].includes(r.status)).length,
        canceledReservations: canceledReservations.length,
        totalSpent: financialStats.totalPaidAmount,
        totalReservationAmount: financialStats.totalReservationAmount,
        totalPaidAmount: financialStats.totalPaidAmount,
        totalPendingAmount: financialStats.totalPendingAmount,
        // Estadísticas de reservas completadas
        completedReservationAmount: completedStats.totalReservationAmount,
        completedPaidAmount: completedStats.totalPaidAmount,
        // Estadísticas de reservas activas/pendientes
        activeReservationAmount: activeStats.totalReservationAmount,
        activePaidAmount: activeStats.totalPaidAmount,
        activePendingAmount: activeStats.totalPendingAmount
      },
      activeReservation: activeReservation ? {
        id: activeReservation.id,
        code: activeReservation.code,
        status: activeReservation.status,
        checkInDate: activeReservation.check_in_date,
        checkOutDate: activeReservation.check_out_date,
        guestCount: activeReservation.guest_count,
        totalAmount: activeReservation.total_amount,
        paidAmount: activeReservation.paid_amount,
        pendingAmount: (activeReservation.total_amount || 0) - (activeReservation.paid_amount || 0),
        mainGuest: {
          id: activeReservation.users_reservations_main_guest_idTousers.id,
          name: `${activeReservation.users_reservations_main_guest_idTousers.first_name} ${activeReservation.users_reservations_main_guest_idTousers.paternal_last_name}${activeReservation.users_reservations_main_guest_idTousers.maternal_last_name ? ` ${activeReservation.users_reservations_main_guest_idTousers.maternal_last_name}` : ''}`,
          isMainGuest: activeReservation.main_guest_id === parseInt(guestId)
        },
        additionalGuests: activeReservation.reservation_guests
          .filter(rg => rg.guest_id !== activeReservation.main_guest_id)
          .map(rg => ({
            id: rg.users.id,
            name: `${rg.users.first_name} ${rg.users.paternal_last_name}${rg.users.maternal_last_name ? ` ${rg.users.maternal_last_name}` : ''}`,
            firstName: rg.users.first_name,
            paternalLastName: rg.users.paternal_last_name,
            maternalLastName: rg.users.maternal_last_name,
            email: rg.users.email || 'Sin datos',
            phone: rg.users.phone_number || 'Sin datos',
            identificationNumber: rg.users.identification_number || 'Sin datos',
            nationality: rg.users.country || 'Sin datos',
            gender: rg.users.gender || 'Sin datos',
            birthDate: rg.users.birth_date,
            registrationDate: rg.users.created_at,
            isCurrentGuest: rg.guest_id === parseInt(guestId)
          })),
        rooms: activeReservation.reservation_rooms.map(rr => ({
          roomNumber: rr.rooms.room_number,
          roomType: rr.rooms.room_types.name,
          unitPrice: rr.unit_price,
          subtotal: rr.subtotal
        })),
        services: activeReservation.reservation_services.map(rs => ({
          name: rs.services.name,
          quantity: rs.quantity,
          unitPrice: rs.unit_price,
          subtotal: rs.subtotal
        })),
        payments: activeReservation.payments.map(p => ({
          id: p.id,
          amount: p.amount,
          method: p.payment_method,
          status: p.status,
          isDeposit: p.is_deposit,
          createdAt: p.created_at
        }))
      } : null
    };

    return profile;
  } catch (error) {
    console.error('Error al obtener perfil del huésped:', error);
    throw error;
  }
}

/**
 * Obtener historial de reservas de huésped con filtros y paginación mejorado
 */
async function getGuestReservationsHistory(guestId, filters = {}, pagination = {}) {
  const { page = 1, limit = 10 } = pagination;
  const offset = (page - 1) * limit;

  // Valores válidos del enum de status
  const validStatuses = ['pending', 'confirmed', 'in_progress', 'canceled', 'completed', 'no_show'];

  // Construir filtros dinámicos - buscar tanto como huésped principal como adicional
  const whereConditions = {
    OR: [
      { main_guest_id: parseInt(guestId) },
      { 
        reservation_guests: {
          some: { guest_id: parseInt(guestId) }
        }
      }
    ],
    deleted_at: null,
  };

  // Solo agregar filtro de status si es válido
  if (filters.status && validStatuses.includes(filters.status)) {
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
            users: {
              select: {
                id: true,
                first_name: true,
                paternal_last_name: true,
                maternal_last_name: true,
                identification_number: true,
                email: true,
                phone_number: true
              }
            },
          },
          where: {
            deleted_at: null,
          },
        },
        users_reservations_main_guest_idTousers: {
          select: {
            id: true,
            first_name: true,
            paternal_last_name: true,
            maternal_last_name: true,
            identification_number: true
          }
        }
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

  // Formatear datos de respuesta con información financiera completa
  const formattedReservations = reservations.map(reservation => {
    const totalAmount = reservation.total_amount || 0;
    const paidAmount = reservation.paid_amount || 0;
    const pendingAmount = totalAmount - paidAmount;

    // Identificar el rol del huésped actual en esta reserva
    const isMainGuest = reservation.main_guest_id === parseInt(guestId);
    const additionalGuestInfo = reservation.reservation_guests.find(rg => rg.guest_id === parseInt(guestId));

    return {
      id: reservation.id,
      code: reservation.code,
      status: reservation.status,
      channel: reservation.channel,
      checkInDate: reservation.check_in_date,
      checkOutDate: reservation.check_out_date,
      guestCount: reservation.guest_count,
      totalAmount: totalAmount,
      paidAmount: paidAmount,
      pendingAmount: pendingAmount,
      currentGuestRole: isMainGuest ? 'principal' : 'adicional',
      mainGuest: {
        id: reservation.users_reservations_main_guest_idTousers.id,
        name: `${reservation.users_reservations_main_guest_idTousers.first_name} ${reservation.users_reservations_main_guest_idTousers.paternal_last_name}${reservation.users_reservations_main_guest_idTousers.maternal_last_name ? ` ${reservation.users_reservations_main_guest_idTousers.maternal_last_name}` : ''}`,
        identificationNumber: reservation.users_reservations_main_guest_idTousers.identification_number
      },
      additionalGuests: reservation.reservation_guests
        .filter(rg => rg.guest_id !== reservation.main_guest_id)
        .map(rg => ({
          id: rg.users.id,
          name: `${rg.users.first_name} ${rg.users.paternal_last_name}${rg.users.maternal_last_name ? ` ${rg.users.maternal_last_name}` : ''}`,
          identificationNumber: rg.users.identification_number,
          email: rg.users.email,
          phone: rg.users.phone_number,
          isCurrentGuest: rg.guest_id === parseInt(guestId)
        })),
      allGuests: [
        {
          id: reservation.users_reservations_main_guest_idTousers.id,
          name: `${reservation.users_reservations_main_guest_idTousers.first_name} ${reservation.users_reservations_main_guest_idTousers.paternal_last_name}${reservation.users_reservations_main_guest_idTousers.maternal_last_name ? ` ${reservation.users_reservations_main_guest_idTousers.maternal_last_name}` : ''}`,
          identificationNumber: reservation.users_reservations_main_guest_idTousers.identification_number,
          role: 'principal',
          isCurrentGuest: reservation.main_guest_id === parseInt(guestId)
        },
        ...reservation.reservation_guests
          .filter(rg => rg.guest_id !== reservation.main_guest_id)
          .map(rg => ({
            id: rg.users.id,
            name: `${rg.users.first_name} ${rg.users.paternal_last_name}${rg.users.maternal_last_name ? ` ${rg.users.maternal_last_name}` : ''}`,
            identificationNumber: rg.users.identification_number,
            role: 'adicional',
            isCurrentGuest: rg.guest_id === parseInt(guestId)
          }))
      ],
      rooms: reservation.reservation_rooms.map(room => ({
        id: room.id,
        roomNumber: room.rooms.room_number,
        roomType: room.rooms.room_types.name,
        unitPrice: room.unit_price,
        subtotal: room.subtotal,
        startDate: room.start_date,
        endDate: room.end_date
      })),
      services: reservation.reservation_services.map(service => ({
        id: service.id,
        name: service.services.name,
        quantity: service.quantity,
        unitPrice: service.unit_price,
        subtotal: service.subtotal,
        specificDates: service.specific_dates,
        dailyRate: service.daily_rate
      })),
      payments: reservation.payments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        method: payment.payment_method,
        status: payment.status,
        isDeposit: payment.is_deposit,
        sequence: payment.payment_sequence,
        transactionId: payment.transaction_id,
        createdAt: payment.created_at,
        notes: payment.notes
      })),
      createdAt: reservation.created_at
    };
  });

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
        },
      },
      {
        first_name: {
          contains: searchTerm,
        },
      },
      {
        paternal_last_name: {
          contains: searchTerm,
        },
      },
      {
        maternal_last_name: {
          contains: searchTerm,
        },
      },
      {
        email: {
          contains: searchTerm,
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

/**
 * Actualizar observaciones de huésped
 */
async function updateGuestObservationsService(guestId, observations) {
  // Verificar que el huésped existe
  const existingGuest = await prisma.users.findFirst({
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

  if (!existingGuest) {
    return { found: false };
  }

  // Actualizar o crear guest_details
  let updatedGuestDetails;
  if (existingGuest.guest_details) {
    // Actualizar observaciones existentes
    updatedGuestDetails = await prisma.guest_details.update({
      where: {
        user_id: guestId,
      },
      data: {
        observations: observations || null,
      },
    });
  } else {
    // Crear guest_details si no existe
    updatedGuestDetails = await prisma.guest_details.create({
      data: {
        user_id: guestId,
        observations: observations || null,
        travels_with_children: false,
        children_under_four: 0,
      },
    });
  }

  return {
    found: true,
    guest: {
      id: existingGuest.id,
      observations: updatedGuestDetails.observations,
    },
  };
}

/**
 * Actualizar perfil completo de huésped
 * Permite actualizar múltiples campos del perfil con validaciones
 */
async function updateGuestProfileService(guestId, updateData) {
  try {
    // Verificar que el huésped existe
    const existingGuest = await prisma.users.findUnique({
      where: { 
        id: guestId,
        deleted_at: null 
      },
      include: {
        guest_details: true,
        user_roles: {
          include: {
            roles: true
          }
        }
      }
    });

    if (!existingGuest) {
      return { found: false };
    }

    // Verificar que es un huésped
    const isGuest = existingGuest.user_roles.some(ur => ur.roles.name === 'guest');
    if (!isGuest) {
      throw new Error('Usuario no es un huésped');
    }

    // Preparar datos de actualización para la tabla users
    const userUpdateData = {};
    
    // Campos de datos personales
    if (updateData.firstName !== undefined) {
      userUpdateData.first_name = updateData.firstName.trim();
    }
    if (updateData.paternalLastName !== undefined) {
      userUpdateData.paternal_last_name = updateData.paternalLastName.trim();
    }
    if (updateData.maternalLastName !== undefined) {
      userUpdateData.maternal_last_name = updateData.maternalLastName?.trim() || null;
    }
    if (updateData.identificationNumber !== undefined) {
      userUpdateData.identification_number = updateData.identificationNumber.trim();
    }
    if (updateData.email !== undefined) {
      userUpdateData.email = updateData.email?.trim() || null;
    }
    if (updateData.phoneNumber !== undefined) {
      userUpdateData.phone_number = updateData.phoneNumber?.trim() || null;
    }
    if (updateData.gender !== undefined) {
      userUpdateData.gender = updateData.gender || null;
    }
    if (updateData.birthDate !== undefined) {
      userUpdateData.birth_date = updateData.birthDate ? new Date(updateData.birthDate) : null;
    }
    
    // Campos de ubicación
    if (updateData.country !== undefined) {
      userUpdateData.country = updateData.country?.trim() || null;
    }
    if (updateData.region !== undefined) {
      userUpdateData.region = updateData.region?.trim() || null;
    }
    if (updateData.city !== undefined) {
      userUpdateData.city = updateData.city?.trim() || null;
    }

    // Campos de sistema
    if (updateData.status !== undefined) {
      userUpdateData.status = updateData.status;
    }
    if (updateData.registrationDate !== undefined) {
      userUpdateData.created_at = updateData.registrationDate ? new Date(updateData.registrationDate) : null;
    }

    // Preparar datos de actualización para guest_details
    const guestDetailsUpdateData = {};
    
    if (updateData.specialRequests !== undefined) {
      guestDetailsUpdateData.special_requests = updateData.specialRequests?.trim() || null;
    }
    if (updateData.observations !== undefined) {
      guestDetailsUpdateData.observations = updateData.observations?.trim() || null;
    }
    if (updateData.travelsWithChildren !== undefined) {
      guestDetailsUpdateData.travels_with_children = updateData.travelsWithChildren;
    }

    // Iniciar transacción para actualizar ambas tablas
    const result = await prisma.$transaction(async (prisma) => {
      // Actualizar tabla users si hay datos
      if (Object.keys(userUpdateData).length > 0) {
        await prisma.users.update({
          where: { id: guestId },
          data: userUpdateData
        });
      }

      // Actualizar o crear guest_details si hay datos
      if (Object.keys(guestDetailsUpdateData).length > 0) {
        if (existingGuest.guest_details) {
          // Actualizar detalles existentes
          await prisma.guest_details.update({
            where: { user_id: guestId },
            data: guestDetailsUpdateData
          });
        } else {
          // Crear nuevos detalles
          await prisma.guest_details.create({
            data: {
              user_id: guestId,
              ...guestDetailsUpdateData
            }
          });
        }
      }

      // Obtener el huésped actualizado
      return await prisma.users.findUnique({
        where: { id: guestId },
        include: {
          guest_details: true,
          user_roles: {
            include: {
              roles: true
            }
          }
        }
      });
    });

    // Formatear respuesta
    const formattedGuest = {
      id: result.id,
      firstName: result.first_name,
      paternalLastName: result.paternal_last_name,
      maternalLastName: result.maternal_last_name,
      fullName: `${result.first_name} ${result.paternal_last_name}${result.maternal_last_name ? ` ${result.maternal_last_name}` : ''}`,
      email: result.email,
      phone: result.phone_number,
      identificationNumber: result.identification_number,
      nationality: result.country,
      region: result.region,
      city: result.city,
      gender: result.gender,
      birthDate: result.birth_date,
      registrationDate: result.created_at,
      status: result.status,
      specialRequests: result.guest_details?.special_requests,
      observations: result.guest_details?.observations,
      travelsWithChildren: result.guest_details?.travels_with_children || false
    };

    return {
      found: true,
      guest: formattedGuest
    };

  } catch (error) {
    console.error('Error al actualizar perfil de huésped:', error);
    throw error;
  }
}

module.exports = {
  searchGuestByIdentification,
  createOrUpdateGuest,
  getGuestProfileById,
  getGuestReservationsHistory,
  searchAllGuestsService,
  updateGuestObservationsService,
  updateGuestProfileService,
};
