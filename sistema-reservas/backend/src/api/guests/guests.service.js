const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Buscar huésped por número de identificación
 */
async function searchGuestByIdentification(identificationNumber) {
  // Buscar SOLO usuarios con rol 'guest'
  const guest = await prisma.users.findFirst({
    where: {
      identification_number: identificationNumber,
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

  if (isUpdate && guestId) {
    // Actualizar huésped existente
    const updatedGuest = await prisma.users.update({
      where: { id: guestId },
      data: {
        first_name: firstName,
        paternal_last_name: paternalLastName,
        maternal_last_name: maternalLastName,
        email,
        phone_number: phoneNumber,
        birth_date: birthDate ? new Date(birthDate) : null,
        gender,
        country,
        region,
        city,
        guest_details: {
          upsert: {
            create: {
              travels_with_children: travelsWithChildren || false,
              children_under_four: childrenUnderFour || 0,
              special_requests: specialRequests,
              observations,
            },
            update: {
              travels_with_children: travelsWithChildren || false,
              children_under_four: childrenUnderFour || 0,
              special_requests: specialRequests,
              observations,
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
      identification_number: identificationNumber,
      first_name: firstName,
      paternal_last_name: paternalLastName,
      maternal_last_name: maternalLastName,
      email,
      phone_number: phoneNumber,
      birth_date: birthDate ? new Date(birthDate) : null,
      gender,
      country: country || "Chile",
      region,
      city,
      password_hash: "GUEST_NO_PASSWORD", // Los huéspedes no tienen login
      status: "active",
      is_fully_registered: true,
      user_roles: {
        create: {
          roles: {
            connect: { name: "guest" },
          },
        },
      },
      guest_details: {
        create: {
          travels_with_children: travelsWithChildren || false,
          children_under_four: childrenUnderFour || 0,
          special_requests: specialRequests,
          observations,
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
