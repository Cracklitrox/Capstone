const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Buscar huésped por RUT
 */
async function searchGuestByRut(rut, rutDv) {
  const guest = await prisma.users.findFirst({
    where: {
      rut: rut,
      rut_dv: rutDv,
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
      rut: `${guest.rut}-${guest.rut_dv}`,
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
      commune: guest.commune,
      travelsWithChildren: guest.guest_details?.travels_with_children,
      specialRequests: guest.guest_details?.special_requests,
      observations: guest.guest_details?.observations,
    },
  };
}

/**
 * Crear o actualizar huésped
 */
async function createOrUpdateGuest(guestData, isUpdate = false, guestId = null) {
  const {
    rut,
    rutDv,
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
    commune,
    travelsWithChildren,
    specialRequests,
    observations,
    nationality,
  } = guestData;

  // Para huéspedes no chilenos, usar email como identificador único
  const uniqueIdentifier = nationality === 'chileno' 
    ? { rut, rut_dv: rutDv }
    : { email };

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
        commune,
        guest_details: {
          upsert: {
            create: {
              travels_with_children: travelsWithChildren || false,
              special_requests: specialRequests,
              observations,
            },
            update: {
              travels_with_children: travelsWithChildren || false,
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
      rut: rut || email.substring(0, 8), // Para extranjeros, usar parte del email
      rut_dv: rutDv || '0',
      first_name: firstName,
      paternal_last_name: paternalLastName,
      maternal_last_name: maternalLastName,
      email,
      phone_number: phoneNumber,
      birth_date: birthDate ? new Date(birthDate) : null,
      gender,
      country: country || 'Chile',
      region,
      city,
      commune,
      password_hash: 'GUEST_NO_PASSWORD', // Los huéspedes no tienen login
      status: 'active',
      user_roles: {
        create: {
          roles: {
            connect: { name: 'guest' },
          },
        },
      },
      guest_details: {
        create: {
          travels_with_children: travelsWithChildren || false,
          special_requests: specialRequests,
          observations,
        },
      },
    },
  });

  return newGuest;
}

module.exports = {
  searchGuestByRut,
  createOrUpdateGuest,
};