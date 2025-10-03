import React, { useState, useMemo, useEffect } from "react";
import { Country, State, City } from "country-state-city";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { LocationCombobox } from "@/components/LocationCombobox";
import { CheckCircle2, User, Search, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { guestsService } from "@/services/guests";
import {
  validateRutFormat,
  validateRutDv,
  formatRutInput,
  validatePassport,
  cleanRut,
} from "@/lib/rutValidator";

const MAX_LENGTHS = {
  firstName: 100,
  paternalLastName: 80,
  maternalLastName: 80,
  email: 150,
  phoneNumber: 30,
  identificationNumber: 15,
};

const Step5AdditionalGuests = ({ data, onUpdate, onNext, onBack }) => {
  const [additionalGuests, setAdditionalGuests] = useState(
    data.additionalGuests || []
  );
  const [currentGuestIndex, setCurrentGuestIndex] = useState(0);
  const [searchMode, setSearchMode] = useState(true);
  const [nationality, setNationality] = useState("chileno");
  const [identificationSearch, setIdentificationSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [guestFound, setGuestFound] = useState(null);
  const [creating, setCreating] = useState(false);

  const totalGuests = data.guests;
  const remainingGuests = totalGuests - 1; // -1 por el huésped principal

  // Validaciones en tiempo real
  const [validationErrors, setValidationErrors] = useState({});
  const [touched, setTouched] = useState({});

  const [formData, setFormData] = useState({
    identificationNumber: "",
    firstName: "",
    paternalLastName: "",
    maternalLastName: "",
    email: "",
    phoneNumber: "",
    birthDate: "",
    gender: "",
    country: "",
    region: "",
    city: "",
  });

  // Países, estados y ciudades
  const countries = useMemo(
    () =>
      Country.getAllCountries().map((c) => ({
        value: c.isoCode,
        label: c.name,
      })),
    []
  );

  const states = useMemo(
    () =>
      formData.country
        ? State.getStatesOfCountry(formData.country).map((s) => ({
            value: s.isoCode,
            label: s.name,
          }))
        : [],
    [formData.country]
  );

  const cities = useMemo(
    () =>
      formData.country && formData.region
        ? City.getCitiesOfState(formData.country, formData.region).map((c) => ({
            value: c.name,
            label: c.name,
          }))
        : [],
    [formData.country, formData.region]
  );

  // Validación en tiempo real
  useEffect(() => {
    const errors = {};

    if (touched.identificationNumber && formData.identificationNumber) {
      if (nationality === "chileno") {
        const cleaned = cleanRut(formData.identificationNumber);
        const rutPart = cleaned.slice(0, -1);
        const dvPart = cleaned.slice(-1);

        if (!validateRutFormat(rutPart)) {
          errors.identificationNumber = "RUT debe tener 7-8 dígitos";
        } else if (!validateRutDv(rutPart, dvPart)) {
          errors.identificationNumber = "Dígito verificador incorrecto";
        }
      } else {
        if (!validatePassport(formData.identificationNumber)) {
          errors.identificationNumber = "Pasaporte inválido (8-15 caracteres)";
        }
      }
    }

    if (touched.firstName && !formData.firstName) {
      errors.firstName = "Nombre es obligatorio";
    }

    if (touched.paternalLastName && !formData.paternalLastName) {
      errors.paternalLastName = "Apellido paterno es obligatorio";
    }

    if (touched.email) {
      if (!formData.email) {
        errors.email = "Email es obligatorio";
      } else {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(formData.email)) {
          errors.email = "Email inválido";
        }
      }
    }

    setValidationErrors(errors);
  }, [formData, touched, nationality]);

  const handleSearchGuest = async () => {
    if (!identificationSearch || identificationSearch.trim() === "") {
      toast.error("Ingrese un número de identificación");
      return;
    }

    const cleaned = cleanRut(identificationSearch);

    // Validar que no sea el huésped principal
    if (
      data.mainGuest &&
      cleaned === cleanRut(data.mainGuest.identificationNumber)
    ) {
      toast.error("Este es el huésped principal. Busque otro huésped.");
      return;
    }

    // Validar que no esté duplicado en la lista
    const isDuplicate = additionalGuests.some(
      (guest) => cleanRut(guest.identificationNumber) === cleaned
    );
    if (isDuplicate) {
      toast.error("Este huésped ya fue agregado");
      return;
    }

    if (nationality === "chileno") {
      const rutPart = cleaned.slice(0, -1);
      const dvPart = cleaned.slice(-1);

      if (!validateRutFormat(rutPart) || !validateRutDv(rutPart, dvPart)) {
        toast.error("RUT inválido");
        return;
      }
    }

    setSearching(true);
    try {
      const result = await guestsService.searchByIdentification(cleaned);

      if (result.found) {
        const countryData = Country.getAllCountries().find(
          (c) => c.name === result.guest.country
        );
        const stateData = countryData
          ? State.getStatesOfCountry(countryData.isoCode).find(
              (s) => s.name === result.guest.region
            )
          : null;

        setGuestFound({
          ...result.guest,
          country: countryData?.isoCode || "",
          region: stateData?.isoCode || "",
        });
        toast.success("Huésped encontrado");
      } else {
        setGuestFound(null);
        toast.info("Huésped no encontrado. Complete el formulario.");
        setSearchMode(false);
        setFormData((prev) => ({
          ...prev,
          identificationNumber: cleaned,
        }));
      }
    } catch (error) {
      console.error("Error al buscar huésped:", error);
      toast.error("Error al buscar huésped");
    } finally {
      setSearching(false);
    }
  };

  const handleUseFoundGuest = () => {
    const newGuests = [...additionalGuests];
    newGuests[currentGuestIndex] = guestFound;
    setAdditionalGuests(newGuests);

    toast.success(`Huésped ${currentGuestIndex + 2} agregado`);

    // Reset
    resetForm();

    // Mover al siguiente si hay más
    if (currentGuestIndex < remainingGuests - 1) {
      setCurrentGuestIndex(currentGuestIndex + 1);
    }
  };

  const handleCreateGuest = async () => {
    // Marcar campos como touched
    setTouched({
      identificationNumber: true,
      firstName: true,
      paternalLastName: true,
      email: true,
    });

    if (
      !formData.identificationNumber ||
      !formData.firstName ||
      !formData.paternalLastName ||
      !formData.email
    ) {
      toast.error("Complete los campos obligatorios");
      return;
    }

    if (Object.keys(validationErrors).length > 0) {
      toast.error("Corrige los errores en el formulario");
      return;
    }

    // Validar duplicados
    const cleaned = cleanRut(formData.identificationNumber);
    if (
      data.mainGuest &&
      cleaned === cleanRut(data.mainGuest.identificationNumber)
    ) {
      toast.error("No puede registrar al huésped principal como adicional");
      return;
    }

    const isDuplicate = additionalGuests.some(
      (guest) => cleanRut(guest.identificationNumber) === cleaned
    );
    if (isDuplicate) {
      toast.error("Este huésped ya fue agregado");
      return;
    }

    setCreating(true);
    try {
      const countryName =
        countries.find((c) => c.value === formData.country)?.label || "";
      const stateName =
        states.find((s) => s.value === formData.region)?.label || "";

      const payload = {
        ...formData,
        country: countryName,
        region: stateName,
      };

      const result = await guestsService.createGuest(payload);

      const newGuests = [...additionalGuests];
      newGuests[currentGuestIndex] = {
        id: result.guest.id,
        identificationNumber: result.guest.identificationNumber,
        firstName: result.guest.firstName,
        paternalLastName: result.guest.paternalLastName,
        maternalLastName: result.guest.maternalLastName,
        email: result.guest.email,
      };
      setAdditionalGuests(newGuests);

      toast.success(`Huésped ${currentGuestIndex + 2} registrado`);

      resetForm();

      if (currentGuestIndex < remainingGuests - 1) {
        setCurrentGuestIndex(currentGuestIndex + 1);
      }
    } catch (error) {
      console.error("Error al crear huésped:", error);
      toast.error(error.response?.data?.message || "Error al crear huésped");
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      identificationNumber: "",
      firstName: "",
      paternalLastName: "",
      maternalLastName: "",
      email: "",
      phoneNumber: "",
      birthDate: "",
      gender: "",
      country: "",
      region: "",
      city: "",
    });
    setTouched({});
    setValidationErrors({});
    setGuestFound(null);
    setIdentificationSearch("");
    setSearchMode(true);
  };

  const removeGuest = (index) => {
    const newGuests = additionalGuests.filter((_, i) => i !== index);
    setAdditionalGuests(newGuests);

    // Ajustar currentGuestIndex si es necesario
    if (currentGuestIndex >= newGuests.length && currentGuestIndex > 0) {
      setCurrentGuestIndex(currentGuestIndex - 1);
    }

    toast.info("Huésped eliminado");
  };

  const handleContinue = () => {
    onUpdate({ additionalGuests });
    onNext();
  };

  const handleSkip = () => {
    if (additionalGuests.length === 0) {
      toast.info("Los huéspedes pueden registrarse después en el check-in");
    }
    onUpdate({ additionalGuests });
    onNext();
  };

  const updateFormField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFieldBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleIdentificationChange = (e) => {
    const value = e.target.value;

    if (nationality === "chileno") {
      const formatted = formatRutInput(value);
      setIdentificationSearch(formatted);
    } else {
      setIdentificationSearch(value.toUpperCase().replace(/\s/g, ""));
    }
  };

  const handleFormIdentificationChange = (e) => {
    const value = e.target.value;

    if (nationality === "chileno") {
      const formatted = formatRutInput(value);
      updateFormField("identificationNumber", formatted);
    } else {
      updateFormField(
        "identificationNumber",
        value.toUpperCase().replace(/\s/g, "")
      );
    }
  };

  const getCharacterCount = (field, maxLength) => {
    const current = formData[field]?.length || 0;
    const percentage = (current / maxLength) * 100;
    const isWarning = percentage >= 75;

    return (
      <span
        className={`text-xs ${isWarning ? "text-orange-500" : "text-muted-foreground"}`}
      >
        {current}/{maxLength}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Huéspedes Adicionales
        </h2>
        <p className="text-muted-foreground">
          Registre los {remainingGuests} huéspedes restantes (opcional)
        </p>
      </div>

      {/* Progress con opción de eliminar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">
              <User className="h-3 w-3 mr-1" />
              Huésped Principal ✓
            </Badge>
            {Array.from({ length: remainingGuests }).map((_, index) => (
              <div key={index} className="relative group">
                <Badge
                  variant={additionalGuests[index] ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setCurrentGuestIndex(index)}
                >
                  {additionalGuests[index] ? (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  ) : (
                    <User className="h-3 w-3 mr-1" />
                  )}
                  Huésped {index + 2}
                  {additionalGuests[index] && " ✓"}
                </Badge>
                {additionalGuests[index] && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeGuest(index);
                    }}
                    className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de huéspedes agregados */}
      {additionalGuests.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">
              Huéspedes Agregados ({additionalGuests.length})
            </h3>
            <div className="space-y-2">
              {additionalGuests.map((guest, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {guest.firstName} {guest.paternalLastName}{" "}
                      {guest.maternalLastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {guest.email}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGuest(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulario para huésped actual */}
      {currentGuestIndex < remainingGuests && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold text-foreground">
              Huésped {currentGuestIndex + 2} de {totalGuests}
            </h3>

            {searchMode ? (
              <>
                <div className="space-y-2">
                  <Label>Nacionalidad</Label>
                  <Select value={nationality} onValueChange={setNationality}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chileno">Chileno</SelectItem>
                      <SelectItem value="extranjero">Extranjero</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    {nationality === "chileno" ? "RUT" : "Pasaporte"}
                  </Label>
                  <Input
                    value={identificationSearch}
                    onChange={handleIdentificationChange}
                    placeholder={
                      nationality === "chileno" ? "12.345.678-9" : "ABC123456"
                    }
                    maxLength={nationality === "chileno" ? 12 : 15}
                  />
                </div>

                <Button
                  onClick={handleSearchGuest}
                  disabled={searching}
                  className="w-full"
                >
                  <Search className="mr-2 h-4 w-4" />
                  {searching ? "Buscando..." : "Buscar"}
                </Button>

                {guestFound && (
                  <Card className="border-primary bg-primary/5">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-semibold">Huésped encontrado</p>
                          <p className="text-sm">
                            {guestFound.firstName} {guestFound.paternalLastName}
                          </p>
                        </div>
                      </div>
                      <Button onClick={handleUseFoundGuest} className="w-full">
                        Usar estos datos
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Button
                  variant="outline"
                  onClick={() => setSearchMode(false)}
                  className="w-full"
                >
                  Registrar Nuevo
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchMode(true)}
                >
                  ← Volver a búsqueda
                </Button>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>RUT/Pasaporte *</Label>
                      {getCharacterCount(
                        "identificationNumber",
                        MAX_LENGTHS.identificationNumber
                      )}
                    </div>
                    <Input
                      value={formData.identificationNumber}
                      onChange={handleFormIdentificationChange}
                      onBlur={() => handleFieldBlur("identificationNumber")}
                      maxLength={MAX_LENGTHS.identificationNumber}
                      className={
                        validationErrors.identificationNumber
                          ? "border-destructive"
                          : ""
                      }
                    />
                    {validationErrors.identificationNumber && (
                      <div className="flex items-center gap-1 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{validationErrors.identificationNumber}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Nombre *</Label>
                        {getCharacterCount("firstName", MAX_LENGTHS.firstName)}
                      </div>
                      <Input
                        value={formData.firstName}
                        onChange={(e) =>
                          updateFormField("firstName", e.target.value)
                        }
                        onBlur={() => handleFieldBlur("firstName")}
                        maxLength={MAX_LENGTHS.firstName}
                        className={
                          validationErrors.firstName ? "border-destructive" : ""
                        }
                      />
                      {validationErrors.firstName && (
                        <div className="flex items-center gap-1 text-destructive text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>{validationErrors.firstName}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Apellido Paterno *</Label>
                        {getCharacterCount(
                          "paternalLastName",
                          MAX_LENGTHS.paternalLastName
                        )}
                      </div>
                      <Input
                        value={formData.paternalLastName}
                        onChange={(e) =>
                          updateFormField("paternalLastName", e.target.value)
                        }
                        onBlur={() => handleFieldBlur("paternalLastName")}
                        maxLength={MAX_LENGTHS.paternalLastName}
                        className={
                          validationErrors.paternalLastName
                            ? "border-destructive"
                            : ""
                        }
                      />
                      {validationErrors.paternalLastName && (
                        <div className="flex items-center gap-1 text-destructive text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>{validationErrors.paternalLastName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Email *</Label>
                      {getCharacterCount("email", MAX_LENGTHS.email)}
                    </div>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        updateFormField("email", e.target.value.toLowerCase())
                      }
                      onBlur={() => handleFieldBlur("email")}
                      maxLength={MAX_LENGTHS.email}
                      className={
                        validationErrors.email ? "border-destructive" : ""
                      }
                    />
                    {validationErrors.email && (
                      <div className="flex items-center gap-1 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{validationErrors.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Teléfono</Label>
                      {getCharacterCount(
                        "phoneNumber",
                        MAX_LENGTHS.phoneNumber
                      )}
                    </div>
                    <Input
                      value={formData.phoneNumber}
                      onChange={(e) =>
                        updateFormField("phoneNumber", e.target.value)
                      }
                      placeholder="+56 9 1234 5678"
                      maxLength={MAX_LENGTHS.phoneNumber}
                    />
                  </div>

                  <Button
                    onClick={handleCreateGuest}
                    disabled={
                      creating || Object.keys(validationErrors).length > 0
                    }
                    className="w-full"
                  >
                    {creating ? "Guardando..." : "Guardar Huésped"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Volver
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSkip}>
            {additionalGuests.length > 0 ? "Continuar" : "Omitir Restantes"}
          </Button>
          {additionalGuests.length === remainingGuests && (
            <Button onClick={handleContinue}>Continuar</Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step5AdditionalGuests;
