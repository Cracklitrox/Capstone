import React from "react";
import RoomBoard from "../components/RoomBoard";

function Dashboard() {
  // Aquí podrías obtener los datos reales del backend en el futuro, como alertas o KPIS
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Estado Habitaciones</h2>
      <RoomBoard onNewReservation={() => alert("Función de nueva reserva (placeholder)")} />
    </div>
  );
}

export default Dashboard;
