import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { toast } from "sonner";

import Step1SearchAvailability from "./reservation-steps/Step1SearchAvailability";
import Step2SelectRooms from "./reservation-steps/Step2SelectRooms";
import Step2_5GuestAssignment from "./reservation-steps/Step2_5GuestAssignment"; // ✅ NUEVO
import Step3AdditionalServices from "./reservation-steps/Step3AdditionalServices";
import Step4MainGuest from "./reservation-steps/Step4MainGuest";
import Step5AdditionalGuests from "./reservation-steps/Step5AdditionalGuests";
import Step6Summary from "./reservation-steps/Step6Summary";

import { reservationsService } from "@/services/reservations";

import { guestsService } from "@/services/guests";

const STEPS = [
  { id: 1, name: "Búsqueda", description: "Fechas y huéspedes" },
  { id: 2, name: "Habitaciones", description: "Selección" },
  { id: 3, name: "Asignar Huéspedes", description: "A habitaciones" }, // ✅ NUEVO Step 2.5
  { id: 4, name: "Servicios", description: "Adicionales" }, // ✅ Antes era step 3
  { id: 5, name: "Huésped Principal", description: "Datos" }, // ✅ Antes era step 4
  { id: 6, name: "Huéspedes", description: "Adicionales" }, // ✅ Antes era step 5
  { id: 7, name: "Resumen", description: "Confirmar" }, // ✅ Antes era step 6
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
    paymentType: "full", // Nuevo: tipo de pago (full, half_upfront, daily)
    isDeposit: false,
    multiplePayments: null, // Nuevo: para pagos mixtos
  });

  const updateStepData = (stepData) => {
    setReservationData((prev) => ({ ...prev, ...stepData }));

    const criticalFieldsByStep = {
      1: ['checkInDate', 'checkOutDate', 'guests'], // Step 1: Búsqueda
      2: ['selectedRooms', 'availableRooms'], // Step 2: Habitaciones
      3: ['roomGuestAssignments'], // Step 3: Asignar Huéspedes a Habitaciones
      4: ['roomServiceAssignments'], // Step 4: Servicios por Habitación
      5: ['mainGuest'], // Step 5: Huésped Principal
      6: ['additionalGuests'], // Step 6: Huéspedes Adicionales
      7: ['paymentMethod', 'paymentAmount'], // Step 7: Resumen
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
        // Si cambian habitaciones, limpiar desde step 3 (asignación de huéspedes)
        setReservationData(prev => ({
          ...prev,
          ...stepData,
          roomGuestAssignments: [],
          roomServiceAssignments: [],
          selectedServices: [],
          mainGuest: null,
          additionalGuests: [],
          pricing: null,
          paymentMethod: "",
          paymentAmount: 0,
          isDeposit: false,
        }));
      } else if (modifiedStep === 3) {
        // Si cambia asignación de huéspedes a habitaciones, limpiar desde step 4 (servicios)
        setReservationData(prev => ({
          ...prev,
          ...stepData,
          roomServiceAssignments: [],
          selectedServices: [],
          mainGuest: null,
          additionalGuests: [],
          pricing: null,
          paymentMethod: "",
          paymentAmount: 0,
          isDeposit: false,
        }));
      } else if (modifiedStep === 4) {
        // Si cambian servicios, limpiar desde step 5 (huésped principal)
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
      } else if (modifiedStep === 5) {
        // Si cambia huésped principal, limpiar desde step 6 (huéspedes adicionales)
        setReservationData(prev => ({
          ...prev,
          ...stepData,
          additionalGuests: [],
          pricing: null,
          paymentMethod: "",
          paymentAmount: 0,
          isDeposit: false,
        }));
      } else if (modifiedStep === 6) {
        // Si cambian huéspedes adicionales, limpiar solo step 7 (resumen/pago)
        setReservationData(prev => ({
          ...prev,
          ...stepData,
          pricing: null,
          paymentMethod: "",
          paymentAmount: 0,
          isDeposit: false,
        }));
      } else {
        // ✅ Para Step 7 (resumen) o cualquier otro, solo actualizar sin limpiar
        setReservationData(prev => ({
          ...prev,
          ...stepData,
        }));
      }
    } else {
      // ✅ Si no se detecta cambio en steps críticos, solo actualizar
      setReservationData(prev => ({
        ...prev,
        ...stepData,
      }));
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
      case 3: // ✅ NUEVO: Step 2.5 - Asignar huéspedes
        return reservationData.roomGuestAssignments && reservationData.roomGuestAssignments.length > 0;
      case 4: // ✅ Servicios son opcionales
        return true;
      case 5: // ✅ Huésped principal
        return reservationData.mainGuest !== null;
      case 6: // ✅ Huéspedes adicionales son opcionales
        return true;
      case 7: // ✅ Resumen y pago
        return (
          reservationData.paymentMethod && reservationData.paymentAmount > 0
        );
      default:
        return false;
    }
  };

  const handleCreateReservation = async (paymentData = {}) => {
    try {
      // ✅ VALIDACIÓN: Verificar que hay datos de huéspedes
      if (!reservationData.mainGuest) {
        toast.error('Error: No hay datos del huésped principal');
        console.error('❌ reservationData.mainGuest es null/undefined');
        return;
      }

      if (!reservationData.roomGuestAssignments || reservationData.roomGuestAssignments.length === 0) {
        toast.error('Error: No hay asignaciones de huéspedes a habitaciones');
        console.error('❌ reservationData.roomGuestAssignments está vacío');
        return;
      }

      // PASO 1: Obtener/Crear huésped principal
      let mainGuestId;

      if (reservationData.mainGuest.id) {
        // ✅ El huésped YA EXISTE
        mainGuestId = reservationData.mainGuest.id;
      } else {
        // ✅ El huésped NO EXISTE, crear uno nuevo
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
        } catch (createError) {
          // ✅ Si da 409, significa que ya existe
          if (createError.response?.status === 409) {
            const existingGuest = createError.response?.data?.guest;
            if (existingGuest && existingGuest.id) {
              mainGuestId = existingGuest.id;
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
        } else {
          // ✅ El huésped NO EXISTE, crear uno nuevo
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
          } catch (createError) {
            // ✅ Si da 409, usar el ID del existente
            if (createError.response?.status === 409) {
              const existingGuest = createError.response?.data?.guest;
              if (existingGuest && existingGuest.id) {
                additionalGuestIds.push(existingGuest.id);
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

      // PASO 3: Construir roomGuestAssignments y mapear IDs temporales
      // ✅ USAR ASIGNACIONES MANUALES DEL STEP 6 (no automáticas)
      const rawRoomGuestAssignments = reservationData.roomGuestAssignments || [];

      if (rawRoomGuestAssignments.length === 0) {
        throw new Error("No se han asignado huéspedes a las habitaciones");
      }

      // ✅ FIX CRÍTICO: Mapear IDs temporales a IDs reales
      // Crear mapa: ID temporal → ID real
      const guestIdMap = {
        'guest-1': mainGuestId, // Main guest siempre es guest-1
      };

      // Mapear huéspedes adicionales (siempre usar IDs temporales como clave)
      reservationData.additionalGuests.forEach((guestData, index) => {
        const temporalId = `guest-${index + 2}`; // guest-2, guest-3, etc.
        const realId = additionalGuestIds[index];
        guestIdMap[temporalId] = realId;
      });

      // Mapear asignaciones
      const roomGuestAssignments = rawRoomGuestAssignments.map(assignment => {
        const mappedGuestIds = assignment.guestIds.map(guestId => {
          const realId = guestIdMap[guestId];
          if (!realId || typeof realId !== 'number') {
            console.error(`❌ No se pudo mapear ID "${guestId}" a ID real`);
            console.error(`Mapa disponible:`, guestIdMap);
            throw new Error(`ID de huésped inválido: ${guestId}`);
          }
          return realId;
        });

        return {
          roomId: assignment.roomId,
          guestIds: mappedGuestIds,
        };
      });

      // PASO 4: Construir roomServiceAssignments
      // ✅ USAR ASIGNACIONES MANUALES DEL STEP 6 (no automáticas)
      const rawRoomServiceAssignments = reservationData.roomServiceAssignments || [];

      // ✅ FIX CRÍTICO: Filtrar servicios sin fechas (dates vacío causa error en backend)
      const roomServiceAssignments = rawRoomServiceAssignments.filter(rsa => {
        if (!rsa.dates || rsa.dates.length === 0) {
          console.warn(`⚠️ Servicio ID ${rsa.serviceId} en habitación ${rsa.roomId} no tiene fechas, se omitirá`);
          return false;
        }
        return true;
      });

      // Nota: roomServiceAssignments puede estar vacío si no se seleccionaron servicios
      // o si el usuario no asignó ningún servicio a habitaciones (es opcional)

      // PASO 5: Crear reserva con nuevo modelo
      // ✅ FILTRAR: Solo enviar habitaciones que tienen huéspedes asignados
      const roomIdsWithGuests = roomGuestAssignments.map(rga => rga.roomId);

      // ✅ Usar datos de pago del parámetro si están disponibles, sino de reservationData
      const payload = {
        mainGuestId: mainGuestId,
        additionalGuestIds: additionalGuestIds,
        roomIds: roomIdsWithGuests, // ← Solo habitaciones con huéspedes
        roomGuestAssignments: roomGuestAssignments,
        roomServiceAssignments: roomServiceAssignments,
        checkInDate: reservationData.checkInDate,
        checkOutDate: reservationData.checkOutDate,
        guestCount: reservationData.guests,
        channel: paymentData.channel || reservationData.channel || 'reception',
        paymentMethod: paymentData.paymentMethod || reservationData.paymentMethod,
        paymentAmount: paymentData.paymentAmount || reservationData.paymentAmount,
        paymentType: paymentData.paymentType || reservationData.paymentType || 'full',
        multiplePayments: paymentData.multiplePayments || reservationData.multiplePayments,
      };

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
            {/* TabsContent requeridos por Radix UI para ARIA validity */}
            <TabsContent value="individual" className="hidden" />
            <TabsContent value="corporate" className="hidden" />
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

              // ✅ Mostrar check verde si el step actual puede proceder
              const showCheckmark = isCompleted || (isCurrent && canProceed());

              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => goToStep(step.id)}
                      disabled={isLocked}
                      className="flex items-center justify-center mb-2 disabled:cursor-not-allowed"
                      aria-label={`${isLocked ? 'Paso bloqueado' : isCurrent ? 'Paso actual' : 'Ir al paso'}: ${step.name}`}
                    >
                      {showCheckmark ? (
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
                              ? "text-muted-foreground"
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
            <Step2_5GuestAssignment
              data={reservationData}
              onUpdate={updateStepData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {currentStep === 4 && (
            <Step3AdditionalServices
              data={reservationData}
              onUpdate={updateStepData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {currentStep === 5 && (
            <Step4MainGuest
              data={reservationData}
              onUpdate={updateStepData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {currentStep === 6 && (
            <Step5AdditionalGuests
              data={reservationData}
              onUpdate={updateStepData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {currentStep === 7 && (
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
