import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/services/authContext.jsx';
import { guestHistoryService } from '@/services/guestHistory.js';
import { format, parseISO, differenceInYears, differenceInMonths, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Country, State, City } from "country-state-city";
import { validateRutFormat, validateRutDv, formatRutInput, cleanRut } from "@/lib/rutValidator";

// Importar componentes UI
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Separator } from "@/components/ui/separator.jsx";

// Importar iconos
import { 
  MagnifyingGlassIcon, 
  UserIcon, 
  CalendarIcon,
  HomeIcon,
  CurrencyDollarIcon,
  EyeIcon,
  XCircleIcon,
  PencilIcon,
  CheckIcon 
} from '@heroicons/react/24/outline';

const GuestHistory = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  
  // Función para verificar si el usuario puede editar un campo específico
  const canEditField = (fieldName) => {
    // Si no hay usuario, no puede editar (por seguridad)
    if (!user || !user.role) return false;
    
    // ADMINISTRADOR: Puede editar todo excepto fecha de registro
    if (user.role === 'administrator') {
      return fieldName !== 'registrationDate';
    }
    
    // RECEPCIONISTA: solo puede editar campos secundarios
    if (user.role === 'receptionist') {
      const editableFields = [
        'email',              // ✅ Email
        'phoneNumber',        // ✅ Teléfono
        'nationality',        // ✅ País
        'region',             // ✅ Región
        'city',               // ✅ Ciudad
        'specialRequests',    // ✅ Solicitudes especiales
        'observations'        // ✅ Observaciones
      ];
      // Campos NO editables para recepcionista:
      // ❌ firstName, paternalLastName, maternalLastName (Nombres)
      // ❌ identificationNumber (RUT/Pasaporte)
      // ❌ gender (Género)
      // ❌ birthDate (Fecha de nacimiento)
      // ❌ status (Estado del huésped)
      // ❌ registrationDate (Fecha de registro)
      
      return editableFields.includes(fieldName);
    }
    
    // Por defecto, no puede editar
    return false;
  };
  
  // Estados principales
  const [guests, setGuests] = useState([]);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [guestProfile, setGuestProfile] = useState(null);
  const [guestReservations, setGuestReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para búsqueda de huéspedes
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [guestsMeta, setGuestsMeta] = useState({ page: 1, totalPages: 1 });
  
  // Estados para el modal de perfil
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active-reservation'); // Tab activo por defecto
  
  // Estados para modal de huésped adicional
  const [isAdditionalGuestModalOpen, setIsAdditionalGuestModalOpen] = useState(false);
  const [selectedAdditionalGuest, setSelectedAdditionalGuest] = useState(null);

  // Función para calcular edad
  const calculateAge = (birthDate) => {
    if (!birthDate) return 'Sin datos';
    
    try {
      const birth = parseISO(birthDate);
      const now = new Date();
      
      const years = differenceInYears(now, birth);
      const months = differenceInMonths(now, birth) % 12;
      const days = differenceInDays(now, new Date(now.getFullYear(), now.getMonth() - months, birth.getDate())) % 30;
      
      return `${years} años, ${months} meses, ${days} días`;
    } catch (error) {
      return 'Sin datos';
    }
  };

  // Función para formatear datos vacíos
  const formatData = (value, defaultText = 'Sin datos') => {
    if (!value || value === '' || value === null || value === undefined) {
      return defaultText;
    }
    return value;
  };
  
  // Estados para filtros de reservas
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  const [reservationsMeta, setReservationsMeta] = useState({ page: 1, totalPages: 1 });
  
  // Estados para editar observaciones
  const [isEditingObservations, setIsEditingObservations] = useState(false);
  const [editedObservations, setEditedObservations] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [savingObservations, setSavingObservations] = useState(false);
  
  // Estados para editar todos los campos del perfil
  const [editingStates, setEditingStates] = useState({
    firstName: false,
    paternalLastName: false,
    maternalLastName: false,
    identificationNumber: false,
    email: false,
    phoneNumber: false,
    gender: false,
    birthDate: false,
    country: false,
    region: false,
    city: false,
    specialRequests: false,
    status: false,
    registrationDate: false
  });

  const [editedValues, setEditedValues] = useState({
    firstName: '',
    paternalLastName: '',
    maternalLastName: '',
    identificationNumber: '',
    email: '',
    phoneNumber: '',
    gender: '',
    birthDate: '',
    country: '',
    region: '',
    city: '',
    specialRequests: '',
    status: '',
    registrationDate: ''
  });

  // Estados para selectores geográficos
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [savingStates, setSavingStates] = useState({
    firstName: false,
    paternalLastName: false,
    maternalLastName: false,
    identificationNumber: false,
    email: false,
    phoneNumber: false,
    gender: false,
    birthDate: false,
    country: false,
    region: false,
    city: false,
    specialRequests: false,
    status: false,
    registrationDate: false
  });

  const [fieldErrors, setFieldErrors] = useState({});
  
  // Estados para reservas
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationFilters, setReservationFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    page: 1
  });
  
  // Buscar huéspedes
  const searchGuests = useCallback(async (page = 1) => {
    if (!token) return;
    
    setSearchLoading(true);
    setError(null);
    
    try {
      const response = await guestHistoryService.searchAllGuests(searchTerm, page, 20);
      setGuests(response.data || []);
      setGuestsMeta(response.meta || { page: 1, totalPages: 1 });
    } catch (err) {
      setError(err.message);
      setGuests([]);
    } finally {
      setSearchLoading(false);
    }
  }, [token, searchTerm]);

  // Cargar perfil del huésped
  const loadGuestProfile = async (guestId) => {
    setProfileLoading(true);
    try {
      const response = await guestHistoryService.getGuestProfile(guestId);
      if (response.found) {
        setGuestProfile(response.profile);
      } else {
        setError('Huésped no encontrado');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  // Cargar reservas del huésped
  const loadGuestReservations = async (guestId, filters = {}) => {
    setReservationsLoading(true);
    try {
      const response = await guestHistoryService.getGuestReservations(guestId, {
        ...filters,
        page: filters.page || 1,
        limit: 10,
      });
      setGuestReservations(response.data || []);
      setReservationsMeta(response.meta || { page: 1, totalPages: 1 });
    } catch (err) {
      setError(err.message);
      setGuestReservations([]);
    } finally {
      setReservationsLoading(false);
    }
  };

  // Manejar selección de huésped
  const handleSelectGuest = async (guest) => {
    setSelectedGuest(guest);
    setIsModalOpen(true);
    await loadGuestProfile(guest.id);
    await loadGuestReservations(guest.id, reservationFilters);
    // Inicializar texto de observaciones
    setEditedObservations('');
    setIsEditingObservations(false);
  };

  // Iniciar edición de observaciones
  const handleEditObservations = () => {
    setEditedObservations(guestProfile?.observations || '');
    setIsEditingObservations(true);
  };

  // Cancelar edición de observaciones
  const handleCancelEditObservations = () => {
    setIsEditingObservations(false);
    setEditedObservations('');
  };

  // Guardar observaciones
  const handleSaveObservations = async () => {
    if (!selectedGuest) return;
    
    setSavingObservations(true);
    try {
      await guestHistoryService.updateGuestObservations(selectedGuest.id, editedObservations);
      
      // Actualizar el perfil local
      setGuestProfile(prev => ({
        ...prev,
        observations: editedObservations
      }));
      
      setIsEditingObservations(false);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingObservations(false);
    }
  };

  // Funciones para manejar edición de campos
  const handleEditField = (fieldName) => {
    if (!guestProfile) return;
    
    // Establecer el valor actual del campo
    let currentValue = '';
    switch (fieldName) {
      case 'firstName':
        currentValue = guestProfile.firstName || '';
        break;
      case 'paternalLastName':
        currentValue = guestProfile.paternalLastName || '';
        break;
      case 'maternalLastName':
        currentValue = guestProfile.maternalLastName || '';
        break;
      case 'identificationNumber':
        currentValue = guestProfile.identificationNumber || '';
        break;
      case 'email':
        currentValue = guestProfile.email || '';
        break;
      case 'phoneNumber':
        currentValue = guestProfile.phone || '';
        break;
      case 'gender':
        currentValue = guestProfile.gender || '';
        break;
      case 'birthDate':
        currentValue = guestProfile.birthDate ? guestProfile.birthDate.split('T')[0] : '';
        break;
      case 'country':
        // Buscar el código ISO del país basado en el nombre
        if (guestProfile.nationality) {
          const countryItem = countries.find(c => c.label === guestProfile.nationality);
          currentValue = countryItem ? countryItem.value : '';
        } else {
          currentValue = '';
        }
        break;
      case 'nationality':
        currentValue = guestProfile.nationality || '';
        break;
      case 'region':
        // Usar el nombre de la región directamente
        currentValue = guestProfile.region || '';
        break;
      case 'city':
        currentValue = guestProfile.city || '';
        break;
      case 'specialRequests':
        currentValue = guestProfile.specialRequests || '';
        break;
      case 'status':
        currentValue = guestProfile.status || '';
        break;
      case 'registrationDate':
        currentValue = guestProfile.registrationDate ? guestProfile.registrationDate.split('T')[0] : '';
        break;
    }

    setEditedValues(prev => ({
      ...prev,
      [fieldName]: currentValue
    }));

    // Cargar datos dependientes para campos geográficos
    if ((fieldName === 'nationality' || fieldName === 'country') && guestProfile.nationality) {
      const countryItem = countries.find(c => c.label === guestProfile.nationality);
      if (countryItem) {
        const stateList = State.getStatesOfCountry(countryItem.value).map((state) => ({
          value: state.isoCode,
          label: state.name
        }));
        setStates(stateList);
      }
    }

    if (fieldName === 'region' && (editedValues.nationality || guestProfile.nationality)) {
      const currentNationality = editedValues.nationality || guestProfile.nationality;
      const countryItem = countries.find(c => c.label === currentNationality);
      if (countryItem) {
        // Cargar estados del país actual
        const stateList = State.getStatesOfCountry(countryItem.value).map((state) => ({
          value: state.isoCode,
          label: state.name
        }));
        setStates(stateList);

        // Si hay una región seleccionada actualmente, cargar sus ciudades
        const currentRegion = editedValues.region || guestProfile.region;
        if (currentRegion) {
          const stateItem = stateList.find(s => s.label === currentRegion);
          if (stateItem) {
            const cityList = City.getCitiesOfState(countryItem.value, stateItem.value).map((city) => ({
              value: city.name,
              label: city.name
            }));
            setCities(cityList);
          }
        }
      }
    }

    if (fieldName === 'city' && guestProfile.nationality) {
      // Usar la región actual (editada o del perfil)
      const currentRegion = editedValues.region || guestProfile.region;
      const currentNationality = editedValues.nationality || guestProfile.nationality;
      
      if (currentRegion && currentNationality) {
        const countryItem = countries.find(c => c.label === currentNationality);
        if (countryItem) {
          // Cargar estados si no están cargados
          const stateList = State.getStatesOfCountry(countryItem.value).map((state) => ({
            value: state.isoCode,
            label: state.name
          }));
          setStates(stateList);

          // Cargar ciudades de la región actual
          const stateItem = stateList.find(s => s.label === currentRegion);
          if (stateItem) {
            const cityList = City.getCitiesOfState(countryItem.value, stateItem.value).map((city) => ({
              value: city.name,
              label: city.name
            }));
            setCities(cityList);
          }
        }
      }
    }
    
    setEditingStates(prev => ({
      ...prev,
      [fieldName]: true
    }));

    // Limpiar errores previos
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: null
    }));
  };

  const handleCancelEditField = (fieldName) => {
    setEditingStates(prev => ({
      ...prev,
      [fieldName]: false
    }));
    
    setEditedValues(prev => ({
      ...prev,
      [fieldName]: ''
    }));

    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: null
    }));
  };

  const handleSaveField = async (fieldName) => {
    if (!selectedGuest) return;
    
    // Prevenir múltiples peticiones simultáneas
    if (savingStates[fieldName]) {
      console.log('Ya se está guardando este campo, ignorando petición');
      return;
    }
    
    const value = editedValues[fieldName];
    
    // Si el valor editado es undefined, obtener el valor actual del campo
    let actualValue = value;
    if (actualValue === undefined) {
      switch (fieldName) {
        case 'nationality':
          actualValue = guestProfile.nationality;
          break;
        case 'region':
          actualValue = guestProfile.region;
          break;
        case 'city':
          actualValue = guestProfile.city;
          break;
        default:
          actualValue = guestProfile[fieldName];
      }
    }
    
    const error = validateField(fieldName, actualValue);
    
    if (error) {
      setFieldErrors(prev => ({
        ...prev,
        [fieldName]: error
      }));
      return;
    }

    // Validación especial para campos geográficos
    if (['nationality', 'region', 'city'].includes(fieldName)) {
      const currentNationality = fieldName === 'nationality' ? actualValue : editedValues.nationality || guestProfile.nationality;
      const currentRegion = fieldName === 'region' ? actualValue : editedValues.region || guestProfile.region;
      const currentCity = fieldName === 'city' ? actualValue : editedValues.city || guestProfile.city;
      
      const geoError = validateGeographicCoherence(currentNationality, currentRegion, currentCity);
      if (geoError) {
        setFieldErrors(prev => ({ ...prev, [fieldName]: geoError }));
        return;
      }
    }

    setSavingStates(prev => ({
      ...prev,
      [fieldName]: true
    }));

    try {
      // Pequeño delay para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Convertir códigos ISO a nombres para enviar al backend
      let valueToSend = actualValue;
      if (fieldName === 'country') {
        const countryItem = countries.find(c => c.value === actualValue);
        valueToSend = countryItem ? countryItem.label : actualValue;
      } else if (fieldName === 'region') {
        const stateItem = states.find(s => s.value === actualValue);
        valueToSend = stateItem ? stateItem.label : actualValue;
      }

      const updateData = { [fieldName]: valueToSend };
      
      await guestHistoryService.updateGuestProfile(selectedGuest.id, updateData);
      
      // Actualizar el perfil local
      setGuestProfile(prev => {
        const updated = { ...prev };
        
        switch (fieldName) {
          case 'firstName':
            updated.firstName = valueToSend;
            updated.fullName = `${valueToSend} ${updated.paternalLastName}${updated.maternalLastName ? ` ${updated.maternalLastName}` : ''}`;
            break;
          case 'paternalLastName':
            updated.paternalLastName = valueToSend;
            updated.fullName = `${updated.firstName} ${valueToSend}${updated.maternalLastName ? ` ${updated.maternalLastName}` : ''}`;
            break;
          case 'maternalLastName':
            updated.maternalLastName = valueToSend;
            updated.fullName = `${updated.firstName} ${updated.paternalLastName}${valueToSend ? ` ${valueToSend}` : ''}`;
            break;
          case 'phoneNumber':
            updated.phone = valueToSend;
            break;
          case 'nationality':
            updated.nationality = valueToSend;
            break;
          case 'country':
            updated.nationality = valueToSend;
            break;
          default:
            updated[fieldName] = valueToSend;
        }
        
        return updated;
      });
      
      setEditingStates(prev => ({
        ...prev,
        [fieldName]: false
      }));
      
      // No limpiar editedValues, solo cambiar el estado de edición
      // Los valores editados se mantienen para preservar cambios no guardados en otros campos
      
      // Para campos geográficos, asegurar que las opciones dependientes estén cargadas
      if (fieldName === 'nationality') {
        const nationality = valueToSend;
        const countryItem = countries.find(c => c.label === nationality);
        if (countryItem) {
          const stateList = State.getStatesOfCountry(countryItem.value).map((state) => ({
            value: state.isoCode,
            label: state.name
          }));
          setStates(stateList);
          
          // Si hay región editada, cargar sus ciudades
          const currentRegion = editedValues.region;
          if (currentRegion) {
            const stateItem = stateList.find(s => s.label === currentRegion);
            if (stateItem) {
              const cityList = City.getCitiesOfState(countryItem.value, stateItem.value).map((city) => ({
                value: city.name,
                label: city.name
              }));
              setCities(cityList);
            }
          }
        }
      }
      
      // Si se guarda una región, recargar ciudades para esa región
      if (fieldName === 'region') {
        const nationality = editedValues.nationality || guestProfile.nationality;
        const countryItem = countries.find(c => c.label === nationality);
        if (countryItem) {
          const stateList = State.getStatesOfCountry(countryItem.value).map((state) => ({
            value: state.isoCode,
            label: state.name
          }));
          setStates(stateList);
          
          const stateItem = stateList.find(s => s.label === valueToSend);
          if (stateItem) {
            const cityList = City.getCitiesOfState(countryItem.value, stateItem.value).map((city) => ({
              value: city.name,
              label: city.name
            }));
            setCities(cityList);
          }
        }
      }
      
      // Si se guarda una ciudad, asegurar que regiones y ciudades estén cargadas
      if (fieldName === 'city') {
        const nationality = editedValues.nationality || guestProfile.nationality;
        const region = editedValues.region || guestProfile.region;
        
        if (nationality && region) {
          const countryItem = countries.find(c => c.label === nationality);
          if (countryItem) {
            // Recargar estados
            const stateList = State.getStatesOfCountry(countryItem.value).map((state) => ({
              value: state.isoCode,
              label: state.name
            }));
            setStates(stateList);
            
            // Recargar ciudades
            const stateItem = stateList.find(s => s.label === region);
            if (stateItem) {
              const cityList = City.getCitiesOfState(countryItem.value, stateItem.value).map((city) => ({
                value: city.name,
                label: city.name
              }));
              setCities(cityList);
            }
          }
        }
      }
      
      setFieldErrors(prev => ({
        ...prev,
        [fieldName]: undefined
      }));
      
      setError(null);
    } catch (err) {
      console.error('Error al guardar campo:', err);
      let errorMessage = err.message;
      
      // Manejo especial para error 429 (Too Many Requests)
      if (err.response?.status === 429) {
        errorMessage = "Demasiadas peticiones. Por favor espera unos segundos antes de intentar nuevamente.";
      } else if (err.response?.status >= 500) {
        errorMessage = "Error del servidor. Inténtalo nuevamente.";
      } else if (!err.response) {
        errorMessage = "Error de conexión. Verifica tu conexión a internet.";
      }
      
      setFieldErrors(prev => ({
        ...prev,
        [fieldName]: errorMessage
      }));
    } finally {
      setSavingStates(prev => ({
        ...prev,
        [fieldName]: false
      }));
    }
  };

  // Función de validación de campos
  const validateField = (fieldName, value) => {
    switch (fieldName) {
      case 'identificationNumber':
        if (!value) return "RUT es obligatorio";
        const cleaned = cleanRut(value);
        const rutPart = cleaned.slice(0, -1);
        const dvPart = cleaned.slice(-1);
        if (!validateRutFormat(rutPart) || !validateRutDv(rutPart, dvPart)) {
          return "RUT ingresado erróneo";
        }
        break;
      
      case 'firstName':
        if (!value) return "Nombre es obligatorio";
        if (value.length < 2) return "Nombre debe tener al menos 2 caracteres";
        break;
      
      case 'paternalLastName':
        if (!value) return "Apellido paterno es obligatorio";
        if (value.length < 2) return "Apellido debe tener al menos 2 caracteres";
        break;
      
      case 'email':
        if (!value) return "Email es obligatorio";
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) return "Email inválido";
        break;
      
      case 'phoneNumber':
        if (!value) return "Teléfono es obligatorio";
        if (!/^\+?[\d\s()-]{8,15}$/.test(value)) return "Teléfono inválido";
        break;
      
      case 'birthDate':
        if (!value) return "Fecha de nacimiento es obligatoria";
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        if (age < 18) return "El huésped debe ser mayor de edad (18+)";
        break;
      
      case 'gender':
        if (!value) return "Género es obligatorio";
        break;
      
      case 'nationality':
        if (!value) return "País es obligatorio";
        break;
      
      case 'region':
        if (!value) return "Región es obligatoria";
        break;
      
      case 'city':
        if (!value) return "Ciudad es obligatoria";
        break;
    }
    return null;
  };

  // Función para manejar cambio en RUT con formato automático
  const handleRutChange = (value) => {
    const formatted = formatRutInput(value);
    setEditedValues(prev => ({ ...prev, identificationNumber: formatted }));
  };

  // Función para manejar cambio en el país
  const handleCountryChange = (value) => {
    setEditedValues(prev => ({ ...prev, nationality: value }));
    
    // Actualizar estados disponibles
    if (value) {
      const countryItem = countries.find(c => c.label === value);
      if (countryItem) {
        const stateList = State.getStatesOfCountry(countryItem.value).map((state) => ({
          value: state.isoCode,
          label: state.name
        }));
        setStates(stateList);
        
        // Si ya hay una región seleccionada, actualizar ciudades
        const currentRegion = editedValues.region || guestProfile?.region;
        if (currentRegion) {
          const stateItem = stateList.find(s => s.label === currentRegion);
          if (stateItem) {
            const cityList = City.getCitiesOfState(countryItem.value, stateItem.value).map((city) => ({
              value: city.name,
              label: city.name
            }));
            setCities(cityList);
          } else {
            // La región actual no existe en el nuevo país, limpiar
            setEditedValues(prev => ({ ...prev, region: '', city: '' }));
            setCities([]);
          }
        }
      }
    } else {
      setStates([]);
      setCities([]);
    }
  };

  // Función para manejar cambio en la región
  const handleRegionChange = (value) => {
    setEditedValues(prev => ({ ...prev, region: value }));
    
    // Actualizar ciudades disponibles
    if (value && (editedValues.nationality || guestProfile.nationality)) {
      const nationality = editedValues.nationality || guestProfile.nationality;
      const countryItem = countries.find(c => c.label === nationality);
      if (countryItem) {
        // Buscar el estado por su código ISO (value contiene el isoCode)
        const stateItem = states.find(s => s.value === value);
        if (stateItem) {
          const cityList = City.getCitiesOfState(countryItem.value, stateItem.value).map((city) => ({
            value: city.name,
            label: city.name
          }));
          setCities(cityList);
        }
      }
    }
  };

  // Función para manejar cambio en la ciudad
  const handleCityChange = (value) => {
    setEditedValues(prev => ({ ...prev, city: value }));
  };

  // Función para validar coherencia geográfica
  const validateGeographicCoherence = (nationality, region, city) => {
    if (!nationality || !region || !city) return null;
    
    try {
      // Buscar el país
      const countryItem = countries.find(c => c.label === nationality);
      if (!countryItem) {
        return `El país "${nationality}" no es válido`;
      }

      // Verificar que la región pertenezca al país
      const validStates = State.getStatesOfCountry(countryItem.value);
      
      // La región puede venir como código ISO o como nombre, verificar ambos
      const stateItem = validStates.find(state => 
        state.isoCode === region || state.name === region
      );
      
      if (!stateItem) {
        const regionNames = validStates.map(s => s.name).join(', ');
        return `La región "${region}" no pertenece a ${nationality}. Regiones válidas: ${regionNames}`;
      }

      // Verificar que la ciudad pertenezca al país y región
      const validCities = City.getCitiesOfState(countryItem.value, stateItem.isoCode);
      const cityExists = validCities.some(validCity => validCity.name === city);
      if (!cityExists) {
        return `La ciudad "${city}" no pertenece a la región ${stateItem.name}, ${nationality}. Debe seleccionar una ciudad válida para esta región.`;
      }

      return null; // Todo es válido
    } catch (error) {
      console.error('Error validating geographic coherence:', error);
      return "Error al validar ubicación geográfica. Verifique que los datos sean correctos.";
    }
  };

  // Función para ver historial completo (con filtro por RUT/pasaporte)
  const handleViewFullHistory = (identificationNumber, reservationCode = null) => {
    if (reservationCode) {
      // Ver detalles de una reserva específica
      console.log('Redirigiendo a Ver Detalles con código de reserva:', reservationCode);
      // Navegar a /history con parámetro de reserva específica
      navigate(`/history?reservation=${reservationCode}`);
    } else {
      // Ver historial completo filtrado por RUT/pasaporte
      console.log('Redirigiendo a Ver Historial Completo con RUT/pasaporte:', identificationNumber);
      // Navegar a /history con filtro de identificación
      navigate(`/history?guest=${encodeURIComponent(identificationNumber)}`);
    }
  };
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(amount);
  };

  // Manejar selección de huésped adicional
  const handleSelectAdditionalGuest = async (additionalGuest) => {
    try {
      // Si ya tenemos datos completos del huésped (de la reserva activa), usarlos
      if (additionalGuest.email && additionalGuest.email !== 'Sin datos') {
        setSelectedAdditionalGuest(additionalGuest);
        setIsAdditionalGuestModalOpen(true);
        return;
      }

      // Si no tenemos datos completos, obtenerlos del backend
      const response = await guestHistoryService.getGuestProfile(additionalGuest.id);
      if (response.found) {
        setSelectedAdditionalGuest(response.profile);
        setIsAdditionalGuestModalOpen(true);
      } else {
        // Si no se encuentran datos, usar los datos básicos disponibles
        setSelectedAdditionalGuest(additionalGuest);
        setIsAdditionalGuestModalOpen(true);
      }
    } catch (error) {
      console.error('Error al obtener datos del huésped:', error);
      // En caso de error, usar los datos básicos disponibles
      setSelectedAdditionalGuest(additionalGuest);
      setIsAdditionalGuestModalOpen(true);
    }
  };

  // Cerrar modal de huésped adicional
  const handleCloseAdditionalGuestModal = () => {
    setIsAdditionalGuestModalOpen(false);
    setSelectedAdditionalGuest(null);
  };

  // Formatear fecha
  const formatDate = (date) => {
    return format(parseISO(date), 'dd/MM/yyyy', { locale: es });
  };

  // Obtener variant de estado de reserva
  const getStatusVariant = (status) => {
    const variants = {
      'completed': 'default',
      'confirmed': 'secondary',
      'in_progress': 'default',
      'pending': 'outline',
      'canceled': 'destructive',
      'no_show': 'destructive',
    };
    return variants[status] || 'outline';
  };

  // Traducciones de estado
  const statusTranslations = {
    'completed': 'Completada',
    'confirmed': 'Confirmada',
    'in_progress': 'En Progreso',
    'pending': 'Pendiente',
    'canceled': 'Cancelada',
    'no_show': 'No se Presentó',
  };

  // Efecto para búsqueda automática
  useEffect(() => {
    const timer = setTimeout(() => {
      searchGuests(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchGuests]);

  // Efecto para actualizar reservas cuando cambian los filtros
  useEffect(() => {
    if (selectedGuest) {
      loadGuestReservations(selectedGuest.id, reservationFilters);
    }
  }, [reservationFilters, selectedGuest]);

  // Efecto para cargar países e inicializar valores geográficos cuando se carga el perfil
  useEffect(() => {
    const countryList = Country.getAllCountries().map((country) => ({
      value: country.isoCode,
      label: country.name
    }));
    setCountries(countryList);

    // Si hay un perfil cargado, configurar los valores geográficos
    if (guestProfile) {
      // Configurar país
      if (guestProfile.nationality) {
        const currentCountry = countryList.find(c => c.label === guestProfile.nationality);
        if (currentCountry) {
          setEditedValues(prev => ({
            ...prev,
            country: currentCountry.value
          }));

          // Configurar región
          if (guestProfile.region) {
            const stateList = State.getStatesOfCountry(currentCountry.value).map((state) => ({
              value: state.isoCode,
              label: state.name
            }));
            setStates(stateList);
            
            const currentState = stateList.find(s => s.label === guestProfile.region);
            if (currentState) {
              setEditedValues(prev => ({
                ...prev,
                country: currentCountry.value,
                region: currentState.value
              }));

              // Configurar ciudad
              if (guestProfile.city) {
                const cityList = City.getCitiesOfState(currentCountry.value, currentState.isoCode).map((city) => ({
                  value: city.name,
                  label: city.name
                }));
                setCities(cityList);
                
                setEditedValues(prev => ({
                  ...prev,
                  country: currentCountry.value,
                  region: currentState.isoCode,
                  city: guestProfile.city
                }));
              }
            }
          }
        }
      }
    }
  }, [guestProfile]);

  // Efecto para cargar estados cuando cambia el país
  useEffect(() => {
    if (editedValues.country) {
      const stateList = State.getStatesOfCountry(editedValues.country).map((state) => ({
        value: state.isoCode,
        label: state.name
      }));
      setStates(stateList);
    } else {
      setStates([]);
    }
  }, [editedValues.country]);

  // Efecto para cargar ciudades cuando cambia la región
  useEffect(() => {
    if (editedValues.country && editedValues.region) {
      const cityList = City.getCitiesOfState(editedValues.country, editedValues.region).map((city) => ({
        value: city.name,
        label: city.name
      }));
      setCities(cityList);
    } else {
      setCities([]);
    }
  }, [editedValues.country, editedValues.region]);

  // Componente helper para renderizar campos editables
  const renderEditableField = (fieldName, label, value, type = 'text', options = null, readonly = false) => {
    const isEditing = editingStates[fieldName];
    const isSaving = savingStates[fieldName];
    const error = fieldErrors[fieldName];
    const editedValue = editedValues[fieldName];

    // Verificar permisos de edición
    const hasEditPermission = canEditField(fieldName);

    // Campos que no se pueden editar (readonly o sin permisos)
    if (readonly || fieldName === 'registrationDate' || !hasEditPermission) {
      return (
        <div>
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <div className="font-medium">
            {type === 'date' && value ? new Date(value).toLocaleDateString('es-CL') : value || 'No especificado'}
            {!hasEditPermission && (
              <span className="text-xs text-muted-foreground ml-2">
                {/* Comentado: Mostrar razón de restricción */}
                {/* (Solo {user?.role === 'administrator' ? 'administradores' : 'lectura'}) */}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (isEditing) {
      return (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSaveField(fieldName)}
                disabled={isSaving || savingStates[fieldName]}
                className="h-6 w-6 p-0 text-green-600 disabled:opacity-50"
                title={isSaving || savingStates[fieldName] ? "Guardando..." : "Guardar cambios"}
              >
                {isSaving || savingStates[fieldName] ? (
                  <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full"></div>
                ) : (
                  <CheckIcon className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancelEditField(fieldName)}
                disabled={isSaving}
                className="h-6 w-6 p-0 text-red-600"
              >
                <XCircleIcon className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {type === 'select' && options ? (
            <select
              value={editedValue}
              onChange={(e) => {
                setEditedValues(prev => ({ ...prev, [fieldName]: e.target.value }));
                // Si es país, limpiar región y ciudad
                if (fieldName === 'country') {
                  setEditedValues(prev => ({ ...prev, region: '', city: '' }));
                }
                // Si es región, limpiar ciudad
                if (fieldName === 'region') {
                  setEditedValues(prev => ({ ...prev, city: '' }));
                }
              }}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {fieldName !== 'gender' && <option value="">Seleccionar...</option>}
              {options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : type === 'countrySelect' ? (
            <select
              value={editedValues.nationality || ''}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Seleccionar país...</option>
              {countries.map(country => (
                <option key={country.value} value={country.label}>
                  {country.label}
                </option>
              ))}
            </select>
          ) : type === 'stateSelect' ? (
            <select
              value={(() => {
                // Si está en modo edición, usar editedValues.region
                if (isEditing && editedValues.region !== undefined) {
                  const stateItem = states.find(s => s.label === editedValues.region);
                  return stateItem ? stateItem.value : '';
                }
                // Si no está editando, usar el valor del perfil
                if (guestProfile?.region) {
                  const stateItem = states.find(s => s.label === guestProfile.region);
                  return stateItem ? stateItem.value : '';
                }
                return '';
              })()}
              onChange={(e) => {
                // Convertir el código ISO de vuelta al nombre para almacenar
                const selectedState = states.find(s => s.value === e.target.value);
                const regionName = selectedState ? selectedState.label : e.target.value;
                setEditedValues(prev => ({ ...prev, region: regionName, city: '' })); // Limpiar ciudad
                
                // Actualizar ciudades inmediatamente
                if (selectedState) {
                  const nationality = editedValues.nationality || guestProfile?.nationality;
                  const countryItem = countries.find(c => c.label === nationality);
                  if (countryItem) {
                    console.log('Cargando ciudades para:', {
                      country: countryItem.label,
                      countryCode: countryItem.value,
                      region: selectedState.label,
                      regionCode: selectedState.value
                    });
                    
                    let cityList = City.getCitiesOfState(countryItem.value, selectedState.value);
                    
                    // Manejo especial para regiones chilenas que pueden tener problemas
                    if (cityList.length === 0 && countryItem.value === 'CL') {
                      console.log('No se encontraron ciudades, intentando códigos alternativos...');
                      
                      // Mapeo especial para regiones chilenas problemáticas
                      const regionMappings = {
                        'Región Metropolitana de Santiago': ['RM', 'ME'], // Posibles códigos
                        'Los Lagos': ['LL', 'LR'],
                        'Valparaíso': ['VS', 'VA']
                      };
                      
                      const possibleCodes = regionMappings[selectedState.label] || [selectedState.value];
                      
                      for (const code of possibleCodes) {
                        cityList = City.getCitiesOfState(countryItem.value, code);
                        if (cityList.length > 0) {
                          console.log(`Ciudades encontradas con código ${code}:`, cityList);
                          break;
                        }
                      }
                    }
                    
                    const formattedCities = cityList.map((city) => ({
                      value: city.name,
                      label: city.name
                    }));
                    
                    console.log('Ciudades finales:', formattedCities);
                    console.log('Total de ciudades:', formattedCities.length);
                    
                    // Forzar actualización del estado
                    setCities([]);
                    setTimeout(() => {
                      setCities(formattedCities);
                    }, 50);
                    
                    if (formattedCities.length === 0) {
                      console.warn('No se encontraron ciudades para esta región. Esto puede ser un problema con la librería country-state-city.');
                    }
                  }
                } else {
                  setCities([]);
                }
              }}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              disabled={!(editedValues.nationality || guestProfile?.nationality)}
            >
              <option value="">Seleccionar región...</option>
              {states.map(state => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          ) : type === 'citySelect' ? (
            <select
              value={(() => {
                // Si está en modo edición, usar editedValues.city
                if (isEditing && editedValues.city !== undefined) {
                  return editedValues.city;
                }
                // Si no está editando, usar el valor del perfil
                return guestProfile?.city || '';
              })()}
              onChange={(e) => handleCityChange(e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              disabled={!(editedValues.nationality || guestProfile?.nationality) || !(editedValues.region || guestProfile?.region)}
            >
              <option value="">Seleccionar ciudad...</option>
              {cities.map(city => (
                <option key={city.value} value={city.value}>
                  {city.label}
                </option>
              ))}
            </select>
          ) : type === 'textarea' ? (
            <textarea
              value={editedValue}
              onChange={(e) => setEditedValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          ) : type === 'checkbox' ? (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={editedValue}
                onChange={(e) => setEditedValues(prev => ({ ...prev, [fieldName]: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">{editedValue ? 'Sí' : 'No'}</span>
            </div>
          ) : (
            <Input
              type={type}
              value={editedValue}
              onChange={(e) => {
                if (fieldName === 'identificationNumber') {
                  handleRutChange(e.target.value);
                } else {
                  setEditedValues(prev => ({ ...prev, [fieldName]: e.target.value }));
                }
              }}
              placeholder={fieldName === 'identificationNumber' ? '12.345.678-9' : undefined}
              className={error ? "border-destructive" : ""}
            />
          )}
          
          {error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditField(fieldName)}
            className="h-6 w-6 p-0"
          >
            <PencilIcon className="h-3 w-3" />
          </Button>
        </div>
        <div className="font-medium">
          {type === 'checkbox' 
            ? (value ? 'Sí' : 'No')
            : type === 'date' && value
              ? formatDate(value)
              : fieldName === 'gender'
                ? (value === 'male' ? 'Masculino' : value === 'female' ? 'Femenino' : value === 'other' ? 'Otro' : formatData(value))
                : fieldName === 'status'
                  ? (
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${value === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        {value === 'active' ? 'Activo' : value === 'inactive' ? 'Inactivo' : formatData(value)}
                      </div>
                    )
                  : formatData(value)
          }
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Huéspedes</h1>
      </div>

      {/* Panel de búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MagnifyingGlassIcon className="h-6 w-6" />
            Buscar Huésped
          </CardTitle>
          <CardDescription>
            Busca por RUT, pasaporte, nombre o email del huésped
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Ingresa RUT, nombre, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button 
              onClick={() => searchGuests(1)}
              disabled={searchLoading}
            >
              {searchLoading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados de búsqueda */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {searchLoading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Buscando huéspedes...</p>
          </CardContent>
        </Card>
      ) : guests.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Resultados de búsqueda</CardTitle>
            <CardDescription>
              {guestsMeta.totalCount || guests.length} huésped{(guestsMeta.totalCount || guests.length) !== 1 ? 'es' : ''} encontrado{(guestsMeta.totalCount || guests.length) !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RUT/Pasaporte</TableHead>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Reservas</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guests.map((guest) => (
                  <TableRow key={guest.id}>
                    <TableCell className="font-mono">
                      {guest.identificationNumber}
                    </TableCell>
                    <TableCell>{guest.fullName}</TableCell>
                    <TableCell>{guest.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {guest.totalReservations} reserva{guest.totalReservations !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {guest.createdAt ? formatDate(guest.createdAt) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectGuest(guest)}
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        Ver Historial
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Paginación */}
            {guestsMeta.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!guestsMeta.hasPrevPage}
                  onClick={() => searchGuests(guestsMeta.page - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
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
          </CardContent>
        </Card>
      ) : searchTerm && !searchLoading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No se encontraron huéspedes con el término "{searchTerm}"
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Modal de perfil del huésped */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Historial de {selectedGuest?.fullName}
            </DialogTitle>
            <DialogDescription>
              {selectedGuest?.identificationNumber}
            </DialogDescription>
          </DialogHeader>

          {profileLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando perfil...</p>
            </div>
          ) : guestProfile ? (
            <Tabs defaultValue="active-reservation" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="active-reservation">Reserva Activa</TabsTrigger>
                <TabsTrigger value="profile">Datos del Huésped</TabsTrigger>
                <TabsTrigger value="reservations">Historial de Reservas</TabsTrigger>
              </TabsList>

              {/* Indicador de rol actual (comentado para futura implementación) */}
              {/* 
              <div className="mb-4 p-2 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  Conectado como: <Badge variant="outline">{user?.role === 'administrator' ? 'Administrador' : 'Recepcionista'}</Badge>
                  {user?.role === 'receptionist' && ' - Edición limitada a campos de contacto y preferencias'}
                </p>
              </div>
              */}

              {/* Tab 1: Reserva Activa */}
              <TabsContent value="active-reservation" className="space-y-4">
                {guestProfile?.activeReservation ? (
                  <div className="space-y-4">
                    {/* Información de la reserva activa */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CalendarIcon className="h-5 w-5" />
                          Reserva Activa - {guestProfile.activeReservation.code}
                        </CardTitle>
                        <CardDescription>
                          Estado: <Badge variant={guestProfile.activeReservation.status === 'confirmed' ? 'default' : 'secondary'}>
                            {guestProfile.activeReservation.status === 'confirmed' ? 'Confirmada' : 
                             guestProfile.activeReservation.status === 'in_progress' ? 'En progreso' : 
                             guestProfile.activeReservation.status}
                          </Badge>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Fechas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Check-in</Label>
                            <p className="font-medium">
                              {format(parseISO(guestProfile.activeReservation.checkInDate), 'PPP', { locale: es })}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Check-out</Label>
                            <p className="font-medium">
                              {format(parseISO(guestProfile.activeReservation.checkOutDate), 'PPP', { locale: es })}
                            </p>
                          </div>
                        </div>

                        {/* Información financiera */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-primary">
                              ${(guestProfile.activeReservation.totalAmount || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">Total Reserva</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                              ${(guestProfile.activeReservation.paidAmount || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">Saldo Abonado</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-orange-600">
                              ${(guestProfile.activeReservation.pendingAmount || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
                          </div>
                        </div>

                        {/* Huéspedes */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Huéspedes en esta reserva ({guestProfile.activeReservation.guestCount})</Label>
                          <div className="space-y-2">
                            {/* Huésped principal */}
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{guestProfile.activeReservation.mainGuest.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {guestProfile.activeReservation.mainGuest.isMainGuest ? 'Huésped Principal (quien reservó)' : 'Huésped Principal'}
                                </p>
                              </div>
                              <Badge variant="outline">Principal</Badge>
                            </div>
                            
                            {/* Huéspedes adicionales */}
                            {guestProfile.activeReservation.additionalGuests.map((guest, index) => (
                              <div key={guest.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex-1">
                                  <p className="font-medium">{guest.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatData(guest.email)} • {formatData(guest.phone)}
                                  </p>
                                  {guest.isCurrentGuest && (
                                    <Badge variant="outline" className="mt-1">Huésped Actual</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">Adicional</Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSelectAdditionalGuest(guest)}
                                    className="h-8"
                                  >
                                    <EyeIcon className="h-4 w-4 mr-1" />
                                    Ver Detalles
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Habitaciones */}
                        {guestProfile.activeReservation.rooms.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Habitaciones ({guestProfile.activeReservation.rooms.length})</Label>
                            <div className="space-y-2">
                              {guestProfile.activeReservation.rooms.map((room, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div>
                                    <p className="font-medium">Habitación {room.roomNumber}</p>
                                    <p className="text-sm text-muted-foreground">{room.roomType}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">${room.subtotal.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">${room.unitPrice.toLocaleString()}/noche</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Servicios */}
                        {guestProfile.activeReservation.services.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Servicios ({guestProfile.activeReservation.services.length})</Label>
                            <div className="space-y-2">
                              {guestProfile.activeReservation.services.map((service, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div>
                                    <p className="font-medium">{service.name}</p>
                                    <p className="text-sm text-muted-foreground">Cantidad: {service.quantity}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">${service.subtotal.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">${service.unitPrice.toLocaleString()} c/u</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Pagos realizados */}
                        {guestProfile.activeReservation.payments.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Pagos Realizados</Label>
                            <div className="space-y-2">
                              {guestProfile.activeReservation.payments.map((payment, index) => (
                                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div>
                                    <p className="font-medium">${payment.amount.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {payment.method} • {format(parseISO(payment.createdAt), 'PPp', { locale: es })}
                                      {payment.isDeposit && ' • Depósito'}
                                    </p>
                                  </div>
                                  <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                                    {payment.status === 'completed' ? 'Completado' : payment.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Sin reserva activa</h3>
                      <p className="text-muted-foreground">
                        Este huésped no tiene ninguna reserva activa o pendiente en este momento.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab 2: Información Personal */}
              <TabsContent value="profile" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Información básica */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Datos Personales</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {renderEditableField('firstName', 'Nombre', guestProfile.firstName)}
                      {renderEditableField('paternalLastName', 'Apellido Paterno', guestProfile.paternalLastName)}
                      {renderEditableField('maternalLastName', 'Apellido Materno', guestProfile.maternalLastName)}
                      {renderEditableField('identificationNumber', 'RUT/Pasaporte', guestProfile.identificationNumber)}
                      {renderEditableField('email', 'Email', guestProfile.email, 'email')}
                      {renderEditableField('phoneNumber', 'Teléfono', guestProfile.phone, 'tel')}
                      {renderEditableField('gender', 'Género', guestProfile.gender, 'select', [
                        { value: 'masculino', label: 'Masculino' },
                        { value: 'femenino', label: 'Femenino' },
                        { value: 'no_binario', label: 'No binario' },
                        { value: 'prefiero_no_decir', label: 'Prefiero no decir' }
                      ])}
                      {renderEditableField('birthDate', 'Fecha de Nacimiento', guestProfile.birthDate, 'date')}
                      {guestProfile.birthDate && !editingStates.birthDate && (
                        <div className="mt-2">
                          <Label className="text-xs text-muted-foreground">Edad Calculada</Label>
                          <p className="font-medium">
                            {calculateAge(guestProfile.birthDate)}
                          </p>
                        </div>
                      )}
                      {renderEditableField('registrationDate', 'Fecha de Registro', guestProfile.registrationDate, 'date', null, true)}
                    </CardContent>
                  </Card>

                  {/* Ubicación y detalles */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Ubicación y Preferencias</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {renderEditableField('nationality', 'País', guestProfile.nationality, 'countrySelect')}
                      {renderEditableField('region', 'Región', guestProfile.region, 'stateSelect')}
                      {renderEditableField('city', 'Ciudad', guestProfile.city, 'citySelect')}
                      <Separator />
                      {renderEditableField('specialRequests', 'Solicitudes especiales', guestProfile.specialRequests, 'textarea')}
                      
                      {/* Observaciones editables - mantener implementación existente */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs text-muted-foreground">Observaciones</Label>
                          {!isEditingObservations ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleEditObservations}
                              className="h-6 w-6 p-0"
                            >
                              <PencilIcon className="h-3 w-3" />
                            </Button>
                          ) : (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSaveObservations}
                                className="h-6 w-6 p-0 text-green-600"
                              >
                                <CheckIcon className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEditObservations}
                                className="h-6 w-6 p-0 text-red-600"
                              >
                                <XCircleIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {isEditingObservations ? (
                          <textarea
                            value={editedObservations}
                            onChange={(e) => setEditedObservations(e.target.value)}
                            placeholder="Ingrese observaciones sobre el huésped..."
                            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        ) : (
                          <p className="text-sm min-h-[40px]">
                            {formatData(guestProfile.observations, "Sin observaciones")}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Estadísticas Financieras y de Reservas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Estadísticas Generales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-primary">
                          {guestProfile.stats.totalReservations}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Reservas</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          {guestProfile.stats.completedReservations}
                        </p>
                        <p className="text-sm text-muted-foreground">Completadas</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">
                          {(guestProfile.stats.pendingReservations || 0) + (guestProfile.stats.inProgressReservations || 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Activas/Pendientes</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">
                          {guestProfile.stats.canceledReservations || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Canceladas</p>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-2 mb-4">
                      <h4 className="font-medium text-sm">Información Financiera - Resumen General</h4>
                      <p className="text-xs text-muted-foreground">Total cobrado de reservas completadas vs. saldo pendiente de reservas activas</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          ${(guestProfile.stats.completedPaidAmount || 0).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Cobrado (Completadas)</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">
                          ${(guestProfile.stats.activePendingAmount || 0).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">Saldo Pendiente (Activas)</p>
                      </div>
                    </div>

                    {/* Información financiera de reservas activas/pendientes */}
                    {guestProfile.activeReservation && (
                      <>
                        <Separator className="my-4" />
                        
                        <div className="space-y-2 mb-4">
                          <h4 className="font-medium text-sm">Información Financiera - Reserva Activa</h4>
                          <p className="text-xs text-muted-foreground">Información de la reserva en curso o pendiente</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">
                              ${(guestProfile.activeReservation.totalAmount || 0).toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">Saldo Total</p>
                          </div>
                          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">
                              ${(guestProfile.activeReservation.paidAmount || 0).toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">Saldo Abonado</p>
                          </div>
                          <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
                            <p className="text-2xl font-bold text-orange-600">
                              ${(guestProfile.activeReservation.pendingAmount || 0).toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">Saldo Pendiente</p>
                          </div>
                        </div>

                        {/* Formas de pago utilizadas en reserva activa */}
                        {guestProfile.activeReservation.payments && guestProfile.activeReservation.payments.length > 0 && (
                          <div className="mt-4">
                            <h5 className="font-medium text-sm mb-2">Formas de Pago Utilizadas</h5>
                            <div className="flex flex-wrap gap-2">
                              {[...new Set(guestProfile.activeReservation.payments.map(p => p.method))].map((method, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {method}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Estado del Sistema */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Estado del Sistema</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {renderEditableField('status', 'Estado del Huésped', guestProfile.status, 'select', [
                      { value: 'active', label: 'Activo' },
                      { value: 'inactive', label: 'Inactivo' }
                    ])}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 3: Historial de Reservas - Vista Resumida */}
              <TabsContent value="reservations" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      Historial de Reservas
                      <Button
                        onClick={() => handleViewFullHistory(selectedGuest?.identificationNumber)}
                        className="text-sm"
                      >
                        Ver Historial Completo
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      Últimas reservas del huésped. Haz clic en "Ver Historial Completo" para más detalles.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {reservationsLoading ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Cargando reservas...</p>
                      </div>
                    ) : guestReservations.length > 0 ? (
                      <div className="space-y-4">
                        {guestReservations.slice(0, 5).map((reservation) => (
                          <Card key={reservation.id} className="border-l-4 border-l-primary">
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Badge variant={getStatusVariant(reservation.status)}>
                                    {statusTranslations[reservation.status] || reservation.status}
                                  </Badge>
                                  <span className="font-mono text-sm font-medium">{reservation.code}</span>
                                  {reservation.currentGuestRole && (
                                    <Badge variant={reservation.currentGuestRole === 'principal' ? 'default' : 'secondary'}>
                                      {reservation.currentGuestRole === 'principal' ? 'Huésped Principal' : 'Huésped Adicional'}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewFullHistory(selectedGuest?.identificationNumber, reservation.code)}
                                >
                                  Ver Detalles
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Fechas</Label>
                                  <p>{formatDate(reservation.checkInDate)} - {formatDate(reservation.checkOutDate)}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Total</Label>
                                  <p className="font-medium">${(reservation.totalAmount || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Huéspedes</Label>
                                  <p>{reservation.guestCount} persona{reservation.guestCount !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        
                        {guestReservations.length > 5 && (
                          <Card className="border-dashed">
                            <CardContent className="pt-6 text-center">
                              <p className="text-sm text-muted-foreground mb-3">
                                Y {guestReservations.length - 5} reserva{guestReservations.length - 5 !== 1 ? 's' : ''} más...
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => handleViewFullHistory(selectedGuest?.identificationNumber)}
                              >
                                Ver Todas las Reservas
                              </Button>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium mb-2">Sin reservas</h3>
                          <p className="text-muted-foreground mb-4">
                            Este huésped no tiene reservas registradas.
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => handleViewFullHistory(selectedGuest?.identificationNumber)}
                          >
                            Ir al Historial Completo
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No se pudo cargar la información del huésped</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para Huésped Adicional */}
      <Dialog open={isAdditionalGuestModalOpen} onOpenChange={setIsAdditionalGuestModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Detalles del Huésped
            </DialogTitle>
            <DialogDescription>
              Información detallada del huésped adicional
            </DialogDescription>
          </DialogHeader>
          
          {selectedAdditionalGuest && (
            <div className="space-y-6">
              {/* Información Personal */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Datos Personales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nombre Completo</Label>
                    <p className="font-medium">
                      {selectedAdditionalGuest.firstName} {selectedAdditionalGuest.paternalLastName} {selectedAdditionalGuest.maternalLastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">RUT/Pasaporte</Label>
                    <p className="font-mono">{formatData(selectedAdditionalGuest.identificationNumber)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p>{formatData(selectedAdditionalGuest.email)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Teléfono</Label>
                    <p>{formatData(selectedAdditionalGuest.phone)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Género</Label>
                    <p>{formatData(selectedAdditionalGuest.gender === 'male' ? 'Masculino' : selectedAdditionalGuest.gender === 'female' ? 'Femenino' : selectedAdditionalGuest.gender === 'other' ? 'Otro' : selectedAdditionalGuest.gender)}</p>
                  </div>
                  {selectedAdditionalGuest.birthDate && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Edad</Label>
                      <p className="font-medium">
                        {calculateAge(selectedAdditionalGuest.birthDate)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Nacido el {formatDate(selectedAdditionalGuest.birthDate)}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground">Fecha de registro</Label>
                    <p>{formatData(selectedAdditionalGuest.registrationDate ? formatDate(selectedAdditionalGuest.registrationDate) : null)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">País</Label>
                    <p>{formatData(selectedAdditionalGuest.nationality)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Región</Label>
                    <p>{formatData(selectedAdditionalGuest.region)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Ciudad</Label>
                    <p>{formatData(selectedAdditionalGuest.city)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Botón cerrar */}
              <div className="flex justify-end pt-4">
                <Button onClick={handleCloseAdditionalGuestModal} variant="outline">
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GuestHistory;