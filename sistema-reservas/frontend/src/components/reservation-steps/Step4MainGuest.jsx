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
import { Separator } from "@/components/ui/Separator";
import { LocationCombobox } from "@/components/LocationCombobox";
import {
  Search,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Plus,
  Minus,
} from "lucide-react"; // CORREGIDO
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
  specialRequests: 200,
  observations: 250,
};

const Step4MainGuest = ({ data, onUpdate, onNext, onBack }) => {
  const [searchMode, setSearchMode] = useState(true);
  const [nationality, setNationality] = useState("chileno");
  const [identificationSearch, setIdentificationSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [guestFound, setGuestFound] = useState(null);
  const [creating, setCreating] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);

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
    travelsWithChildren: false,
    childrenUnderFour: 0,
    specialRequests: "",
    observations: "",
  });

  // Pre-llenar formulario si ya existe mainGuest
  useEffect(() => {
    if (data.mainGuest) {
      const guest = data.mainGuest;
      setFormData({
        identificationNumber: guest.identificationNumber || "",
        firstName: guest.firstName || "",
        paternalLastName: guest.paternalLastName || "",
        maternalLastName: guest.maternalLastName || "",
        email: guest.email || "",
        phoneNumber: guest.phoneNumber || "",
        birthDate: guest.birthDate || "",
        gender: guest.gender || "",
        country: guest.country || "",
        region: guest.region || "",
        city: guest.city || "",
        travelsWithChildren: guest.travelsWithChildren || false,
        childrenUnderFour: guest.childrenUnderFour || 0,
        specialRequests: guest.specialRequests || "",
        observations: guest.observations || "",
      });
      setSearchMode(false);
    }
  }, [data.mainGuest]);

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

  useEffect(() => {
    const errors = {};

    if (touched.identificationNumber && formData.identificationNumber) {
      if (nationality === "chileno") {
        const cleaned = cleanRut(formData.identificationNumber);
        const rutPart = cleaned.slice(0, -1);
        const dvPart = cleaned.slice(-1);

        if (!validateRutFormat(rutPart)) {
          errors.identificationNumber = "RUT ingresado erróneo";
        } else if (!validateRutDv(rutPart, dvPart)) {
          errors.identificationNumber = "RUT ingresado erróneo";
        }
      } else {
        if (!/^[A-Z0-9]{8,15}$/i.test(formData.identificationNumber)) {
          errors.identificationNumber =
            "Pasaporte debe tener 8-15 caracteres alfanuméricos";
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

    if (touched.birthDate && formData.birthDate) {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();

      if (age < 18) {
        errors.birthDate = "El huésped principal debe ser mayor de edad (18+)";
      }
    }

    if (touched.maternalLastName && !formData.maternalLastName) {
      errors.maternalLastName = "Apellido materno es obligatorio";
    }

    if (touched.phoneNumber && !formData.phoneNumber) {
      errors.phoneNumber = "Teléfono es obligatorio";
    }

    if (touched.birthDate && !formData.birthDate) {
      errors.birthDate = "Fecha de nacimiento es obligatoria";
    }

    if (touched.gender && !formData.gender) {
      errors.gender = "Género es obligatorio";
    }

    if (touched.country && !formData.country) {
      errors.country = "País es obligatorio";
    }

    if (touched.region && !formData.region) {
      errors.region = "Región es obligatoria";
    }

    if (touched.city && !formData.city) {
      errors.city = "Ciudad es obligatoria";
    }

    setValidationErrors(errors);
  }, [formData, touched, nationality]);

  const handleSearchGuest = async () => {
    if (!identificationSearch || identificationSearch.trim() === "") {
      toast.error("Ingrese un número de identificación");
      return;
    }

    const cleaned = cleanRut(identificationSearch);

    if (nationality === "chileno") {
      const rutPart = cleaned.slice(0, -1);
      const dvPart = cleaned.slice(-1);

      if (!validateRutFormat(rutPart)) {
        toast.error("RUT ingresado erróneo");
        return;
      }

      if (!validateRutDv(rutPart, dvPart)) {
        toast.error("RUT ingresado erróneo");
        return;
      }
    } else {
      // CORREGIDO: Validar pasaporte
      if (!/^[A-Z0-9]{8,15}$/i.test(cleaned)) {
        toast.error("Pasaporte debe tener 8-15 caracteres alfanuméricos");
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
        toast.info(
          "Huésped no encontrado. Complete el formulario para registrarlo."
        );
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
    const missingFields = [];
    if (!guestFound.email) missingFields.push('Email');
    if (!guestFound.birthDate) missingFields.push('Fecha de nacimiento');
    if (!guestFound.gender) missingFields.push('Género');
    
    if (missingFields.length > 0) {
      setSearchMode(false);
      setIsEditingExisting(true);
      setFormData({
        ...guestFound,
      });
      toast.warning(`Complete los campos faltantes: ${missingFields.join(', ')}`);
      return;
    }
    
    onUpdate({ mainGuest: guestFound });
    onNext();
  };

  const handleSaveGuest = async () => {
    setTouched({
      identificationNumber: true,
      firstName: true,
      paternalLastName: true,
      maternalLastName: true,
      email: true,
      phoneNumber: true,
      birthDate: true,
      gender: true,
      country: true,
      region: true,
      city: true,
    });

    if (
      !formData.identificationNumber ||
      !formData.firstName ||
      !formData.paternalLastName ||
      !formData.maternalLastName ||
      !formData.email ||
      !formData.phoneNumber ||
      !formData.birthDate ||
      !formData.gender ||
      !formData.country ||
      !formData.region ||
      !formData.city
    ) {
      toast.error("Complete todos los campos obligatorios del huésped principal");
      return;
    }

    if (Object.keys(validationErrors).length > 0) {
      toast.error("Corrige los errores en el formulario");
      return;
    }

    setCreating(true);

    try {
      const countryName = countries.find((c) => c.value === formData.country)?.label || "";
      const stateName = states.find((s) => s.value === formData.region)?.label || "";

      const guestData = {
        ...formData,
        country: countryName,
        region: stateName,
        isMainGuest: true,
      };

      if (isEditingExisting && guestFound?.id) {
        await guestsService.updateGuest(guestFound.id, guestData);
        toast.success("Datos del huésped actualizados correctamente");
        
        guestData.id = guestFound.id;
      } else {
        toast.success("Datos del huésped principal guardados");
      }

      onUpdate({ mainGuest: guestData });
      onNext();
    } catch (error) {
      console.error("Error al guardar huésped:", error);
      toast.error(error.response?.data?.message || "Error al guardar huésped");
    } finally {
      setCreating(false);
    }
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
      // CORREGIDO: Solo alfanuméricos uppercase
      setIdentificationSearch(value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
    }
  };

  const handleFormIdentificationChange = (e) => {
    const value = e.target.value;

    if (nationality === "chileno") {
      const formatted = formatRutInput(value);
      updateFormField("identificationNumber", formatted);
    } else {
      // CORREGIDO: Solo alfanuméricos uppercase
      updateFormField(
        "identificationNumber",
        value.toUpperCase().replace(/[^A-Z0-9]/g, "")
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
          Huésped Principal
        </h2>
        <p className="text-muted-foreground">
          Quien realiza la reserva y es responsable del pago
        </p>
      </div>

      {searchMode ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold text-foreground">
              Buscar Huésped Existente
            </h3>

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
              <Label>{nationality === "chileno" ? "RUT" : "Pasaporte"}</Label>
              <Input
                value={identificationSearch}
                onChange={handleIdentificationChange}
                placeholder={
                  nationality === "chileno" ? "12.345.678-9" : "ABC123456"
                }
                maxLength={nationality === "chileno" ? 12 : 15}
              />
              <p className="text-xs text-muted-foreground">
                {nationality === "chileno"
                  ? "Formato: XX.XXX.XXX-X (se formatea automáticamente)"
                  : "8-15 caracteres alfanuméricos"}
              </p>
            </div>

            <Button
              onClick={handleSearchGuest}
              disabled={searching || !identificationSearch}
              className="w-full"
            >
              <Search className="mr-2 h-4 w-4" />
              {searching ? "Buscando..." : "Buscar"}
            </Button>

            {guestFound && (
              <Card className="border-primary bg-primary/5">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        Huésped encontrado
                      </p>
                      <div className="text-sm space-y-1 mt-2">
                        <p>
                          <span className="font-medium">Nombre:</span>{" "}
                          {guestFound.firstName} {guestFound.paternalLastName}{" "}
                          {guestFound.maternalLastName}
                        </p>
                        <p>
                          <span className="font-medium">Email:</span>{" "}
                          {guestFound.email}
                        </p>
                        <p>
                          <span className="font-medium">Teléfono:</span>{" "}
                          {guestFound.phoneNumber || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleUseFoundGuest} className="flex-1">
                      Usar estos datos
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setGuestFound(null);
                        setIdentificationSearch("");
                      }}
                    >
                      Buscar otro
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            <Button
              variant="outline"
              onClick={() => setSearchMode(false)}
              className="w-full"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Registrar Nuevo Huésped
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                Registrar Nuevo Huésped
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchMode(true);
                  setIsEditingExisting(false);
                }}
              >
                ← Volver a búsqueda
              </Button>
            </div>

            {/* Identificación */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  {nationality === "chileno" ? "RUT" : "Pasaporte"} *
                </Label>
                {getCharacterCount(
                  "identificationNumber",
                  MAX_LENGTHS.identificationNumber
                )}
              </div>
              <Input
                value={formData.identificationNumber}
                onChange={handleFormIdentificationChange}
                onBlur={() => handleFieldBlur("identificationNumber")}
                placeholder={
                  nationality === "chileno" ? "12.345.678-9" : "ABC123456"
                }
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

            {/* Nombres */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Nombre *</Label>
                  {getCharacterCount("firstName", MAX_LENGTHS.firstName)}
                </div>
                <Input
                  value={formData.firstName}
                  onChange={(e) => updateFormField("firstName", e.target.value)}
                  onBlur={() => handleFieldBlur("firstName")}
                  placeholder="Juan"
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
                  placeholder="Pérez"
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
                <Label>Apellido Materno *</Label>
                {getCharacterCount(
                  "maternalLastName",
                  MAX_LENGTHS.maternalLastName
                )}
              </div>
              <Input
                value={formData.maternalLastName}
                onChange={(e) =>
                  updateFormField("maternalLastName", e.target.value)
                }
                onBlur={() => handleFieldBlur("maternalLastName")}
                placeholder="González"
                maxLength={MAX_LENGTHS.maternalLastName}
                className={
                  validationErrors.maternalLastName ? "border-destructive" : ""
                }
              />
              {validationErrors.maternalLastName && (
                <div className="flex items-center gap-1 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{validationErrors.maternalLastName}</span>
                </div>
              )}
            </div>

            {/* Contacto */}
            <div className="grid grid-cols-2 gap-4">
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
                  placeholder="ejemplo@email.com"
                  maxLength={MAX_LENGTHS.email}
                  className={validationErrors.email ? "border-destructive" : ""}
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
                  <Label>Teléfono *</Label>
                  {getCharacterCount("phoneNumber", MAX_LENGTHS.phoneNumber)}
                </div>
                <Input
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    updateFormField("phoneNumber", e.target.value)
                  }
                  onBlur={() => handleFieldBlur("phoneNumber")}
                  placeholder="+56 9 1234 5678"
                  maxLength={MAX_LENGTHS.phoneNumber}
                  className={
                    validationErrors.phoneNumber ? "border-destructive" : ""
                  }
                />
                {validationErrors.phoneNumber && (
                  <div className="flex items-center gap-1 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{validationErrors.phoneNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Datos Adicionales Obligatorios */}
            <Separator />
            <h4 className="font-medium text-foreground">
              Datos Adicionales Obligatorios
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Nacimiento *</Label>
                <Input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => updateFormField("birthDate", e.target.value)}
                  onBlur={() => handleFieldBlur("birthDate")}
                  max={new Date().toISOString().split("T")[0]}
                  className={
                    validationErrors.birthDate ? "border-destructive" : ""
                  }
                />
                {validationErrors.birthDate && (
                  <div className="flex items-center gap-1 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{validationErrors.birthDate}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Género *</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(val) => updateFormField("gender", val)}
                >
                  <SelectTrigger
                    className={
                      validationErrors.gender ? "border-destructive" : ""
                    }
                  >
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Femenino</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.gender && (
                  <div className="flex items-center gap-1 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{validationErrors.gender}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ubicación */}
            <div className="space-y-2">
              <Label>País *</Label>
              <LocationCombobox
                options={countries}
                value={formData.country}
                onChange={(value) => {
                  setFormData((p) => ({
                    ...p,
                    country: value,
                    region: "",
                    city: "",
                  }));
                  handleFieldBlur("country");
                }}
                placeholder="País"
              />
              {validationErrors.country && (
                <div className="flex items-center gap-1 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{validationErrors.country}</span>
                </div>
              )}
            </div>

            {formData.country && (
              <div className="space-y-2 animate-fade-in">
                <Label>Región *</Label>
                <LocationCombobox
                  options={states}
                  value={formData.region}
                  onChange={(value) => {
                    setFormData((p) => ({ ...p, region: value, city: "" }));
                    handleFieldBlur("region");
                  }}
                  placeholder="Región"
                />
                {validationErrors.region && (
                  <div className="flex items-center gap-1 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{validationErrors.region}</span>
                  </div>
                )}
              </div>
            )}

            {formData.region && (
              <div className="space-y-2 animate-fade-in">
                <Label>Ciudad *</Label>
                <LocationCombobox
                  options={cities}
                  value={formData.city}
                  onChange={(value) => {
                    setFormData((p) => ({ ...p, city: value }));
                    handleFieldBlur("city");
                  }}
                  placeholder="Ciudad"
                />
                {validationErrors.city && (
                  <div className="flex items-center gap-1 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{validationErrors.city}</span>
                  </div>
                )}
              </div>
            )}

            {/* Gestión de Niños */}
            <Separator />
            <h4 className="font-medium text-foreground">
              Información sobre Niños
            </h4>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="travelsWithChildren"
                  checked={formData.travelsWithChildren}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    updateFormField("travelsWithChildren", isChecked);
                    updateFormField("childrenUnderFour", isChecked ? 1 : 0);
                  }}
                  className="h-4 w-4"
                />
                <Label htmlFor="travelsWithChildren" className="cursor-pointer">
                  Viaja con niños
                </Label>
              </div>

              {formData.travelsWithChildren && (
                <div className="space-y-2 animate-fade-in pl-7">
                  <Label>Número de niños menores de 4 años</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateFormField(
                          "childrenUnderFour",
                          Math.max(0, (formData.childrenUnderFour || 0) - 1)
                        )
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={formData.childrenUnderFour || 0}
                      onChange={(e) =>
                        updateFormField(
                          "childrenUnderFour",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-20 text-center"
                      min="0"
                      max="5"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateFormField(
                          "childrenUnderFour",
                          Math.min(5, (formData.childrenUnderFour || 0) + 1)
                        )
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Los niños menores de 4 años no ocupan cama ni se cuentan en
                    la capacidad de la habitación
                  </p>
                </div>
              )}
            </div>

            {/* Información adicional */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Peticiones Especiales</Label>
                {getCharacterCount(
                  "specialRequests",
                  MAX_LENGTHS.specialRequests
                )}
              </div>
              <Input
                value={formData.specialRequests}
                onChange={(e) =>
                  updateFormField("specialRequests", e.target.value)
                }
                placeholder="Ej: Cama extra, cuna, etc."
                maxLength={MAX_LENGTHS.specialRequests}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Notas/Alertas del Huésped</Label> {/* RENOMBRADO */}
                {getCharacterCount("observations", MAX_LENGTHS.observations)}
              </div>
              <Input
                value={formData.observations}
                onChange={(e) =>
                  updateFormField("observations", e.target.value)
                }
                placeholder="Advertencias o notas importantes sobre el huésped"
                maxLength={MAX_LENGTHS.observations}
              />
            </div>

            <Button
              onClick={handleSaveGuest}
              disabled={creating || Object.keys(validationErrors).length > 0}
              className="w-full"
            >
              {creating ? "Guardando..." : "Guardar y Continuar"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Volver
        </Button>
      </div>
    </div>
  );
};

export default Step4MainGuest;
