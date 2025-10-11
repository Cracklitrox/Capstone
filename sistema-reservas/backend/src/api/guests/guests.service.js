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
const sanitizeGuestData = (data) => {
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
const calculateIsFullyRegistered = (cleanData, isMainGuest) => {
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
async function searchGuestByIdentification(identificationNumber) {
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
async function createGuest(guestData, isMainGuest = true) {
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
async function updateGuest(guestId, guestData, isMainGuest = true) {
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

module.exports = {
  searchGuestByIdentification,
  createGuest,
  updateGuest,
};
