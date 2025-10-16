import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { toast } from "sonner";

import Step1SearchAvailability from "./reservation-steps/Step1SearchAvailability";
import Step2SelectRooms from "./reservation-steps/Step2SelectRooms";
import Step3AdditionalServices from "./reservation-steps/Step3AdditionalServices";
import Step4MainGuest from "./reservation-steps/Step4MainGuest";
import Step5AdditionalGuests from "./reservation-steps/Step5AdditionalGuests";
import Step6Summary from "./reservation-steps/Step6Summary";

import { reservationsService } from "@/services/reservations";

import { guestsService } from "@/services/guests";

const STEPS = [
  { id: 1, name: "Búsqueda", description: "Fechas y huéspedes" },
  { id: 2, name: "Habitaciones", description: "Selección" },
  { id: 3, name: "Servicios", description: "Adicionales" },
  { id: 4, name: "Huésped Principal", description: "Datos" },
  { id: 5, name: "Huéspedes", description: "Adicionales" },
  { id: 6, name: "Resumen", description: "Confirmar" },
];

const ReservationStepper = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [bookingType, setBookingType] = useState("individual");

  const [reservationData, setReservationData] = useState({
    checkInDate: "",
    checkOutDate: "",
    guests: 1,
    filters: {},
    selectedRooms: [],
    availableRooms: [],
    activeSeason: null,
    selectedServices: [],
    mainGuest: null,
    additionalGuests: [],
    pricing: null,
    paymentMethod: "",
    paymentAmount: 0,
    isDeposit: false,
  });

  const updateStepData = (stepData) => {
    setReservationData((prev) => ({ ...prev, ...stepData }));
    
    const criticalFieldsByStep = {
      1: ['checkInDate', 'checkOutDate', 'guests'], // Step 1: Búsqueda
      2: ['selectedRooms', 'availableRooms'], // Step 2: Habitaciones
      3: ['selectedServices'], // Step 3: Servicios
      4: ['mainGuest'], // Step 4: Huésped Principal
      5: ['additionalGuests'], // Step 5: Huéspedes Adicionales
      6: ['paymentMethod', 'paymentAmount'], // Step 6: Resumen
    };

    // Detectar qué step se está modificando
    let modifiedStep = null;
    for (const [step, fields] of Object.entries(criticalFieldsByStep)) {
      if (fields.some(field => Object.prototype.hasOwnProperty.call(stepData, field))) {
        modifiedStep = parseInt(step);
        break;
      }
    }

    // Si se modifica un step anterior al actual, limpiar progreso posterior
    if (modifiedStep && modifiedStep < currentStep) {
      // Limpiar completedSteps posteriores
      setCompletedSteps(prev => prev.filter(step => step < modifiedStep));
      
      // Limpiar datos posteriores según el step modificado
      if (modifiedStep === 1) {
        // Si cambian fechas/guests, limpiar TODO desde step 2
        setReservationData(prev => ({
          ...prev,
          ...stepData,
          selectedRooms: [],
          availableRooms: [],
          activeSeason: null,
          selectedServices: [],
          mainGuest: null,
          additionalGuests: [],
          pricing: null,
          paymentMethod: "",
          paymentAmount: 0,
          isDeposit: false,
        }));
      } else if (modifiedStep === 2) {
        // Si cambian habitaciones, limpiar desde step 3
        setReservationData(prev => ({
          ...prev,
          ...stepData,
          selectedServices: [],
          mainGuest: null,
          additionalGuests: [],
          pricing: null,
          paymentMethod: "",
          paymentAmount: 0,
          isDeposit: false,
        }));
      } else if (modifiedStep === 3) {
        // Si cambian servicios, limpiar desde step 4
        setReservationData(prev => ({
          ...prev,
          ...stepData,
          mainGuest: null,
          additionalGuests: [],
          pricing: null,
          paymentMethod: "",
          paymentAmount: 0,
          isDeposit: false,
        }));
      } else if (modifiedStep === 4) {
        // Si cambia huésped principal, limpiar desde step 5
        setReservationData(prev => ({
          ...prev,
          ...stepData,
          additionalGuests: [],
          pricing: null,
          paymentMethod: "",
          paymentAmount: 0,
          isDeposit: false,
        }));
      } else if (modifiedStep === 5) {
        // Si cambian huéspedes adicionales, limpiar solo step 6
        setReservationData(prev => ({
          ...prev,
          ...stepData,
          pricing: null,
          paymentMethod: "",
          paymentAmount: 0,
          isDeposit: false,
        }));
      }
    }
  };

  // NUEVO: Marcar step como completado
  const markStepCompleted = (stepNumber) => {
    if (!completedSteps.includes(stepNumber)) {
      setCompletedSteps((prev) => [...prev, stepNumber]);
    }
  };

  // NUEVO: Validar si se puede acceder a un step
  const canAccessStep = (stepNumber) => {
    // Siempre puedes ir al step 1
    if (stepNumber === 1) return true;

    // Para otros steps, debes haber completado el anterior
    return completedSteps.includes(stepNumber - 1);
  };

  const goToStep = (stepNumber) => {
    if (stepNumber >= 1 && stepNumber <= STEPS.length) {
      if (canAccessStep(stepNumber)) {
        setCurrentStep(stepNumber);
      } else {
        toast.error("Debes completar el paso anterior primero");
      }
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      markStepCompleted(currentStep);
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
        return (
          reservationData.checkInDate &&
          reservationData.checkOutDate &&
          reservationData.guests > 0
        );
      case 2:
        return reservationData.selectedRooms.length > 0;
      case 3:
        return true; // Servicios son opcionales
      case 4:
        return reservationData.mainGuest !== null;
      case 5:
        return true; // Huéspedes adicionales son opcionales
      case 6:
        return (
          reservationData.paymentMethod && reservationData.paymentAmount > 0
        );
      default:
        return false;
    }
  };

  const handleCreateReservation = async () => {
    try {
      // PASO 1: Obtener/Crear huésped principal
      let mainGuestId;

      if (reservationData.mainGuest.id) {
        // ✅ El huésped YA EXISTE
        mainGuestId = reservationData.mainGuest.id;
        console.log("✅ Usando huésped existente ID:", mainGuestId);
      } else {
        // ✅ El huésped NO EXISTE, crear uno nuevo
        console.log("➕ Creando nuevo huésped principal...");
        try {
          const mainGuestPayload = {
            ...reservationData.mainGuest,
            isMainGuest: true,
          };
          const response = await guestsService.createGuest(mainGuestPayload);
          
          // ✅ FIX CRÍTICO: Acceder a response.data (Axios envuelve la respuesta)
          const guestData = response.data?.guest || response.guest || response;
          mainGuestId = guestData.id;
          
          if (!mainGuestId) {
            console.error("❌ Respuesta completa del backend:", response);
            throw new Error("No se pudo obtener el ID del huésped principal creado");
          }
          
          console.log("✅ Huésped principal creado con ID:", mainGuestId);
        } catch (createError) {
          // ✅ Si da 409, significa que ya existe
          if (createError.response?.status === 409) {
            const existingGuest = createError.response?.data?.guest;
            if (existingGuest && existingGuest.id) {
              mainGuestId = existingGuest.id;
              console.log("⚠️ Huésped ya existía, usando ID:", mainGuestId);
            } else {
              throw new Error("No se pudo determinar el ID del huésped existente");
            }
          } else {
            throw createError;
          }
        }
      }

      // PASO 2: Obtener/Crear huéspedes adicionales
      const additionalGuestIds = [];
      
      for (const guestData of reservationData.additionalGuests) {
        if (guestData.id) {
          // ✅ El huésped YA EXISTE
          additionalGuestIds.push(guestData.id);
          console.log("✅ Usando huésped adicional existente ID:", guestData.id);
        } else {
          // ✅ El huésped NO EXISTE, crear uno nuevo
          console.log("➕ Creando huésped adicional...");
          try {
            const payload = {
              ...guestData,
              isMainGuest: false,
            };
            const response = await guestsService.createGuest(payload);
            
            // ✅ FIX CRÍTICO: Acceder a response.data (Axios envuelve la respuesta)
            const newGuestData = response.data?.guest || response.guest || response;
            const newGuestId = newGuestData.id;
            
            if (!newGuestId) {
              console.error("❌ Respuesta completa del backend:", response);
              throw new Error("No se pudo obtener el ID del huésped adicional creado");
            }
            
            additionalGuestIds.push(newGuestId);
            console.log("✅ Huésped adicional creado con ID:", newGuestId);
          } catch (createError) {
            // ✅ Si da 409, usar el ID del existente
            if (createError.response?.status === 409) {
              const existingGuest = createError.response?.data?.guest;
              if (existingGuest && existingGuest.id) {
                additionalGuestIds.push(existingGuest.id);
                console.log("⚠️ Huésped adicional ya existía, usando ID:", existingGuest.id);
              } else {
                throw new Error("No se pudo determinar el ID del huésped adicional existente");
              }
            } else {
              throw createError;
            }
          }
        }
      }

      // ✅ VALIDACIÓN CRÍTICA: Verificar que no haya IDs nulos
      if (additionalGuestIds.some(id => id === null || id === undefined)) {
        console.error("❌ IDs de huéspedes adicionales:", additionalGuestIds);
        throw new Error("Algunos huéspedes adicionales no tienen ID válido");
      }

      // PASO 3: Crear reserva
      const payload = {
        mainGuestId: mainGuestId,
        additionalGuestIds: additionalGuestIds,
        roomIds: reservationData.selectedRooms.map((r) => r.id),
        services: reservationData.selectedServices.map((s) => ({
          serviceId: s.id,
          quantity: s.quantity,
          customPrice: s.customPrice,
        })),
        checkInDate: reservationData.checkInDate,
        checkOutDate: reservationData.checkOutDate,
        guestCount: reservationData.guests,
        channel: reservationData.channel,
        paymentMethod: reservationData.paymentMethod,
        paymentAmount: reservationData.paymentAmount,
        isDeposit: reservationData.isDeposit,
        multiplePayments: reservationData.multiplePayments,
      };

      console.log("📝 Creando reserva con payload:", payload);

      const result = await reservationsService.createReservation(payload);

      toast.success("Reserva creada exitosamente", {
        description: `Código: ${result.reservation.code}`,
      });

      navigate("/");
    } catch (error) {
      console.error("❌ Error al crear reserva:", error);
      toast.error("Error al crear reserva", {
        description: error.response?.data?.message || error.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con tabs */}
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

      {/* Stepper Progress - MEJORADO */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = step.id === currentStep;
              const isLocked =
                !canAccessStep(step.id) && !isCurrent && !isCompleted;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => goToStep(step.id)}
                      disabled={isLocked}
                      className="flex items-center justify-center mb-2 disabled:cursor-not-allowed"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                      ) : isCurrent ? (
                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          {step.id}
                        </div>
                      ) : isLocked ? (
                        <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                          <Lock className="h-5 w-5" />
                        </div>
                      ) : (
                        <Circle className="h-8 w-8 text-muted-foreground" />
                      )}
                    </button>
                    <div className="text-center">
                      <p
                        className={`text-sm font-medium ${
                          isCurrent
                            ? "text-foreground"
                            : isLocked
                              ? "text-muted-foreground/50"
                              : "text-muted-foreground"
                        }`}
                      >
                        {step.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        isCompleted ? "bg-green-500" : "bg-border"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
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
    </div>
  );
};

export default ReservationStepper;
