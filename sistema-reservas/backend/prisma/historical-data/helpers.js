import { faker } from '@faker-js/faker';

// ==========================================
// DATE HELPERS
// ==========================================

export function randomDateBetween(start, end) {
    const startMs = start.getTime();
    const endMs = end.getTime();
    const randomMs = startMs + Math.random() * (endMs - startMs);
    const date = new Date(randomMs);
    date.setHours(14, 0, 0, 0); // Check-in default: 14:00
    return date;
}

export function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    result.setHours(11, 0, 0, 0); // Check-out default: 11:00
    return result;
}

// ==========================================
// PRICING HELPERS
// ==========================================

export function calculateNights(checkIn, checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

export function calculateServiceQuantity(service, nights, guestCount) {
    switch (service.unit) {
        case 'per_night':
            return nights;
        case 'per_person':
            return guestCount * nights; // Asumiendo que es por persona por noche si es desayuno, etc.
        // NOTA: En el sistema original, 'per_person' a veces es solo por estadía o por noche dependiendo de la lógica de negocio.
        // Para simplificar y ser consistentes con pricing.service.js:
        // "quantity ya viene multiplicada por (huéspedes × noches) desde el frontend"
        // Así que aquí devolvemos el multiplicador base.
        case 'per_room':
            return 1;
        case 'per_unit':
            return faker.number.int({ min: 1, max: 3 });
        default:
            return 1;
    }
}

export function calculateTotal(room, nights, services = [], guestCount) {
    const roomTotal = room.base_price * nights;

    let servicesTotal = 0;
    const servicesBreakdown = [];

    for (const service of services) {
        const quantity = calculateServiceQuantity(service, nights, guestCount);
        const subtotal = service.price * quantity;
        servicesTotal += subtotal;

        servicesBreakdown.push({
            service,
            quantity,
            unitPrice: service.price,
            subtotal
        });
    }

    return {
        roomTotal,
        servicesTotal,
        total: roomTotal + servicesTotal,
        servicesBreakdown
    };
}

// ==========================================
// RUT / ID HELPERS
// ==========================================

export function calculateDv(rut) {
    let suma = 0;
    let multiplicador = 2;

    // Recorrer el RUT de derecha a izquierda
    for (let i = rut.length - 1; i >= 0; i--) {
        suma += parseInt(rut.charAt(i)) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }

    const resto = suma % 11;
    const dv = 11 - resto;

    if (dv === 11) return '0';
    if (dv === 10) return 'K';
    return dv.toString();
}

export function generateValidRut() {
    const rutBase = faker.number.int({ min: 5000000, max: 25000000 }).toString();
    const dv = calculateDv(rutBase);
    return `${rutBase}-${dv}`;
}

// ==========================================
// RANDOM HELPERS
// ==========================================

export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

export function randomSample(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

export function generateReservationCode(year) {
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `RES-${year}-${random}`;
}
