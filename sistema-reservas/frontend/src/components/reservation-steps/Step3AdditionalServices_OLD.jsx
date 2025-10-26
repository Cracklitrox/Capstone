import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Separator } from "@/components/ui/Separator";
import {
  CheckCircle2,
  Plus,
  Minus,
  DollarSign,
  Calendar,
  Utensils,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { reservationsService } from "@/services/reservations";

const Step3AdditionalServices = ({ data, onUpdate, onNext, onBack }) => {
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState(
    data.selectedServices || []
  );
  const [loading, setLoading] = useState(true);

  // NUEVO: Estados para menú de desayunos dinámico
  const [breakfastMenuOpen, setBreakfastMenuOpen] = useState(false);
  const [breakfastMenu, setBreakfastMenu] = useState({});
  const [selectedBreakfastItems, setSelectedBreakfastItems] = useState(
    data.breakfastPreferences || []
  );
  const [loadingMenu, setLoadingMenu] = useState(false);

  const { guests, checkInDate, checkOutDate } = data;

  useEffect(() => {
    loadServices();
  }, []);

  // NUEVO: Cargar menú cuando se expande
  useEffect(() => {
    if (breakfastMenuOpen && Object.keys(breakfastMenu).length === 0) {
      loadBreakfastMenu();
    }
  }, [breakfastMenuOpen]);

  const loadServices = async () => {
    try {
      const result = await reservationsService.getAvailableServices();
      setServices(result);
    } catch (error) {
      console.error("Error al cargar servicios:", error);
      toast.error("Error al cargar servicios");
    } finally {
      setLoading(false);
    }
  };

  // NUEVO: Cargar menú de desayunos desde BD
  const loadBreakfastMenu = async () => {
    try {
      setLoadingMenu(true);
      const menu = await reservationsService.getBreakfastMenu();
      setBreakfastMenu(menu);
    } catch (error) {
      console.error("Error al cargar menú de desayunos:", error);
      toast.error("Error al cargar menú de desayunos");
    } finally {
      setLoadingMenu(false);
    }
  };

  const calculateNights = () => {
    if (checkInDate && checkOutDate) {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      const diffTime = Math.abs(end - start);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
  };

  const nights = calculateNights();

  const toggleService = (service) => {
    const existing = selectedServices.find((s) => s.id === service.id);

    if (existing) {
      setSelectedServices(selectedServices.filter((s) => s.id !== service.id));

      // Si es desayuno y se desmarca, cerrar el menú
      if (service.name === "Desayuno") {
        setBreakfastMenuOpen(false);
        setSelectedBreakfastItems([]);
      }
    } else {
      let initialQuantity = 1;
      let customPrice = service.price;

      if (service.unit === "per_person") {
        initialQuantity = guests;
      } else if (service.unit === "custom") {
        customPrice = 0;
      }

      setSelectedServices([
        ...selectedServices,
        {
          ...service,
          quantity: initialQuantity,
          customPrice: customPrice,
        },
      ]);
    }
  };

  const toggleBreakfastItem = (itemId) => {
    setSelectedBreakfastItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const updateQuantity = (serviceId, newQuantity) => {
    if (newQuantity < 1) return;

    setSelectedServices(
      selectedServices.map((s) =>
        s.id === serviceId ? { ...s, quantity: newQuantity } : s
      )
    );
  };

  // ✅ FIX: Mejorado para manejar string vacío
  const updateCustomPrice = (serviceId, newPrice) => {
    // Permitir string vacío, convertir solo cuando hay valor
    const price = newPrice === "" ? "" : parseInt(newPrice, 10) || 0;
    if (price !== "" && price < 0) return;

    setSelectedServices(
      selectedServices.map((s) =>
        s.id === serviceId ? { ...s, customPrice: price } : s
      )
    );
  };

  const calculateServiceTotal = (service) => {
    const selectedService = selectedServices.find((s) => s.id === service.id);
    if (!selectedService) return 0;

    const quantity = selectedService.quantity;
    const price =
      selectedService.customPrice !== undefined
        ? selectedService.customPrice
        : service.price;

    switch (service.unit) {
      case "per_person":
        return price * quantity * nights;
      case "per_night":
        return price * nights;
      case "per_room":
        return price * quantity;
      case "per_unit":
        return price * quantity;
      case "custom":
        return price * quantity;
      default:
        return price;
    }
  };

  const getTotalServices = () => {
    return selectedServices.reduce((sum, service) => {
      return sum + calculateServiceTotal(service);
    }, 0);
  };

  const getServiceUnitLabel = (unit) => {
    switch (unit) {
      case "per_person":
        return "/persona/noche";
      case "per_night":
        return "/noche";
      case "per_room":
        return "/habitación";
      case "per_unit":
        return "/unidad";
      case "custom":
        return "Precio personalizado";
      default:
        return "";
    }
  };

  const handleContinue = () => {
    const invalidCustomServices = selectedServices.filter(
      (s) => s.unit === "custom" && (!s.customPrice || s.customPrice <= 0)
    );

    if (invalidCustomServices.length > 0) {
      toast.error("Debe definir un precio para los servicios personalizados");
      return;
    }

    const servicesWithPricing = selectedServices.map((service) => ({
      ...service,
      customPrice:
        service.customPrice !== undefined ? service.customPrice : service.price,
    }));

    onUpdate({
      selectedServices: servicesWithPricing,
      breakfastPreferences: selectedBreakfastItems,
    });
    onNext();
  };

  if (loading) {
    return <div className="text-center py-8">Cargando servicios...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Servicios Adicionales
        </h2>
        <p className="text-muted-foreground">
          Seleccione servicios opcionales para complementar su estadía
          (opcional)
        </p>
      </div>

      {/* Lista de Servicios */}
      <div className="space-y-3">
        {services.map((service) => {
          const isSelected = selectedServices.find((s) => s.id === service.id);
          const selectedService = selectedServices.find(
            (s) => s.id === service.id
          );
          const isCustomService = service.unit === "custom";

          return (
            <Card
              key={service.id}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
              onClick={() => toggleService(service)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={`mt-1 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-current" />
                      )}
                    </div>

                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">
                            {service.name}
                          </p>
                          {isCustomService && (
                            <DollarSign className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                        {service.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {service.description}
                          </p>
                        )}
                        {!isCustomService && (
                          <p className="text-sm text-muted-foreground mt-1">
                            ${service.price.toLocaleString()}
                            {getServiceUnitLabel(service.unit)}
                          </p>
                        )}
                      </div>

                      {isSelected && isCustomService && (
                        <div
                          className="space-y-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Label className="text-sm flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Precio por unidad (definido por recepcionista):
                          </Label>
                          {/* ✅ FIX: Campo mejorado con símbolo $ y centrado */}
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                              $
                            </span>
                            <Input
                              type="text"
                              value={
                                selectedService.customPrice === ""
                                  ? ""
                                  : selectedService.customPrice
                              }
                              onChange={(e) => {
                                const value = e.target.value;
                                // Solo permitir números
                                if (/^\d*$/.test(value)) {
                                  updateCustomPrice(service.id, value);
                                }
                              }}
                              onFocus={(e) => e.target.select()}
                              placeholder="0"
                              className="w-full text-center pl-8"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Este precio se multiplicará por la cantidad
                          </p>
                        </div>
                      )}

                      {isSelected &&
                        (service.unit === "per_unit" ||
                          service.unit === "custom") && (
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Label className="text-sm">Cantidad:</Label>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(
                                    service.id,
                                    selectedService.quantity - 1
                                  );
                                }}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                value={selectedService.quantity}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(
                                    service.id,
                                    parseInt(e.target.value) || 1
                                  );
                                }}
                                className="w-20 text-center"
                                onClick={(e) => e.stopPropagation()}
                                min="1"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(
                                    service.id,
                                    selectedService.quantity + 1
                                  );
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}

                      {isSelected && service.unit === "per_person" && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {selectedService.quantity} personas × {nights} noches
                        </div>
                      )}

                      {isSelected && (
                        <p className="text-sm font-semibold text-primary">
                          Subtotal: $
                          {calculateServiceTotal(service).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* NUEVO: Menú de Desayuno Dinámico */}
      {selectedServices.find((s) => s.name === "Desayuno") && (
        <Card className="border-primary/50">
          <CardContent className="pt-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setBreakfastMenuOpen(!breakfastMenuOpen)}
            >
              <div className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-foreground">
                  Preferencias de Desayuno (Opcional)
                </h4>
              </div>
              {breakfastMenuOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            {breakfastMenuOpen && (
              <div className="mt-4 space-y-4 animate-fade-in">
                <p className="text-sm text-muted-foreground">
                  Seleccione los items que prefiere para su desayuno buffet.
                  Esta es una preferencia, todos los items estarán disponibles.
                </p>

                {loadingMenu ? (
                  <p className="text-sm text-center text-muted-foreground py-4">
                    Cargando menú...
                  </p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(breakfastMenu).map(([category, items]) => (
                      <div key={category} className="space-y-2">
                        <h5 className="text-sm font-semibold text-muted-foreground">
                          {category}
                        </h5>
                        <div className="grid grid-cols-2 gap-2">
                          {items.map((item) => {
                            const isSelected = selectedBreakfastItems.includes(
                              item.id
                            );
                            return (
                              <div
                                key={item.id}
                                className={`p-2 border rounded cursor-pointer transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:border-primary/50"
                                }`}
                                onClick={() => toggleBreakfastItem(item.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="h-4 w-4"
                                  />
                                  <span className="text-sm">{item.name}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedBreakfastItems.length > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">
                      {selectedBreakfastItems.length} items seleccionados como
                      preferencia
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recordatorio: Todos los items del buffet estarán
                      disponibles
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Resumen */}
      {selectedServices.length > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <h4 className="font-semibold text-foreground mb-3">
              Resumen de Servicios
            </h4>
            <div className="space-y-2 text-sm">
              {selectedServices.map((service) => (
                <div key={service.id} className="flex justify-between">
                  <div>
                    <span className="text-muted-foreground">
                      {service.name}
                    </span>
                    {service.unit === "custom" && (
                      <span className="text-xs text-orange-500 ml-2">
                        (${service.customPrice?.toLocaleString()}/unidad ×{" "}
                        {service.quantity})
                      </span>
                    )}
                  </div>
                  <span className="font-semibold">
                    ${calculateServiceTotal(service).toLocaleString()}
                  </span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Subtotal servicios:</span>
                <span className="font-bold text-primary">
                  ${getTotalServices().toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Volver
        </Button>
        <Button onClick={handleContinue}>
          {selectedServices.length > 0 ? "Continuar" : "Omitir Servicios"}
        </Button>
      </div>
    </div>
  );
};

export default Step3AdditionalServices;
