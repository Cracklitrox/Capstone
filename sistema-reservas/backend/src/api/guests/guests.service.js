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

  const { rut: rutBase, dv } = parseRut(identificationNumber);
  const formattedIdNumber = `${rutBase}-${dv}`;

  // ✅ CONVERTIR STRINGS VACÍOS A NULL
  const cleanData = {
    identificationNumber: formattedIdNumber,
    firstName,
    paternalLastName,
    maternalLastName:
      maternalLastName && maternalLastName.trim() !== ""
        ? maternalLastName
        : null,
    email: email && email.trim() !== "" ? email : null,
    phoneNumber: phoneNumber && phoneNumber.trim() !== "" ? phoneNumber : null,
    birthDate: birthDate && birthDate.trim() !== "" ? birthDate : null,
    gender: gender && gender.trim() !== "" ? gender : null,
    country: country && country.trim() !== "" ? country : "Chile", // Default a Chile
    region: region && region.trim() !== "" ? region : null,
    city: city && city.trim() !== "" ? city : null,
    travelsWithChildren,
    childrenUnderFour,
    specialRequests:
      specialRequests && specialRequests.trim() !== "" ? specialRequests : null,
    observations:
      observations && observations.trim() !== "" ? observations : null,
  };

  // ✅ CALCULAR is_fully_registered DINÁMICAMENTE
  let isFullyRegistered;

  if (isMainGuest) {
    // Huésped principal: TODOS los campos obligatorios
    const allRequiredFields = [
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
    isFullyRegistered = allRequiredFields.every(
      (field) => cleanData[field] && cleanData[field].trim() !== ""
    );
  } else {
    // Huésped adicional: SOLO 3 campos obligatorios
    const minRequiredFields = [
      "identificationNumber",
      "firstName",
      "paternalLastName",
    ];
    isFullyRegistered = minRequiredFields.every(
      (field) => cleanData[field] && cleanData[field].trim() !== ""
    );
  }

  if (isUpdate && guestId) {
    // Actualizar huésped existente
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
      identification_number: cleanData.identificationNumber,
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

module.exports = {
  searchGuestByIdentification,
  createOrUpdateGuest,
};
