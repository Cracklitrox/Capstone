import React from "react";


// Mapeo de estados del backend (en inglés) a clases de color
const statusBorderColors = {
  available: "border-l-8 border-green-400 bg-green-50",
  occupied: "border-l-8 border-red-400 bg-red-50",
  cleaning: "border-l-8 border-blue-400 bg-blue-50",
  maintenance: "border-l-8 border-gray-700 bg-gray-300", // Fondo más oscuro para mantenimiento
  pending: "border-l-8 border-orange-400 bg-orange-50",
};

/**
 * Tarjeta visual de habitación.
 * Solo muestra número, tipo y piso. No muestra info dinámica (huésped, fechas, etc).
 * El contenido se actualizará cuando se integre el CRUD.
 */

function RoomCard({ room, onDetails }) {
  const normalizedStatus = (room.status || "").toLowerCase();
  const borderColor = statusBorderColors[normalizedStatus] || "border-l-8 border-gray-200 bg-white";
  const typeName = room.type || "";

  // Solo mostrar "Disponible ahora" si el estado es available
  const isAvailable = normalizedStatus === "available";

  // Título dinámico según estado y clases de color
  let stateTitle = null;
  if (isAvailable) {
    stateTitle = "Disponible ahora";
  } else if (normalizedStatus === "occupied") {
    stateTitle = "Ocupada";
  } else if (normalizedStatus === "cleaning") {
    stateTitle = "En limpieza";
  } else if (normalizedStatus === "maintenance") {
    stateTitle = "En mantenimiento";
  } else if (normalizedStatus === "reserved") {
    stateTitle = "Reservada";
  }

  // Mostrar datos de reserva si está ocupada y el backend ya entrega reservation
  let guestName = null;
  let dateRange = null;
  if (normalizedStatus === "occupied" && room.reservation && room.reservation.guest) {
    const guest = room.reservation.guest;
    guestName = `${guest.first_name || ''} ${guest.paternal_last_name || ''}`.trim();
    // Fechas formato corto (ej: 20-21 Oct)
    const checkIn = room.reservation.check_in_date ? new Date(room.reservation.check_in_date) : null;
    const checkOut = room.reservation.check_out_date ? new Date(room.reservation.check_out_date) : null;
    if (checkIn && checkOut) {
      const dayIn = checkIn.getDate();
      const dayOut = checkOut.getDate();
      const month = checkIn.toLocaleString('es-ES', { month: 'short' });
      dateRange = `${dayIn}-${dayOut} ${month.charAt(0).toUpperCase() + month.slice(1)}`;
    }
  }

  return (
    <div
      className={`cursor-pointer border rounded-lg p-4 min-w-[180px] min-h-[110px] shadow-sm flex flex-col justify-between ${borderColor}`}
      onClick={() => onDetails?.(room)}
      tabIndex={0}
      role="button"
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onDetails?.(room); }}
      title="Ver detalles de la habitación"
    >
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="font-bold text-lg">{room.number} - {typeName}</span>
          <span className="text-xs text-gray-500">Piso {room.floor}</span>
        </div>
        {/* Mostrar datos de reserva si está ocupada */}
        {!isAvailable && normalizedStatus === "occupied" && guestName && dateRange && (
          <>
            <div className="flex items-center gap-1 text-sm text-gray-700 mt-1">
              <span role="img" aria-label="user">👤</span> {guestName}
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-700">
              <span role="img" aria-label="calendar">📅</span> {dateRange}
            </div>
          </>
        )}
      </div>
      {/* Título de estado sutil abajo */}
      {stateTitle && (
        <div
          className={`mt-2 text-sm font-medium text-left
            ${isAvailable ? 'text-green-700' : ''}
            ${normalizedStatus === 'occupied' ? 'text-red-700' : ''}
            ${normalizedStatus === 'cleaning' ? 'text-blue-700' : ''}
            ${normalizedStatus === 'maintenance' ? 'text-gray-700' : ''}
            ${normalizedStatus === 'reserved' ? 'text-orange-700' : ''}
          `}
        >
          {stateTitle}
        </div>
      )}
    </div>
  );
}

export default RoomCard;
