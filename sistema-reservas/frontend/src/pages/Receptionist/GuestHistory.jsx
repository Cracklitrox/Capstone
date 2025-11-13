import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { guestHistoryService } from "@/services/guestHistory";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  validateRutFormat,
  validateRutDv,
  formatRutInput,
  cleanRut,
} from "@/lib/rutValidator";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

// Componentes UI
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import GuestProfileModal from "@/components/GuestProfileModal";
import CreateGuestForm from "@/components/CreateGuestForm";

// Iconos
import {
  MagnifyingGlassIcon,
  UserIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  EyeIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XCircleIcon,
  FunnelIcon,
  UserGroupIcon,
  ChartBarIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  IdentificationIcon,
  CakeIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";

const GuestHistory = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  // Función para verificar permisos
  const canEditField = (fieldName) => {
    if (!user || !user.role) return false;
    if (user.role === "administrator") {
      return fieldName !== "registrationDate";
    }
    if (user.role === "receptionist") {
      const editableFields = [
        "email",
        "phoneNumber",
        "nationality",
        "country",
        "region",
        "city",
        "specialRequests",
        "observations",
      ];
      return editableFields.includes(fieldName);
    }
    return false;
  };

  const canDelete = () => {
    return user?.role === "administrator";
  };

  // Estados principales
  const [guests, setGuests] = useState([]);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [guestProfile, setGuestProfile] = useState(null);
  const [guestReservations, setGuestReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados para búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [guestsMeta, setGuestsMeta] = useState({ page: 1, totalPages: 1 });

  // Debounce search term (500ms delay) para reducir llamadas API innecesarias
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  // Estados para filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    hasReservations: "all",
  });

  // Estados para modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditMode, setIsEditMode] = useState(false);

  // Estados para edición
  const [editingStates, setEditingStates] = useState({});
  const [editedValues, setEditedValues] = useState({});
  const [savingStates, setSavingStates] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  // Estados para observaciones
  const [isEditingObservations, setIsEditingObservations] = useState(false);
  const [editedObservations, setEditedObservations] = useState("");
  const [savingObservations, setSavingObservations] = useState(false);

  // Estados para reservas
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationsMeta, setReservationsMeta] = useState({
    page: 1,
    totalPages: 1,
  });

  // Estado para confirmación de eliminación
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingGuest, setDeletingGuest] = useState(null);

  // Estado para modal de crear huésped
  const [isCreateGuestModalOpen, setIsCreateGuestModalOpen] = useState(false);

  // Funciones de utilidad
  const calculateAge = (birthDate) => {
    if (!birthDate) return "Sin datos";
    try {
      const birth = parseISO(birthDate);
      const now = new Date();
      const years = Math.floor((now - birth) / (365.25 * 24 * 60 * 60 * 1000));
      return `${years} años`;
    } catch (error) {
      return "Sin datos";
    }
  };

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

  // Buscar huéspedes (debounced para reducir llamadas API)
  const searchGuests = useCallback(
    async (page = 1) => {
      if (!token) return;

      setSearchLoading(true);
      setError(null);

      try {
        const response = await guestHistoryService.searchAllGuests(
          debouncedSearchTerm,
          page,
          20
        );

        let filteredGuests = response.data || [];

        if (filters.status !== "all") {
          filteredGuests = filteredGuests.filter(
            (g) => g.status === filters.status
          );
        }

        if (filters.hasReservations === "yes") {
          filteredGuests = filteredGuests.filter(
            (g) => g.totalReservations > 0
          );
        } else if (filters.hasReservations === "no") {
          filteredGuests = filteredGuests.filter(
            (g) => g.totalReservations === 0
          );
        }

        setGuests(filteredGuests);
        setGuestsMeta(response.meta || { page: 1, totalPages: 1 });
      } catch (err) {
        setError(err.message);
        setGuests([]);
        toast.error(err.message);
      } finally {
        setSearchLoading(false);
      }
    },
    [token, debouncedSearchTerm, filters]
  );

  // Cargar perfil
  const loadGuestProfile = async (guestId) => {
    setLoading(true);
    try {
      const response = await guestHistoryService.getGuestProfile(guestId);
      if (response.found) {
        setGuestProfile(response.profile);
      } else {
        setError("Huésped no encontrado");
        toast.error("Huésped no encontrado");
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar reservas
  const loadGuestReservations = async (guestId, page = 1) => {
    setReservationsLoading(true);
    try {
      const response = await guestHistoryService.getGuestReservations(guestId, {
        page,
        limit: 10,
      });
      setGuestReservations(response.data || []);
      setReservationsMeta(response.meta || { page: 1, totalPages: 1 });
    } catch (err) {
      setError(err.message);
      setGuestReservations([]);
      toast.error(err.message);
    } finally {
      setReservationsLoading(false);
    }
  };

  // Ver huésped
  const handleViewGuest = async (guest) => {
    setSelectedGuest(guest);
    setIsModalOpen(true);
    setActiveTab("profile");
    setIsEditMode(false);
    await loadGuestProfile(guest.id);
    await loadGuestReservations(guest.id);
    setEditedObservations("");
    setIsEditingObservations(false);
  };

  // Editar huésped
  const handleEditGuest = async (guest) => {
    setSelectedGuest(guest);
    setIsModalOpen(true);
    setActiveTab("profile");
    setIsEditMode(true);
    await loadGuestProfile(guest.id);
    setEditedObservations("");
    setIsEditingObservations(false);
  };

  // Ver historial completo
  const handleViewFullHistory = (
    identificationNumber,
    reservationCode = null
  ) => {
    if (reservationCode) {
      navigate(`/history?reservation=${reservationCode}`);
    } else {
      navigate(`/history?guest=${encodeURIComponent(identificationNumber)}`);
    }
  };

  // Eliminar huésped
  const handleDeleteGuest = (guest) => {
    setDeletingGuest(guest);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingGuest) return;
    try {
      await guestHistoryService.deleteGuest(deletingGuest.id);
      toast.success("Huésped eliminado correctamente");
      setDeleteConfirmOpen(false);
      setDeletingGuest(null);
      searchGuests(guestsMeta.page);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Handler para crear huésped exitosamente
  const handleGuestCreated = (newGuest) => {
    // Refrescar la lista de huéspedes
    searchGuests(1);
  };

  // Manejo de observaciones
  const handleEditObservations = () => {
    setEditedObservations(guestProfile?.observations || "");
    setIsEditingObservations(true);
  };

  const handleCancelEditObservations = () => {
    setIsEditingObservations(false);
    setEditedObservations("");
  };

  const handleSaveObservations = async () => {
    if (!selectedGuest) return;
    setSavingObservations(true);
    try {
      await guestHistoryService.updateGuestObservations(
        selectedGuest.id,
        editedObservations
      );
      setGuestProfile((prev) => ({
        ...prev,
        observations: editedObservations,
      }));
      setIsEditingObservations(false);
      setError(null);
      toast.success("Observaciones actualizadas");
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSavingObservations(false);
    }
  };

  // Funciones de edición de campos
  const handleEditField = (fieldName) => {
    if (!guestProfile) return;
    let currentValue = "";
    switch (fieldName) {
      case "firstName":
        currentValue = guestProfile.firstName || "";
        break;
      case "paternalLastName":
        currentValue = guestProfile.paternalLastName || "";
        break;
      case "maternalLastName":
        currentValue = guestProfile.maternalLastName || "";
        break;
      case "identificationNumber":
        currentValue = guestProfile.identificationNumber || "";
        break;
      case "email":
        currentValue = guestProfile.email || "";
        break;
      case "phoneNumber":
        currentValue = guestProfile.phone || "";
        break;
      case "gender":
        currentValue = guestProfile.gender || "";
        break;
      case "birthDate":
        currentValue = guestProfile.birthDate
          ? guestProfile.birthDate.split("T")[0]
          : "";
        break;
      case "nationality":
      case "country":
        currentValue = guestProfile.nationality || "";
        break;
      case "region":
        currentValue = guestProfile.region || "";
        break;
      case "city":
        currentValue = guestProfile.city || "";
        break;
      case "specialRequests":
        currentValue = guestProfile.specialRequests || "";
        break;
      case "status":
        currentValue = guestProfile.status || "";
        break;
      default:
        currentValue = "";
    }

    setEditedValues((prev) => ({ ...prev, [fieldName]: currentValue }));
    setEditingStates((prev) => ({ ...prev, [fieldName]: true }));
    setFieldErrors((prev) => ({ ...prev, [fieldName]: null }));
  };

  const handleCancelEditField = (fieldName) => {
    setEditingStates((prev) => ({ ...prev, [fieldName]: false }));
    setEditedValues((prev) => ({ ...prev, [fieldName]: "" }));
    setFieldErrors((prev) => ({ ...prev, [fieldName]: null }));
  };

  const validateField = (fieldName, value) => {
    switch (fieldName) {
      case "identificationNumber":
        if (!value) return "RUT es obligatorio";
        const cleaned = cleanRut(value);
        const rutPart = cleaned.slice(0, -1);
        const dvPart = cleaned.slice(-1);
        if (!validateRutFormat(rutPart) || !validateRutDv(rutPart, dvPart)) {
          return "RUT ingresado erróneo";
        }
        break;
      case "firstName":
        if (!value) return "Nombre es obligatorio";
        if (value.length < 2) return "Nombre debe tener al menos 2 caracteres";
        break;
      case "paternalLastName":
        if (!value) return "Apellido paterno es obligatorio";
        if (value.length < 2)
          return "Apellido debe tener al menos 2 caracteres";
        break;
      case "email":
        if (!value) return "Email es obligatorio";
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) return "Email inválido";
        break;
      case "phoneNumber":
        if (value && !/^\+?[\d\s()-]{8,15}$/.test(value))
          return "Teléfono inválido";
        break;
      case "birthDate":
        if (value) {
          const birthDate = new Date(value);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          if (age < 18) return "El huésped debe ser mayor de edad (18+)";
        }
        break;
    }
    return null;
  };

  const handleSaveField = async (fieldName) => {
    if (!selectedGuest || savingStates[fieldName]) return;

    const value = editedValues[fieldName];
    const error = validateField(fieldName, value);

    if (error) {
      setFieldErrors((prev) => ({ ...prev, [fieldName]: error }));
      return;
    }

    setSavingStates((prev) => ({ ...prev, [fieldName]: true }));

    try {
      const updateData = { [fieldName]: value };
      await guestHistoryService.updateGuestProfile(
        selectedGuest.id,
        updateData
      );

      setGuestProfile((prev) => {
        const updated = { ...prev };
        switch (fieldName) {
          case "firstName":
            updated.firstName = value;
            updated.fullName = `${value} ${updated.paternalLastName}${updated.maternalLastName ? ` ${updated.maternalLastName}` : ""}`;
            break;
          case "paternalLastName":
            updated.paternalLastName = value;
            updated.fullName = `${updated.firstName} ${value}${updated.maternalLastName ? ` ${updated.maternalLastName}` : ""}`;
            break;
          case "maternalLastName":
            updated.maternalLastName = value;
            updated.fullName = `${updated.firstName} ${updated.paternalLastName}${value ? ` ${value}` : ""}`;
            break;
          case "phoneNumber":
            updated.phone = value;
            break;
          case "nationality":
          case "country":
            updated.nationality = value;
            break;
          default:
            updated[fieldName] = value;
        }
        return updated;
      });

      setEditingStates((prev) => ({ ...prev, [fieldName]: false }));
      setFieldErrors((prev) => ({ ...prev, [fieldName]: undefined }));
      setError(null);
      toast.success("Campo actualizado correctamente");
    } catch (err) {
      let errorMessage = err.message;
      if (err.response?.status === 429) {
        errorMessage = "Demasiadas peticiones. Espera unos segundos.";
      }
      setFieldErrors((prev) => ({ ...prev, [fieldName]: errorMessage }));
      toast.error(errorMessage);
    } finally {
      setSavingStates((prev) => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleRutChange = (value) => {
    const formatted = formatRutInput(value);
    setEditedValues((prev) => ({ ...prev, identificationNumber: formatted }));
  };

  // Render de campo editable
  const renderEditableField = (
    fieldName,
    label,
    value,
    type = "text",
    options = null,
    readonly = false
  ) => {
    const isEditing = editingStates[fieldName];
    const isSaving = savingStates[fieldName];
    const error = fieldErrors[fieldName];
    const editedValue = editedValues[fieldName];
    const hasEditPermission = canEditField(fieldName);

    if (readonly || fieldName === "registrationDate" || !hasEditPermission) {
      return (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <div className="font-medium text-sm">
            {type === "date" && value ? formatDate(value) : formatData(value)}
          </div>
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSaveField(fieldName)}
                disabled={isSaving}
                className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
              >
                {isSaving ? (
                  <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full"></div>
                ) : (
                  <CheckIcon className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancelEditField(fieldName)}
                disabled={isSaving}
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
              >
                <XCircleIcon className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {type === "select" && options ? (
            <select
              value={editedValue}
              onChange={(e) =>
                setEditedValues((prev) => ({
                  ...prev,
                  [fieldName]: e.target.value,
                }))
              }
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : type === "textarea" ? (
            <textarea
              value={editedValue}
              onChange={(e) =>
                setEditedValues((prev) => ({
                  ...prev,
                  [fieldName]: e.target.value,
                }))
              }
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          ) : (
            <Input
              type={type}
              value={editedValue}
              onChange={(e) => {
                if (fieldName === "identificationNumber") {
                  handleRutChange(e.target.value);
                } else {
                  setEditedValues((prev) => ({
                    ...prev,
                    [fieldName]: e.target.value,
                  }));
                }
              }}
              className={error ? "border-destructive" : ""}
            />
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditField(fieldName)}
            className="h-6 w-6 p-0 hover:bg-accent"
          >
            <PencilIcon className="h-3 w-3" />
          </Button>
        </div>
        <div className="font-medium text-sm">
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
              formatData(value)
            )
          ) : fieldName === "status" ? (
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${value === "active" ? "bg-green-500" : "bg-red-500"}`}
              ></div>
              {value === "active"
                ? "Activo"
                : value === "inactive"
                  ? "Inactivo"
                  : formatData(value)}
            </div>
          ) : (
            formatData(value)
          )}
        </div>
      </div>
    );
  };

  // Efectos
  useEffect(() => {
    const timer = setTimeout(() => {
      searchGuests(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchGuests]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Huéspedes</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona la información de los huéspedes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-2">
              <UserGroupIcon className="h-4 w-4" />
              {guestsMeta.totalCount || guests.length} huéspedes
            </Badge>
            <Button
              onClick={() => setIsCreateGuestModalOpen(true)}
              className="flex items-center gap-2"
            >
              <PlusCircleIcon className="h-4 w-4" />
              Nuevo Huésped
            </Button>
          </div>
        </div>

        {/* Panel de búsqueda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MagnifyingGlassIcon className="h-5 w-5" />
              Buscar Huésped
            </CardTitle>
            <CardDescription>
              Busca por RUT, pasaporte, nombre o email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Ingresa RUT, nombre, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <FunnelIcon className="h-4 w-4" />
                  Filtros
                </Button>
                <Button
                  onClick={() => searchGuests(1)}
                  disabled={searchLoading}
                  className="min-w-[100px]"
                >
                  {searchLoading ? "Buscando..." : "Buscar"}
                </Button>
              </div>
            </div>

            {/* Filtros */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(val) =>
                      setFilters((prev) => ({ ...prev, status: val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Con reservas</Label>
                  <Select
                    value={filters.hasReservations}
                    onValueChange={(val) =>
                      setFilters((prev) => ({ ...prev, hasReservations: val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="yes">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resultados */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {searchLoading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground py-8">
                Buscando huéspedes...
              </p>
            </CardContent>
          </Card>
        ) : guests.length > 0 ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {guests.map((guest) => (
                <Card
                  key={guest.id}
                  className="hover:shadow-lg transition-shadow duration-200"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">
                          {guest.fullName}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          {guest.identificationNumber}
                        </p>
                      </div>
                      <Badge
                        className={
                          guest.status === "active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 ml-2"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300 ml-2"
                        }
                      >
                        {guest.status === "active" ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <EnvelopeIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{guest.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <PhoneIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {guest.phone || "Sin teléfono"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                        <span>
                          Registro:{" "}
                          {guest.createdAt
                            ? formatDate(guest.createdAt)
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4 text-primary" />
                          <span className="text-xs">
                            <span className="font-semibold">
                              {guest.totalReservations}
                            </span>{" "}
                            reserva{guest.totalReservations !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewGuest(guest)}
                        className="flex-1"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Ver más
                      </Button>
                      {canEditField("firstName") && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleEditGuest(guest)}
                          aria-label="Editar huésped"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete() && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteGuest(guest)}
                          aria-label="Eliminar huésped"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Paginación */}
            {guestsMeta.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!guestsMeta.hasPrevPage}
                  onClick={() => searchGuests(guestsMeta.page - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Página {guestsMeta.page} de {guestsMeta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!guestsMeta.hasNextPage}
                  onClick={() => searchGuests(guestsMeta.page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </>
        ) : searchTerm && !searchLoading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground py-8">
                No se encontraron huéspedes con el término "{searchTerm}"
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Modal de perfil */}
        <GuestProfileModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          guest={selectedGuest}
          guestProfile={guestProfile}
          guestReservations={guestReservations}
          loading={loading}
          isEditMode={isEditMode}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onEditField={handleEditField}
          onSaveField={handleSaveField}
          onCancelEditField={handleCancelEditField}
          editingStates={editingStates}
          editedValues={editedValues}
          savingStates={savingStates}
          fieldErrors={fieldErrors}
          onEditObservations={handleEditObservations}
          onSaveObservations={handleSaveObservations}
          onCancelEditObservations={handleCancelEditObservations}
          isEditingObservations={isEditingObservations}
          editedObservations={editedObservations}
          savingObservations={savingObservations}
          onViewFullHistory={handleViewFullHistory}
          reservationsLoading={reservationsLoading}
          canEditField={canEditField}
          handleRutChange={handleRutChange}
        />

        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Eliminación</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar al huésped{" "}
                {deletingGuest?.fullName}? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de crear huésped */}
        <CreateGuestForm
          isOpen={isCreateGuestModalOpen}
          onClose={() => setIsCreateGuestModalOpen(false)}
          onSuccess={handleGuestCreated}
          isMainGuest={true}
        />
      </div>
    </div>
  );
};

export default GuestHistory;
