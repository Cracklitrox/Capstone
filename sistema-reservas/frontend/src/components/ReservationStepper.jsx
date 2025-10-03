import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';

// Importaremos los steps después
import Step1SearchAvailability from './reservation-steps/Step1SearchAvailability';
import Step2SelectRooms from './reservation-steps/Step2SelectRooms';
import Step3AdditionalServices from './reservation-steps/Step3AdditionalServices';
import Step4MainGuest from './reservation-steps/Step4MainGuest';
import Step5AdditionalGuests from './reservation-steps/Step5AdditionalGuests';
import Step6Summary from './reservation-steps/Step6Summary';

import { reservationsService } from '@/services/reservations';

const STEPS = [
  { id: 1, name: 'Búsqueda', description: 'Fechas y huéspedes' },
  { id: 2, name: 'Habitaciones', description: 'Selección' },
  { id: 3, name: 'Servicios', description: 'Adicionales' },
  { id: 4, name: 'Huésped Principal', description: 'Datos' },
  { id: 5, name: 'Huéspedes', description: 'Adicionales' },
  { id: 6, name: 'Resumen', description: 'Confirmar' },
];

const ReservationStepper = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingType, setBookingType] = useState('individual'); // 'individual' o 'corporate'

  // Estado global de la reserva
  const [reservationData, setReservationData] = useState({
    // Step 1
    checkInDate: '',
    checkOutDate: '',
    guests: 1,
    filters: {},
    
    // Step 2
    selectedRooms: [],
    availableRooms: [],
    activeSeason: null,
    
    // Step 3
    selectedServices: [],
    
    // Step 4
    mainGuest: null,
    
    // Step 5
    additionalGuests: [],
    
    // Step 6
    pricing: null,
    paymentMethod: '',
    paymentAmount: 0,
    isDeposit: false,
  });

  // Actualizar datos de un step específico
  const updateStepData = (stepData) => {
    setReservationData(prev => ({ ...prev, ...stepData }));
  };

  // Navegar entre steps
  const goToStep = (stepNumber) => {
    if (stepNumber >= 1 && stepNumber <= STEPS.length) {
      setCurrentStep(stepNumber);
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Validar si se puede avanzar al siguiente paso
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return reservationData.checkInDate && 
               reservationData.checkOutDate && 
               reservationData.guests > 0;
      case 2:
        return reservationData.selectedRooms.length > 0;
      case 3:
        return true; // Servicios son opcionales
      case 4:
        return reservationData.mainGuest !== null;
      case 5:
        return true; // Huéspedes adicionales son opcionales
      case 6:
        return reservationData.paymentMethod && reservationData.paymentAmount > 0;
      default:
        return false;
    }
  };

  // Crear la reserva
  const handleCreateReservation = async () => {
    try {
      const payload = {
        mainGuestId: reservationData.mainGuest.id,
        additionalGuestIds: reservationData.additionalGuests.map(g => g.id),
        roomIds: reservationData.selectedRooms.map(r => r.id),
        services: reservationData.selectedServices.map(s => ({
          serviceId: s.id,
          quantity: s.quantity,
        })),
        checkInDate: reservationData.checkInDate,
        checkOutDate: reservationData.checkOutDate,
        guestCount: reservationData.guests,
        channel: 'reception',
        paymentMethod: reservationData.paymentMethod,
        paymentAmount: reservationData.paymentAmount,
        isDeposit: reservationData.isDeposit,
      };

      const result = await reservationsService.createReservation(payload);

      toast.success('Reserva creada exitosamente', {
        description: `Código: ${result.reservation.code}`,
      });

      // Redirigir al dashboard o a la vista de reservas
      navigate('/');
    } catch (error) {
      console.error('Error al crear reserva:', error);
      toast.error('Error al crear reserva', {
        description: error.response?.data?.message || error.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con tabs para Individual/Grupo */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={bookingType} onValueChange={setBookingType}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual">Persona/Familia</TabsTrigger>
              <TabsTrigger value="corporate" disabled>
                Grupo/Empresa (Próximamente)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Stepper Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => goToStep(step.id)}
                    disabled={step.id > currentStep + 1}
                    className="flex items-center justify-center mb-2"
                  >
                    {step.id < currentStep ? (
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    ) : step.id === currentStep ? (
                      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {step.id}
                      </div>
                    ) : (
                      <Circle className="h-8 w-8 text-muted-foreground" />
                    )}
                  </button>
                  <div className="text-center">
                    <p className={`text-sm font-medium ${
                      step.id === currentStep ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    step.id < currentStep ? 'bg-green-500' : 'bg-border'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contenido del Step Actual */}
      <Card>
        <CardContent className="pt-6">
          {currentStep === 1 && (
            <Step1SearchAvailability
              data={reservationData}
              onUpdate={updateStepData}
              onNext={nextStep}
            />
          )}
          {currentStep === 2 && (
            <Step2SelectRooms
              data={reservationData}
              onUpdate={updateStepData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {currentStep === 3 && (
            <Step3AdditionalServices
              data={reservationData}
              onUpdate={updateStepData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {currentStep === 4 && (
            <Step4MainGuest
              data={reservationData}
              onUpdate={updateStepData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {currentStep === 5 && (
            <Step5AdditionalGuests
              data={reservationData}
              onUpdate={updateStepData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {currentStep === 6 && (
            <Step6Summary
              data={reservationData}
              onUpdate={updateStepData}
              onBack={prevStep}
              onCreate={handleCreateReservation}
            />
          )}
        </CardContent>
      </Card>

      {/* Botones de Navegación (Opcional - cada step puede tener los suyos) */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          Volver
        </Button>
        
        {currentStep < STEPS.length && (
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
          >
            Continuar
          </Button>
        )}
      </div>
    </div>
  );
};

export default ReservationStepper;