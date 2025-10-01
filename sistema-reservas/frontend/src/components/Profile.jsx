import React, { useEffect, useState, useMemo } from "react";
import { Country, State, City } from "country-state-city";
import axios from "axios";
import {
  IdentificationIcon,
  PhoneIcon,
  UsersIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  ChartBarIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  HomeIcon,
  CalendarDaysIcon,
  WrenchScrewdriverIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  UserPlusIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { LocationCombobox } from "@/components/LocationCombobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { authService } from "@/services/services";
import { profileService } from "@/services/profileService";
import { formatActivity } from "@/lib/activityFormatter";
import { useAuth } from "@/services/authContext";
import { toast } from "sonner";

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "",
    paternal_last_name: "",
    maternal_last_name: "",
    email: "",
    phone_number: "",
    gender: "",
    country: "",
    region: "",
    city: "",
  });
  const [formErrors, setFormErrors] = useState({});

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordFormErrors, setPasswordFormErrors] = useState({});

  const [loginHistory, setLoginHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  const [activityLog, setActivityLog] = useState([]);
  const [isActivityLoading, setIsActivityLoading] = useState(true);

  const [preferences, setPreferences] = useState({
    defaultTheme: "system",
    defaultDashboard: null,
  });
  const [isPreferencesLoading, setIsPreferencesLoading] = useState(true);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("No se encontró token.");
          return;
        }
        const response = await axios.get(
          "http://localhost:3001/api/v1/auth/profile",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = response.data;
        setProfile(data);

        const countryData = Country.getAllCountries().find(
          (c) => c.name === data.country
        );
        const stateData = countryData
          ? State.getStatesOfCountry(countryData.isoCode).find(
              (s) => s.name === data.region
            )
          : null;

        setFormData({
          first_name: data.first_name || "",
          paternal_last_name: data.paternal_last_name || "",
          maternal_last_name: data.maternal_last_name || "",
          email: data.email || "",
          phone_number: data.phone_number || "",
          gender: data.gender || "",
          country: countryData?.isoCode || "",
          region: stateData?.isoCode || "",
          city: data.city || "",
        });
      } catch (err) {
        console.error("Error al obtener perfil:", err);
        setError("Error al obtener perfil. ¿Token expirado?");
      }
    };
    fetchProfile();

    const fetchLoginHistory = async () => {
      try {
        setIsHistoryLoading(true);
        const historyData = await authService.getLoginHistory();
        setLoginHistory(historyData);
      } catch (err) {
        console.error("Error al obtener historial de login:", err);
        toast.error("No se pudo cargar el historial de inicios de sesión.");
      } finally {
        setIsHistoryLoading(false);
      }
    };
    fetchLoginHistory();

    const fetchActivity = async () => {
      try {
        setIsActivityLoading(true);
        const activityData = await profileService.getMyActivity(15);
        setActivityLog(activityData);
      } catch (err) {
        console.error("Error al obtener actividad:", err);
        toast.error("No se pudo cargar la actividad reciente.");
      } finally {
        setIsActivityLoading(false);
      }
    };
    fetchActivity();

    const fetchPreferences = async () => {
      try {
        setIsPreferencesLoading(true);
        const prefs = await profileService.getMyPreferences();
        setPreferences(prefs);
      } catch (err) {
        console.error("Error al obtener preferencias:", err);
        toast.error("No se pudieron cargar las preferencias.");
      } finally {
        setIsPreferencesLoading(false);
      }
    };
    fetchPreferences();
  }, []);

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

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const countryName =
        countries.find((c) => c.value === formData.country)?.label || "";
      const stateName =
        states.find((s) => s.value === formData.region)?.label || "";
      const payload = { ...formData, country: countryName, region: stateName };

      const response = await axios.put(
        "http://localhost:3001/api/v1/auth/profile",
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setProfile(response.data);
      setIsModalOpen(false);
      toast.success("Datos actualizados correctamente");
    } catch (err) {
      console.error("Error al actualizar perfil:", err.response);
      setFormErrors({
        general: err.response?.data?.message || "Error del servidor.",
      });
    }
  };

  const handlePasswordFormChange = (e) => {
    const { name, value } = e.target;
    setPasswordFormData((prev) => ({ ...prev, [name]: value }));
    if (passwordFormErrors[name]) {
      setPasswordFormErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (passwordFormErrors.general) {
      setPasswordFormErrors((prev) => ({ ...prev, general: null }));
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordFormErrors({});

    if (passwordFormData.newPassword.length < 8) {
      setPasswordFormErrors({
        newPassword: "La nueva contraseña debe tener al menos 8 caracteres.",
      });
      return;
    }
    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      setPasswordFormErrors({
        confirmPassword: "Las contraseñas no coinciden.",
      });
      return;
    }

    try {
      const response = await authService.changePassword(passwordFormData);
      setIsPasswordModalOpen(false);
      setPasswordFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success(response.message || "Contraseña actualizada con éxito.");
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Error del servidor.";
      console.error("Error al cambiar contraseña:", err.response);
      if (errorMessage.includes("actual es incorrecta")) {
        setPasswordFormErrors({ currentPassword: errorMessage });
      } else {
        setPasswordFormErrors({ general: errorMessage });
      }
    }
  };

  const handlePreferencesChange = (field, value) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
  };

  const handleSavePreferences = async () => {
    try {
      setIsSavingPreferences(true);
      await profileService.updateMyPreferences(preferences);
      toast.success("Preferencias guardadas correctamente");
    } catch (err) {
      console.error("Error al guardar preferencias:", err);
      toast.error("No se pudieron guardar las preferencias.");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const getActivityIcon = (action) => {
    const iconMap = {
      UPDATE_ROOM_STATUS: HomeIcon,
      CREATE_RESERVATION: CalendarDaysIcon,
      CREATE_MAINTENANCE: WrenchScrewdriverIcon,
      CREATE_CLEANING: SparklesIcon,
      CREATE_PAYMENT: CurrencyDollarIcon,
      CREATE_USER: UserPlusIcon,
      CHANGE_PASSWORD: LockClosedIcon,
    };
    return iconMap[action] || CheckCircleIcon;
  };

  if (error)
    return (
      <div className="flex justify-center items-center h-full text-destructive">
        {error}
      </div>
    );
  if (!profile)
    return (
      <div className="flex justify-center items-center h-full text-muted-foreground">
        Cargando perfil...
      </div>
    );

  const fullName = [
    profile.first_name,
    profile.paternal_last_name,
    profile.maternal_last_name,
  ]
    .filter(Boolean)
    .join(" ");
  const checkEmpty = (value) =>
    value || <span className="text-muted-foreground">Sin datos</span>;
  const translateGender = (gender) =>
    ({ male: "Hombre", female: "Mujer", other: "Otro" })[gender] ||
    checkEmpty();

  return (
    <main className="flex flex-1 flex-col items-center p-4 sm:p-6 lg:p-8">
      <Tabs defaultValue="personal" className="w-full max-w-2xl">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="personal">Info. Personal</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          <TabsTrigger value="preferences">Preferencias</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <Card className="animate-fade-in">
              <CardHeader className="items-center text-center">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-4xl font-bold text-primary mb-4">
                  {profile.first_name?.charAt(0)}
                </div>
                <CardTitle className="text-3xl">{fullName}</CardTitle>
                <CardDescription>{profile.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 text-sm border-t pt-6">
                  <li className="flex items-center">
                    <IdentificationIcon className="h-5 w-5 text-muted-foreground mr-3" />
                    <span className="font-medium text-muted-foreground">
                      RUT:
                    </span>
                    <span className="ml-auto font-mono">
                      {checkEmpty(profile.rut)}
                    </span>
                  </li>
                  <li className="flex items-center">
                    <PhoneIcon className="h-5 w-5 text-muted-foreground mr-3" />
                    <span className="font-medium text-muted-foreground">
                      Teléfono:
                    </span>
                    <span className="ml-auto">
                      {checkEmpty(profile.phone_number)}
                    </span>
                  </li>
                  <li className="flex items-center">
                    <UsersIcon className="h-5 w-5 text-muted-foreground mr-3" />
                    <span className="font-medium text-muted-foreground">
                      Género:
                    </span>
                    <span className="ml-auto">
                      {translateGender(profile.gender)}
                    </span>
                  </li>
                  <li className="flex items-center">
                    <GlobeAltIcon className="h-5 w-5 text-muted-foreground mr-3" />
                    <span className="font-medium text-muted-foreground">
                      Ubicación:
                    </span>
                    <span className="ml-auto text-right">
                      {[
                        checkEmpty(profile.city),
                        checkEmpty(profile.region),
                        checkEmpty(profile.country),
                      ]
                        .filter((v) => typeof v === "string")
                        .join(", ")}
                    </span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <PencilSquareIcon className="h-5 w-5 mr-2" />
                    Modificar datos
                  </Button>
                </DialogTrigger>
              </CardFooter>
            </Card>

            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Perfil</DialogTitle>
                <DialogDescription>
                  Realiza los cambios en tu información personal.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nombre</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paternal_last_name">Apellido Paterno</Label>
                  <Input
                    id="paternal_last_name"
                    name="paternal_last_name"
                    value={formData.paternal_last_name}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="maternal_last_name">
                    Apellido Materno (Opcional)
                  </Label>
                  <Input
                    id="maternal_last_name"
                    name="maternal_last_name"
                    value={formData.maternal_last_name}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Teléfono (Opcional)</Label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Género</Label>
                  <Select
                    name="gender"
                    onValueChange={(value) =>
                      handleFormChange({ target: { name: "gender", value } })
                    }
                    value={formData.gender}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Hombre</SelectItem>
                      <SelectItem value="female">Mujer</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>País</Label>
                  <LocationCombobox
                    options={countries}
                    value={formData.country}
                    onChange={(value) =>
                      setFormData((p) => ({
                        ...p,
                        country: value,
                        region: "",
                        city: "",
                      }))
                    }
                    placeholder="País"
                  />
                </div>
                {formData.country && (
                  <div className="space-y-2 sm:col-span-2 animate-fade-in">
                    <Label>Región</Label>
                    <LocationCombobox
                      options={states}
                      value={formData.region}
                      onChange={(value) =>
                        setFormData((p) => ({ ...p, region: value, city: "" }))
                      }
                      placeholder="Región"
                    />
                  </div>
                )}
                {formData.region && (
                  <div className="space-y-2 sm:col-span-2 animate-fade-in">
                    <Label>Ciudad</Label>
                    <LocationCombobox
                      options={cities}
                      value={formData.city}
                      onChange={(value) =>
                        setFormData((p) => ({ ...p, city: value }))
                      }
                      placeholder="Ciudad"
                    />
                  </div>
                )}
                {formErrors.general && (
                  <p className="text-red-500 text-sm sm:col-span-2">
                    {formErrors.general}
                  </p>
                )}
                <DialogFooter className="sm:col-span-2 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Guardar cambios</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>
                Un registro de tus últimas 15 acciones en el sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isActivityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Cargando actividad...</p>
                </div>
              ) : activityLog.length > 0 ? (
                <ul className="space-y-4">
                  {activityLog.map((activity) => {
                    const Icon = getActivityIcon(activity.action);
                    return (
                      <li
                        key={activity.id}
                        className="flex items-start p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-shrink-0 mt-1">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium">
                            {formatActivity(activity)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.timestamp).toLocaleString(
                              "es-CL",
                              {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }
                            )}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <ChartBarIcon className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Aún no tienes actividad registrada en el sistema.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Dialog
            open={isPasswordModalOpen}
            onOpenChange={setIsPasswordModalOpen}
          >
            <Card>
              <CardHeader>
                <CardTitle>Seguridad de la Cuenta</CardTitle>
                <CardDescription>
                  Gestiona tu contraseña y revisa la actividad de tu cuenta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">Contraseña</h3>
                    <p className="text-sm text-muted-foreground">
                      Se recomienda cambiar la contraseña periódicamente.
                    </p>
                  </div>
                  <DialogTrigger asChild>
                    <Button variant="outline">Cambiar Contraseña</Button>
                  </DialogTrigger>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-3">
                    Historial de Inicios de Sesión Recientes
                  </h3>
                  {isHistoryLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Cargando historial...
                    </p>
                  ) : loginHistory.length > 0 ? (
                    <ul className="space-y-4">
                      {loginHistory.map((entry) => (
                        <li key={entry.id} className="flex items-start text-sm">
                          <ClockIcon className="h-5 w-5 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">
                              {new Date(entry.timestamp).toLocaleString(
                                "es-CL",
                                {
                                  dateStyle: "long",
                                  timeStyle: "short",
                                }
                              )}
                            </p>
                            <p className="text-muted-foreground">
                              IP: {entry.ipAddress || "Desconocida"}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No hay registros de inicios de sesión.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Cambiar Contraseña</DialogTitle>
                <DialogDescription>
                  Ingresa tu contraseña actual y la nueva contraseña.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePasswordSubmit} className="space-y-4 py-2">
                <div className="space-y-1">
                  <Label htmlFor="currentPassword">Contraseña Actual</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={passwordFormData.currentPassword}
                    onChange={handlePasswordFormChange}
                    required
                  />
                  {passwordFormErrors.currentPassword && (
                    <p className="text-red-500 text-xs mt-1">
                      {passwordFormErrors.currentPassword}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="newPassword">Nueva Contraseña</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={passwordFormData.newPassword}
                    onChange={handlePasswordFormChange}
                    required
                  />
                  {passwordFormErrors.newPassword && (
                    <p className="text-red-500 text-xs mt-1">
                      {passwordFormErrors.newPassword}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirmPassword">
                    Confirmar Nueva Contraseña
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={passwordFormData.confirmPassword}
                    onChange={handlePasswordFormChange}
                    required
                  />
                  {passwordFormErrors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">
                      {passwordFormErrors.confirmPassword}
                    </p>
                  )}
                </div>
                {passwordFormErrors.general && (
                  <p className="text-red-500 text-sm text-center">
                    {passwordFormErrors.general}
                  </p>
                )}
                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsPasswordModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Guardar Contraseña</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias</CardTitle>
              <CardDescription>
                Personaliza la apariencia y el comportamiento de la aplicación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isPreferencesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">
                    Cargando preferencias...
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">Tema por Defecto</h3>
                      <p className="text-sm text-muted-foreground">
                        El tema que se aplicará automáticamente al iniciar
                        sesión.
                      </p>
                    </div>
                    <Select
                      value={preferences.defaultTheme}
                      onValueChange={(value) =>
                        handlePreferencesChange("defaultTheme", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tema" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Claro</SelectItem>
                        <SelectItem value="dark">Oscuro</SelectItem>
                        <SelectItem value="system">Según el sistema</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">Vista Inicial</h3>
                      <p className="text-sm text-muted-foreground">
                        La página que verás al iniciar sesión.
                      </p>
                    </div>
                    <Select
                      value={preferences.defaultDashboard || "main"}
                      onValueChange={(value) =>
                        handlePreferencesChange("defaultDashboard", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una vista" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">
                          Dashboard Principal
                        </SelectItem>
                        <SelectItem value="planning">Planning</SelectItem>
                        {user?.role === "administrator" && (
                          <>
                            <SelectItem value="users">
                              Gestión de Usuarios
                            </SelectItem>
                            <SelectItem value="settings">
                              Configuración
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleSavePreferences}
                disabled={isSavingPreferences || isPreferencesLoading}
                className="w-full"
              >
                {isSavingPreferences ? "Guardando..." : "Guardar Preferencias"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Profile;
