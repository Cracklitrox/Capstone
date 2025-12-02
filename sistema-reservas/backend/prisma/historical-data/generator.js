import { faker } from '@faker-js/faker';
import {
    randomDateBetween,
    addDays,
    calculateNights,
    calculateTotal,
    generateValidRut,
    randomElement,
    randomSample,
    randomInt,
    generateReservationCode
} from './helpers.js';

export async function generateYearlyData(prisma, year, targetReservations) {
    console.log(`\n🚀 Iniciando generación para el año ${year}...`);
    console.log(`📊 Meta: ${targetReservations} reservas`);

    // 1. Obtener datos base
    const rooms = await prisma.rooms.findMany({ where: { is_active: true } });
    const services = await prisma.services.findMany({ where: { is_active: true } });
    const receptionists = await prisma.users.findMany({
        where: {
            user_roles: { some: { roles: { name: 'receptionist' } } }
        }
    });

    // Obtener rol de guest
    const guestRole = await prisma.roles.findUnique({ where: { name: 'guest' } });
    if (!guestRole) throw new Error("Rol 'guest' no encontrado");

    // 2. Crear pool de nuevos huéspedes para este año (para dar variedad)
    // Creamos unos 50 huéspedes nuevos por año para mezclar con los existentes
    console.log("👥 Creando huéspedes nuevos para este año...");
    const newGuests = [];
    const password = "$2a$10$X7V.j5.j5.j5.j5.j5.j5.j5.j5.j5.j5.j5.j5.j5.j5.j5"; // hash dummy

    for (let i = 0; i < 50; i++) {
        const rut = generateValidRut();
        // Verificar si existe
        const existing = await prisma.users.findUnique({ where: { identification_number: rut } });
        if (existing) continue;

        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();

        const guest = await prisma.users.create({
            data: {
                identification_number: rut,
                first_name: firstName,
                paternal_last_name: lastName,
                maternal_last_name: faker.person.lastName(),
                email: faker.internet.email({ firstName, lastName }).toLowerCase(),
                phone_number: `+569${faker.string.numeric(8)}`,
                birth_date: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }),
                gender: faker.helpers.arrayElement(['male', 'female', 'other']),
                country: "Chile",
                region: faker.helpers.arrayElement(["Metropolitana", "Valparaíso", "Biobío", "Araucanía"]),
                city: faker.location.city(),
                password_hash: password,
                status: "active",
                is_fully_registered: true,
                user_roles: { create: { role_id: guestRole.id } }
            }
        });
        newGuests.push(guest);
    }

    // Obtener también huéspedes existentes para mezclar
    const existingGuests = await prisma.users.findMany({
        where: {
            user_roles: { some: { roles: { name: 'guest' } } },
            is_fully_registered: true
        },
        take: 100
    });

    const allGuests = [...existingGuests, ...newGuests];
    console.log(`✅ Pool de huéspedes: ${allGuests.length} usuarios`);

    // 3. Generar Reservas
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);

    let createdCount = 0;

    for (let i = 0; i < targetReservations; i++) {
        // a) Fechas
        const checkIn = randomDateBetween(startDate, endDate);
        const nights = randomInt(1, 7); // 1 a 7 noches
        const checkOut = addDays(checkIn, nights);

        // Validar que checkOut no pase al año siguiente (opcional, pero ordenado)
        if (checkOut.getFullYear() > year) continue;

        // b) Habitación(es)
        // 80% 1 habitación, 20% 2 habitaciones
        const numRooms = Math.random() > 0.8 ? 2 : 1;
        const selectedRooms = randomSample(rooms, numRooms);

        // c) Huésped Principal
        const mainGuest = randomElement(allGuests);

        // d) Huéspedes adicionales
        // Calculamos capacidad total
        const totalCapacity = selectedRooms.reduce((sum, r) => sum + r.capacity, 0);
        // Ocupación aleatoria entre 1 y capacidad total
        const guestCount = randomInt(1, totalCapacity);

        // e) Servicios
        // 60% de probabilidad de tener servicios
        const includeServices = Math.random() > 0.4;
        const selectedServices = includeServices ? randomSample(services, randomInt(1, 3)) : [];

        // f) Calcular Totales
        const pricing = calculateTotal(
            selectedRooms[0], // Simplificación: precio base x habitaciones (ajustar si son diferentes tipos)
            nights,
            selectedServices,
            guestCount
        );

        // Ajuste precio habitaciones si son múltiples
        let roomsSubtotal = 0;
        const reservationRoomsData = selectedRooms.map(room => {
            const sub = room.base_price * nights;
            roomsSubtotal += sub;
            return {
                room_id: room.id,
                start_date: checkIn,
                end_date: checkOut,
                unit_price: room.base_price,
                subtotal: sub
            };
        });

        const finalTotal = roomsSubtotal + pricing.servicesTotal;

        // g) Crear Reserva
        // Generar código único
        let code = generateReservationCode(year);
        // Pequeño check por si acaso (aunque la probabilidad es baja)
        // En script masivo mejor confiar en la aleatoriedad o manejar el error unique constraint

        try {
            await prisma.reservations.create({
                data: {
                    code,
                    main_guest_id: mainGuest.id,
                    receptionist_id: randomElement(receptionists).id,
                    channel: randomElement(['reception', 'web', 'chatbot', 'in_person']),
                    status: 'completed',
                    check_in_date: checkIn,
                    check_out_date: checkOut,
                    guest_count: guestCount,
                    total_amount: finalTotal,
                    paid_amount: finalTotal,
                    created_at: checkIn,
                    updated_at: checkOut,

                    reservation_rooms: {
                        create: reservationRoomsData
                    },

                    reservation_services: selectedServices.length > 0 ? {
                        create: pricing.servicesBreakdown.map(s => ({
                            service_id: s.service.id,
                            quantity: s.quantity,
                            unit_price: s.unitPrice,
                            subtotal: s.subtotal
                        }))
                    } : undefined,

                    payments: {
                        create: {
                            amount: finalTotal,
                            payment_method: randomElement(['cash', 'credit_card', 'debit_card', 'bank_transfer']),
                            payment_type: 'full',
                            status: 'confirmed',
                            is_deposit: false,
                            payment_sequence: 1,
                            created_at: checkIn
                        }
                    },

                    // Crear huéspedes adicionales ficticios (sin usuario real) en reservation_guests si es necesario
                    // O usar usuarios existentes. Para simplificar y no llenar la tabla users de basura,
                    // usaremos usuarios existentes del pool como "acompañantes" si hay más de 1 huésped.
                    reservation_guests: guestCount > 1 ? {
                        create: randomSample(allGuests.filter(g => g.id !== mainGuest.id), Math.min(guestCount - 1, 3))
                            .map(g => ({ guest_id: g.id }))
                    } : undefined
                }
            });
            createdCount++;
            if (createdCount % 50 === 0) process.stdout.write('.');
        } catch (error) {
            // Ignorar errores de duplicados y continuar
            // console.error(error);
        }
    }

    console.log(`\n✅ Año ${year} completado: ${createdCount} reservas creadas.`);
}
