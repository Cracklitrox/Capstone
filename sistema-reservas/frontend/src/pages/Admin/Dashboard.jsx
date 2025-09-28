import React from "react";
import RoomBoard from "../../components/RoomBoard.jsx";

const ReceptionistDashboard = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">
        Estado de Habitaciones
      </h1>
      <RoomBoard />
    </div>
  );
};

export default ReceptionistDashboard;