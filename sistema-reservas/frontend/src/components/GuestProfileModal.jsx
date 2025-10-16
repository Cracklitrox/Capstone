import React, { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Country, State, City } from "country-state-city";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Corregido: 'select' en minúsculas

import {
  XMarkIcon,
  UserIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  PencilIcon,
  CheckIcon,
  ChartBarIcon,
  MapPinIcon,
  IdentificationIcon,
  PhoneIcon,
  EnvelopeIcon,
  CakeIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";

const GuestProfileModal = ({
  isOpen,
  onClose,
  guest,
  guestProfile,
  guestReservations,
  loading,
  isEditMode,
  activeTab,
  onTabChange,
  onEditField,
  onSaveField,
  onCancelEditField,
  editingStates,
  editedValues,
  savingStates,
  fieldErrors,
  onEditObservations,
  onSaveObservations,
  onCancelEditObservations,
  isEditingObservations,
  editedObservations,
  savingObservations,
  onViewFullHistory,
  reservationsLoading,
  canEditField,
  handleRutChange,
}) => {
  // --- Funciones de utilidad ---
  const formatData = (value, defaultText = "Sin datos") => {
    if (!value || value === "" || value === null || value === undefined) {
      return defaultText;
    }
    return value;
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      return format(parseISO(date), "dd/MM/yyyy", { locale: es });
    } catch {
      return "N/A";
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    try {
      const birth = parseISO(birthDate);
      const now = new Date();
      const years = Math.floor((now - birth) / (365.25 * 24 * 60 * 60 * 1000));
      return years;
    } catch (error) {
      return null;
    }
  };

  const getStatusVariant = (status) => {
    const variants = {
      completed: "default",
      confirmed: "secondary",
      in_progress: "default",
      pending: "outline",
      canceled: "destructive",
      no_show: "destructive",
    };
    return variants[status] || "outline";
  };

  const statusTranslations = {
    completed: "Completada",
    confirmed: "Confirmada",
    in_progress: "En Progreso",
    pending: "Pendiente",
    canceled: "Cancelada",
    no_show: "No se Presentó",
  };

  const sortedReservations = [...guestReservations].sort((a, b) => {
    const statusOrder = {
      in_progress: 1,
      pending: 2,
      confirmed: 3,
      completed: 4,
      canceled: 5,
      no_show: 6,
    };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  // --- Lógica para Ubicación Dinámica ---
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
      editedValues.nationality
        ? State.getStatesOfCountry(editedValues.nationality).map((s) => ({
            value: s.isoCode,
            label: s.name,
          }))
        : [],
    [editedValues.nationality]
  );

  const cities = useMemo(
    () =>
      editedValues.nationality && editedValues.region
        ? City.getCitiesOfState(
            editedValues.nationality,
            editedValues.region
          ).map((c) => ({ value: c.name, label: c.name }))
        : [],
    [editedValues.nationality, editedValues.region]
  );

  // --- Componentes InfoField y EditField ---
  const InfoField = ({ label, value, icon }) => (
    <div className="flex items-start gap-2 py-2 border-b border-border last:border-0">
      {icon && (
        <div className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
          {label}
        </p>
        <p className="text-xs text-foreground break-words">
          {value || "Sin datos"}
        </p>
      </div>
    </div>
  );

  const EditField = ({
    fieldName,
    label,
    value,
    type = "text",
    options = null,
    readonly = false,
  }) => {
    const isEditing = editingStates[fieldName];
    const isSaving = savingStates[fieldName];
    const error = fieldErrors[fieldName];
    const editedValue = editedValues[fieldName];
    const hasEditPermission = canEditField(fieldName);

    const handleEditLocation = () => {
      const countryData = Country.getAllCountries().find(
        (c) => c.name === guestProfile.nationality
      );
      const stateData = countryData
        ? State.getStatesOfCountry(countryData.isoCode).find(
            (s) => s.name === guestProfile.region
          )
        : null;

      editedValues.nationality = countryData?.isoCode || "";
      editedValues.region = stateData?.isoCode || "";
      editedValues.city = guestProfile.city || "";

      onEditField("nationality");
      onEditField("region");
      onEditField("city");
    };

    const handleSaveLocation = () => {
      // Guardar los tres campos a la vez
      let nationalityToSave =
        countries.find((c) => c.value === editedValues.nationality)?.label ||
        "";
      let regionToSave =
        states.find((s) => s.value === editedValues.region)?.label || "";
      let cityToSave = editedValues.city;

      // Guardar País
      const originalNationality = editedValues.nationality;
      editedValues.nationality = nationalityToSave;
      onSaveField("nationality");
      editedValues.nationality = originalNationality;

      // Guardar Región
      const originalRegion = editedValues.region;
      editedValues.region = regionToSave;
      onSaveField("region");
      editedValues.region = originalRegion;

      // Guardar Ciudad
      const originalCity = editedValues.city;
      editedValues.city = cityToSave;
      onSaveField("city");
      editedValues.city = originalCity;
    };

    const handleCancelLocation = () => {
      onCancelEditField("nationality");
      onCancelEditField("region");
      onCancelEditField("city");
    };

    if (readonly || fieldName === "registrationDate" || !hasEditPermission) {
      return (
        <div className="mb-3">
          <Label className="text-[10px] font-medium text-muted-foreground mb-1 block">
            {label}
          </Label>
          <div className="px-2 py-1.5 rounded-md bg-muted text-xs text-foreground">
            {type === "date" && value
              ? formatDate(value)
              : value || "Sin datos"}
          </div>
        </div>
      );
    }

    if (
      ["nationality", "region", "city"].includes(fieldName) &&
      !editingStates.nationality
    ) {
      if (fieldName === "nationality") {
        return (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-[10px] font-medium text-muted-foreground">
                Ubicación
              </Label>
              <button
                onClick={handleEditLocation}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground"
              >
                <PencilIcon className="h-3 w-3" />
              </button>
            </div>
            <div className="px-2 py-1.5 rounded-md bg-muted text-xs text-foreground">
              {[
                guestProfile.city,
                guestProfile.region,
                guestProfile.nationality,
              ]
                .filter(Boolean)
                .join(", ") || "Sin datos"}
            </div>
          </div>
        );
      }
      return null;
    }

    if (isEditing) {
      if (["nationality", "region", "city"].includes(fieldName)) {
        let locationOptions = [];
        let placeholder = "";
        let isDisabled = false;

        if (fieldName === "nationality") {
          locationOptions = countries;
          placeholder = "Seleccione un País";
        } else if (fieldName === "region") {
          locationOptions = states;
          placeholder = "Seleccione una Región";
          isDisabled = !editedValues.nationality;
        } else if (fieldName === "city") {
          locationOptions = cities;
          placeholder = "Seleccione una Ciudad";
          isDisabled = !editedValues.region;
        }

        return (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-[10px] font-medium text-muted-foreground">
                {label}
              </Label>
              {fieldName === "city" && (
                <div className="flex gap-1">
                  <button
                    onClick={handleSaveLocation}
                    disabled={isSaving}
                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-green-600 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="animate-spin h-2.5 w-2.5 border-2 border-current border-t-transparent rounded-full"></div>
                    ) : (
                      <CheckIcon className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    onClick={handleCancelLocation}
                    disabled={isSaving}
                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-destructive"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            <Select
              value={editedValue}
              onValueChange={(value) => {
                editedValues[fieldName] = value;
                if (fieldName === "nationality") {
                  editedValues.region = "";
                  editedValues.city = "";
                }
                if (fieldName === "region") {
                  editedValues.city = "";
                }
                onEditField(fieldName);
              }}
              disabled={isDisabled}
            >
              <SelectTrigger className="w-full text-xs h-8">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-xs"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      }

      return (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-[10px] font-medium text-muted-foreground">
              {label}
            </Label>
            <div className="flex gap-1">
              <button
                onClick={() => onSaveField(fieldName)}
                disabled={isSaving}
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-green-600 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="animate-spin h-2.5 w-2.5 border-2 border-current border-t-transparent rounded-full"></div>
                ) : (
                  <CheckIcon className="h-3 w-3" />
                )}
              </button>
              <button
                onClick={() => onCancelEditField(fieldName)}
                disabled={isSaving}
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-destructive"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </div>
          </div>
          {type === "select" && options ? (
            <Select
              value={editedValue}
              onValueChange={(value) => {
                editedValues[fieldName] = value;
                onEditField(fieldName);
              }}
            >
              <SelectTrigger className="w-full text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-xs"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : type === "textarea" ? (
            <textarea
              value={editedValue}
              onChange={(e) => {
                editedValues[fieldName] = e.target.value;
                onEditField(fieldName);
              }}
              className="w-full px-2 py-1.5 text-xs rounded-md border border-input bg-background focus:ring-2 focus:ring-ring focus:border-transparent resize-none min-h-[60px]"
            />
          ) : (
            <Input
              type={type}
              value={editedValue}
              onChange={(e) => {
                if (fieldName === "identificationNumber") {
                  handleRutChange(e.target.value);
                } else {
                  editedValues[fieldName] = e.target.value;
                  onEditField(fieldName);
                }
              }}
              className={`text-xs h-8 ${error ? "border-destructive" : ""}`}
            />
          )}
          {error && (
            <p className="text-[10px] text-destructive mt-0.5 font-medium">
              {error}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <Label className="text-[10px] font-medium text-muted-foreground">
            {label}
          </Label>
          <button
            onClick={() => onEditField(fieldName)}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground"
          >
            <PencilIcon className="h-3 w-3" />
          </button>
        </div>
        <div className="px-2 py-1.5 rounded-md bg-muted text-xs text-foreground">
          {type === "date" && value ? (
            formatDate(value)
          ) : fieldName === "gender" ? (
            value === "male" ? (
              "Masculino"
            ) : value === "female" ? (
              "Femenino"
            ) : value === "other" ? (
              "Otro"
            ) : (
              "Sin datos"
            )
          ) : fieldName === "status" ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${value === "active" ? "bg-green-500" : "bg-red-500"}`}
              ></span>
              {value === "active" ? "Activo" : "Inactivo"}
            </span>
          ) : (
            value || "Sin datos"
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
        style={{ animation: "fadeIn 0.2s ease-out" }}
      ></div>

      <div
        className="fixed right-0 top-0 h-full w-full sm:w-[480px] lg:w-[520px] bg-background shadow-2xl z-50 flex flex-col border-l border-border"
        style={{
          animation: "slideInRight 0.3s ease-out",
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 flex-shrink-0">
              <UserIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-foreground truncate">
                {guest?.fullName}
              </h2>
              <p className="text-[10px] text-muted-foreground font-mono">
                {guest?.identificationNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground transition-colors flex-shrink-0 ml-2"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-xs text-muted-foreground">Cargando...</p>
              </div>
            </div>
          ) : guestProfile ? (
            <div className="p-4">
              {!isEditMode ? (
                <>
                  <div className="flex gap-1 mb-4 border-b border-border">
                    <button
                      onClick={() => onTabChange("profile")}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${activeTab === "profile" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                    >
                      <UserIcon className="h-3.5 w-3.5" /> Datos
                    </button>
                    <button
                      onClick={() => onTabChange("stats")}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${activeTab === "stats" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                    >
                      <ChartBarIcon className="h-3.5 w-3.5" /> Estadísticas
                    </button>
                    <button
                      onClick={() => onTabChange("reservations")}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${activeTab === "reservations" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                    >
                      <CalendarIcon className="h-3.5 w-3.5" /> Historial
                    </button>
                  </div>

                  {activeTab === "profile" && (
                    <div className="space-y-3">
                      <div className="bg-card rounded-lg border border-border p-3">
                        <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                          <IdentificationIcon className="h-3.5 w-3.5 text-primary" />
                          Datos Personales
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                          <InfoField
                            label="Nombre"
                            value={guestProfile.firstName}
                            icon={<UserIcon className="h-3 w-3" />}
                          />
                          <InfoField
                            label="Apellido Paterno"
                            value={guestProfile.paternalLastName}
                            icon={<UserIcon className="h-3 w-3" />}
                          />
                          <InfoField
                            label="Apellido Materno"
                            value={guestProfile.maternalLastName}
                            icon={<UserIcon className="h-3 w-3" />}
                          />
                          <InfoField
                            label="RUT/Pasaporte"
                            value={guestProfile.identificationNumber}
                            icon={<IdentificationIcon className="h-3 w-3" />}
                          />
                          <InfoField
                            label="Género"
                            value={
                              guestProfile.gender === "male"
                                ? "Masculino"
                                : guestProfile.gender === "female"
                                  ? "Femenino"
                                  : guestProfile.gender === "other"
                                    ? "Otro"
                                    : "Sin datos"
                            }
                            icon={<UserIcon className="h-3 w-3" />}
                          />
                          <InfoField
                            label="Fecha de Nacimiento"
                            value={
                              guestProfile.birthDate
                                ? formatDate(guestProfile.birthDate)
                                : "Sin datos"
                            }
                            icon={<CakeIcon className="h-3 w-3" />}
                          />
                        </div>
                        {guestProfile.birthDate &&
                          calculateAge(guestProfile.birthDate) && (
                            <div className="flex items-center gap-2 py-2 px-2.5 rounded-md bg-primary/10 border border-primary/20 mt-2">
                              <CakeIcon className="h-4 w-4 text-primary flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-[10px] font-medium text-primary/80 mb-0">
                                  {" "}
                                  Edad{" "}
                                </p>
                                <p className="text-sm font-bold text-primary">
                                  {" "}
                                  {calculateAge(guestProfile.birthDate)}{" "}
                                  años{" "}
                                </p>
                              </div>
                            </div>
                          )}
                        <div className="mt-2 pt-2 border-t border-border">
                          <InfoField
                            label="Fecha de Registro"
                            value={
                              guestProfile.registrationDate
                                ? formatDate(guestProfile.registrationDate)
                                : "Sin datos"
                            }
                            icon={<CalendarIcon className="h-3 w-3" />}
                          />
                        </div>
                      </div>
                      <div className="bg-card rounded-lg border border-border p-3">
                        <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                          <MapPinIcon className="h-3.5 w-3.5 text-primary" />
                          Contacto y Ubicación
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                          <InfoField
                            label="Email"
                            value={guestProfile.email}
                            icon={<EnvelopeIcon className="h-3 w-3" />}
                          />
                          <InfoField
                            label="Teléfono"
                            value={guestProfile.phone}
                            icon={<PhoneIcon className="h-3 w-3" />}
                          />
                        </div>
                        <div className="border-t border-border my-2"></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                          <InfoField
                            label="País"
                            value={guestProfile.nationality}
                            icon={<HomeIcon className="h-3 w-3" />}
                          />
                          <InfoField
                            label="Región"
                            value={guestProfile.region}
                            icon={<MapPinIcon className="h-3 w-3" />}
                          />
                          <div className="col-span-1 sm:col-span-2">
                            <InfoField
                              label="Ciudad"
                              value={guestProfile.city}
                              icon={<MapPinIcon className="h-3 w-3" />}
                            />
                          </div>
                        </div>
                        <div className="border-t border-border my-2"></div>
                        <div className="space-y-0">
                          <InfoField
                            label="Solicitudes Especiales"
                            value={guestProfile.specialRequests}
                          />
                          <InfoField
                            label="Observaciones"
                            value={
                              guestProfile.observations || "Sin observaciones"
                            }
                          />
                        </div>
                      </div>
                      <div className="bg-card rounded-lg border border-border p-3">
                        <h3 className="text-xs font-semibold text-foreground mb-2">
                          {" "}
                          Estado{" "}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${guestProfile.status === "active" ? "bg-green-500" : "bg-red-500"}`}
                          ></span>
                          <span className="text-xs font-medium text-foreground">
                            {" "}
                            {guestProfile.status === "active"
                              ? "Activo"
                              : "Inactivo"}{" "}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === "stats" && (
                    <div className="space-y-3">
                      <div className="bg-card rounded-lg border border-border p-3">
                        <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                          <ChartBarIcon className="h-3.5 w-3.5 text-primary" />
                          Estadísticas de Reservas
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="text-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {guestProfile.stats.totalReservations}
                            </p>
                            <p className="text-[9px] font-medium text-blue-600/80 dark:text-blue-400/80 mt-0.5 leading-tight">
                              Total
                            </p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                              {guestProfile.stats.completedReservations}
                            </p>
                            <p className="text-[9px] font-medium text-green-600/80 dark:text-green-400/80 mt-0.5 leading-tight">
                              Completas
                            </p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                            <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                              {(guestProfile.stats.pendingReservations || 0) +
                                (guestProfile.stats.inProgressReservations ||
                                  0)}
                            </p>
                            <p className="text-[9px] font-medium text-yellow-600/80 dark:text-yellow-400/80 mt-0.5 leading-tight">
                              Activas
                            </p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                            <p className="text-lg font-bold text-red-600 dark:text-red-400">
                              {guestProfile.stats.canceledReservations || 0}
                            </p>
                            <p className="text-[9px] font-medium text-red-600/80 dark:text-red-400/80 mt-0.5 leading-tight">
                              Canceladas
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-card rounded-lg border border-border p-3">
                        <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                          <CurrencyDollarIcon className="h-3.5 w-3.5 text-primary" />
                          Información Financiera
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-center p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <CurrencyDollarIcon className="h-5 w-5 mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
                            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                              $
                              {(
                                guestProfile.stats.completedPaidAmount || 0
                              ).toLocaleString("es-CL")}
                            </p>
                            <p className="text-[9px] font-medium text-emerald-600/80 dark:text-emerald-400/80 leading-tight">
                              Total Cobrado
                            </p>
                          </div>
                          <div className="text-center p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                            <CurrencyDollarIcon className="h-5 w-5 mx-auto text-orange-600 dark:text-orange-400 mb-1" />
                            <p className="text-base font-bold text-orange-600 dark:text-orange-400 mb-0.5">
                              $
                              {(
                                guestProfile.stats.activePendingAmount || 0
                              ).toLocaleString("es-CL")}
                            </p>
                            <p className="text-[9px] font-medium text-orange-600/80 dark:text-orange-400/80 leading-tight">
                              Saldo Pendiente
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "reservations" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-foreground">
                          Historial de Reservas
                        </h3>
                        <Button
                          onClick={() =>
                            onViewFullHistory(guest?.identificationNumber)
                          }
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-7"
                        >
                          Ver Completo
                        </Button>
                      </div>

                      {reservationsLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                          <p className="text-xs text-muted-foreground">
                            Cargando...
                          </p>
                        </div>
                      ) : sortedReservations.length > 0 ? (
                        <div className="space-y-2">
                          {sortedReservations.map((reservation) => (
                            <div
                              key={reservation.id}
                              className="bg-card rounded-lg border border-border p-2.5 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                  <Badge
                                    variant={getStatusVariant(
                                      reservation.status
                                    )}
                                    className="text-[10px] py-0 px-1.5"
                                  >
                                    {statusTranslations[reservation.status] ||
                                      reservation.status}
                                  </Badge>
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {reservation.code}
                                  </span>
                                </div>
                                {reservation.status === "completed" && (
                                  <Button
                                    onClick={() =>
                                      onViewFullHistory(null, reservation.code)
                                    }
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-6 px-2 text-primary hover:bg-primary/10"
                                  >
                                    Ver
                                  </Button>
                                )}
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                <div>
                                  <p className="text-[10px] text-muted-foreground mb-0.5">
                                    Fechas
                                  </p>
                                  <p className="text-[10px] font-medium text-foreground">
                                    {formatDate(reservation.checkInDate)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground mb-0.5">
                                    Total
                                  </p>
                                  <p className="text-xs font-semibold text-foreground">
                                    $
                                    {(
                                      reservation.totalAmount || 0
                                    ).toLocaleString("es-CL")}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground mb-0.5">
                                    Huéspedes
                                  </p>
                                  <p className="text-xs text-foreground">
                                    {reservation.guestCount}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/40 mb-2" />
                          <p className="text-xs text-muted-foreground">
                            Sin reservas
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="bg-card rounded-lg border border-border p-3">
                    <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <IdentificationIcon className="h-3.5 w-3.5 text-primary" />
                      Datos Personales
                    </h3>
                    <EditField
                      fieldName="firstName"
                      label="Nombre"
                      value={guestProfile.firstName}
                    />
                    <EditField
                      fieldName="paternalLastName"
                      label="Apellido Paterno"
                      value={guestProfile.paternalLastName}
                    />
                    <EditField
                      fieldName="maternalLastName"
                      label="Apellido Materno"
                      value={guestProfile.maternalLastName}
                    />
                    <EditField
                      fieldName="identificationNumber"
                      label="RUT/Pasaporte"
                      value={guestProfile.identificationNumber}
                    />
                    <EditField
                      fieldName="gender"
                      label="Género"
                      value={guestProfile.gender}
                      type="select"
                      options={[
                        { value: "male", label: "Masculino" },
                        { value: "female", label: "Femenino" },
                        { value: "other", label: "Otro" },
                      ]}
                    />
                    <EditField
                      fieldName="birthDate"
                      label="Fecha de Nacimiento"
                      value={guestProfile.birthDate}
                      type="date"
                    />
                    <EditField
                      fieldName="registrationDate"
                      label="Fecha de Registro"
                      value={guestProfile.registrationDate}
                      type="date"
                      readonly={true}
                    />
                  </div>

                  <div className="bg-card rounded-lg border border-border p-3">
                    <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <MapPinIcon className="h-3.5 w-3.5 text-primary" />
                      Contacto y Ubicación
                    </h3>
                    <EditField
                      fieldName="email"
                      label="Email"
                      value={guestProfile.email}
                      type="email"
                    />
                    <EditField
                      fieldName="phoneNumber"
                      label="Teléfono"
                      value={guestProfile.phone}
                      type="tel"
                    />
                    <div className="border-t border-border my-2"></div>

                    <EditField
                      fieldName="nationality"
                      label="País"
                      value={guestProfile.nationality}
                    />
                    <EditField
                      fieldName="region"
                      label="Región"
                      value={guestProfile.region}
                    />
                    <EditField
                      fieldName="city"
                      label="Ciudad"
                      value={guestProfile.city}
                    />

                    <div className="border-t border-border my-2"></div>
                    <EditField
                      fieldName="specialRequests"
                      label="Solicitudes Especiales"
                      value={guestProfile.specialRequests}
                      type="textarea"
                    />

                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-[10px] font-medium text-muted-foreground">
                          {" "}
                          Observaciones{" "}
                        </Label>
                        {!isEditingObservations &&
                        canEditField("observations") ? (
                          <button
                            onClick={onEditObservations}
                            className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground"
                          >
                            <PencilIcon className="h-3 w-3" />
                          </button>
                        ) : isEditingObservations ? (
                          <div className="flex gap-1">
                            <button
                              onClick={onSaveObservations}
                              disabled={savingObservations}
                              className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-green-600"
                            >
                              {savingObservations ? (
                                <div className="animate-spin h-2.5 w-2.5 border-2 border-current border-t-transparent rounded-full"></div>
                              ) : (
                                <CheckIcon className="h-3 w-3" />
                              )}
                            </button>
                            <button
                              onClick={onCancelEditObservations}
                              className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-destructive"
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </div>
                        ) : null}
                      </div>
                      {isEditingObservations ? (
                        <textarea
                          value={editedObservations}
                          onChange={(e) => {
                            onEditObservations(e.target.value);
                          }}
                          placeholder="Ingrese observaciones..."
                          className="w-full px-2 py-1.5 text-xs rounded-md border border-input bg-background focus:ring-2 focus:ring-ring focus:border-transparent resize-none min-h-[60px]"
                        />
                      ) : (
                        <div className="px-2 py-1.5 rounded-md bg-muted text-xs text-foreground whitespace-pre-wrap">
                          {guestProfile.observations || "Sin observaciones"}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-card rounded-lg border border-border p-3">
                    <h3 className="text-xs font-semibold text-foreground mb-2">
                      {" "}
                      Estado{" "}
                    </h3>
                    <EditField
                      fieldName="status"
                      label="Estado del Huésped"
                      value={guestProfile.status}
                      type="select"
                      options={[
                        { value: "active", label: "Activo" },
                        { value: "inactive", label: "Inactivo" },
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground text-xs">
                No se pudo cargar la información
              </p>
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
            }
            to {
              transform: translateX(0);
            }
          }
        `}
      </style>
    </>
  );
};

export default GuestProfileModal;
