import React from 'react';
import ReservationStepper from '@/components/reservations/ReservationStepper';

const NewReservation = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Nueva Reserva</h1>
        <p className="text-muted-foreground mt-2">
          Complete los siguientes pasos para crear una nueva reserva
        </p>
      </div>
      
      <ReservationStepper />
    </div>
  );
};

export default NewReservation;