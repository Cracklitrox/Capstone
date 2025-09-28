import React, { useEffect, useState, useMemo } from "react";
import { Country, State, City } from 'country-state-city';
import axios from "axios";
import { IdentificationIcon, PhoneIcon, UsersIcon, GlobeAltIcon, PencilSquareIcon, ChartBarIcon, ShieldCheckIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { LocationCombobox } from "@/components/LocationCombobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  const [formData, setFormData] = useState({
    first_name: "", paternal_last_name: "", maternal_last_name: "",
    email: "", phone_number: "", gender: "",
    country: "", region: "", city: "",
  });
  const [formErrors, setFormErrors] = useState({});
  
  // Efecto para obtener el perfil del usuario
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) { setError("No se encontró token."); return; }
        const response = await axios.get("http://localhost:3001/api/v1/auth/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = response.data;
        setProfile(data);
        
        // Guardamos los nombres, pero también buscamos los isoCodes para el estado del form
        const countryData = Country.getAllCountries().find(c => c.name === data.country);
        const stateData = countryData ? State.getStatesOfCountry(countryData.isoCode).find(s => s.name === data.region) : null;
        
        setFormData({
          first_name: data.first_name || "", paternal_last_name: data.paternal_last_name || "",
          maternal_last_name: data.maternal_last_name || "", email: data.email || "",
          phone_number: data.phone_number || "", gender: data.gender || "",
          country: countryData?.isoCode || "", // Usamos isoCode para el estado
          region: stateData?.isoCode || "", // Usamos isoCode para el estado
          city: data.city || "",
        });
      } catch (err) {
        console.error("Error al obtener perfil:", err);
        setError("Error al obtener perfil. ¿Token expirado?");
      }
    };
    fetchProfile();
  }, []);

  const countries = useMemo(() => Country.getAllCountries().map(c => ({ value: c.isoCode, label: c.name })), []);
  const states = useMemo(() => formData.country ? State.getStatesOfCountry(formData.country).map(s => ({ value: s.isoCode, label: s.name })) : [], [formData.country]);
  const cities = useMemo(() => (formData.country && formData.region) ? City.getCitiesOfState(formData.country, formData.region).map(c => ({ value: c.name, label: c.name })) : [], [formData.country, formData.region]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const countryName = countries.find(c => c.value === formData.country)?.label || "";
      const stateName = states.find(s => s.value === formData.region)?.label || "";
      
      const payload = { ...formData, country: countryName, region: stateName };

      const response = await axios.put("http://localhost:3001/api/v1/auth/profile", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(response.data);
      setIsModalOpen(false);
      setSuccessMessage("Datos actualizados correctamente");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error al actualizar perfil:", err.response);
      setFormErrors({ general: err.response?.data?.message || "Error del servidor." });
    }
  };

  if (error) return <div className="flex justify-center items-center h-full text-destructive">{error}</div>;
  if (!profile) return <div className="flex justify-center items-center h-full text-muted-foreground">Cargando perfil...</div>;

  const fullName = [profile.first_name, profile.paternal_last_name, profile.maternal_last_name].filter(Boolean).join(" ");
  const checkEmpty = (value) => value || <span className="text-muted-foreground">Sin datos</span>;
  const translateGender = (gender) => ({ male: 'Hombre', female: 'Mujer', other: 'Otro' }[gender] || checkEmpty());

  return (
    <main className="flex flex-1 flex-col items-center p-4 sm:p-6 lg:p-8">
      {successMessage && <div className="absolute top-20 right-5 z-50 bg-green-600 text-white text-sm font-bold px-4 py-3 rounded-md shadow-lg animate-fade-in">{successMessage}</div>}
      
      {/* --- 2. Envolvemos todo en el componente Tabs --- */}
      <Tabs defaultValue="personal" className="w-full max-w-2xl">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="personal">Info. Personal</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          <TabsTrigger value="preferences">Preferencias</TabsTrigger>
        </TabsList>

        {/* --- 3. Contenido de la primera pestaña (tu componente actual) --- */}
        <TabsContent value="personal">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <Card className="animate-fade-in">
              <CardHeader className="items-center text-center">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-4xl font-bold text-primary mb-4">{profile.first_name?.charAt(0)}</div>
                <CardTitle className="text-3xl">{fullName}</CardTitle>
                <CardDescription>{profile.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 text-sm border-t pt-6">
                  <li className="flex items-center"><IdentificationIcon className="h-5 w-5 text-muted-foreground mr-3" /><span className="font-medium text-muted-foreground">RUT:</span><span className="ml-auto font-mono">{checkEmpty(profile.rut)}</span></li>
                  <li className="flex items-center"><PhoneIcon className="h-5 w-5 text-muted-foreground mr-3" /><span className="font-medium text-muted-foreground">Teléfono:</span><span className="ml-auto">{checkEmpty(profile.phone_number)}</span></li>
                  <li className="flex items-center"><UsersIcon className="h-5 w-5 text-muted-foreground mr-3" /><span className="font-medium text-muted-foreground">Género:</span><span className="ml-auto">{translateGender(profile.gender)}</span></li>
                  <li className="flex items-center"><GlobeAltIcon className="h-5 w-5 text-muted-foreground mr-3" /><span className="font-medium text-muted-foreground">Ubicación:</span><span className="ml-auto text-right">{[checkEmpty(profile.city), checkEmpty(profile.region), checkEmpty(profile.country)].filter(v => typeof v === 'string').join(', ')}</span></li>
                </ul>
              </CardContent>
              <CardFooter>
                <DialogTrigger asChild><Button className="w-full"><PencilSquareIcon className="h-5 w-5 mr-2" />Modificar datos</Button></DialogTrigger>
              </CardFooter>
            </Card>

            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Editar Perfil</DialogTitle><DialogDescription>Realiza los cambios en tu información personal.</DialogDescription></DialogHeader>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                {/* ... El contenido del formulario no cambia ... */}
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* --- 4. Pestañas con contenido de marcador de posición (placeholder) --- */}
        <TabsContent value="activity">
          <Card>
            <CardHeader><CardTitle>Actividad y Estadísticas</CardTitle><CardDescription>Un resumen de tu actividad reciente en el hotel.</CardDescription></CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center h-48">
              <ChartBarIcon className="h-12 w-12 text-muted-foreground mb-4"/>
              <p className="text-muted-foreground">Esta funcionalidad estará disponible próximamente.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader><CardTitle>Seguridad</CardTitle><CardDescription>Gestiona tu contraseña y la seguridad de tu cuenta.</CardDescription></CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center h-48">
              <ShieldCheckIcon className="h-12 w-12 text-muted-foreground mb-4"/>
              <p className="text-muted-foreground">Esta funcionalidad estará disponible próximamente.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader><CardTitle>Preferencias</CardTitle><CardDescription>Personaliza la apariencia y las notificaciones de la aplicación.</CardDescription></CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center h-48">
              <AdjustmentsHorizontalIcon className="h-12 w-12 text-muted-foreground mb-4"/>
              <p className="text-muted-foreground">Esta funcionalidad estará disponible próximamente.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Profile;