import React, { useEffect, useState } from "react"; // React y sus hooks para manejar estado y efectos secundarios.
import { CountrySelect, StateSelect, CitySelect } from "react-country-state-city"; // Componentes visuales de selección para país, estado y ciudad con UI lista para usar.
import { Country, State, City } from 'country-state-city'; // Utilidades para obtener la data de países, estados y ciudades de forma programática.
import "react-country-state-city/dist/react-country-state-city.css"; // Estilos por defecto para los selectores anteriores.
import { IdentificationIcon, PhoneIcon, UsersIcon, GlobeAltIcon, PencilSquareIcon, CakeIcon, MapPinIcon } from '@heroicons/react/24/outline'; // Íconos outline para usar en el perfil (rut, teléfono, género, ubicación, editar, etc.)
import axios from "axios"; // Cliente HTTP para consumir la API (peticiones GET/POST/PUT).
import Navbar from "./Navbar";   
import Sidebar from "./Sidebar"; 
import Footer from "./Footer";  
import { validateProfileForm } from './Validations'; // Función de validación para el formulario de perfil


// Componente principal de perfil de usuario.
const Profile = () => {
  const [countryid, setCountryid] = useState(0);
  const [stateid, setStateid] = useState(0);
  const [defaultValues, setDefaultValues] = useState({ country: null, state: null, city: null });
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
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

  // Estado para manejar la apertura/cierre del sidebar.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formErrors, setFormErrors] = useState({});

  // Efecto para obtener el perfil del usuario al montar el componente.
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Obtener el token JWT del almacenamiento local.
        const token = localStorage.getItem("token");
        if (!token) {
          setError("No se encontró token. Inicia sesión nuevamente.");
          return;
        }
        // Petición GET para obtener los datos del perfil.
        const response = await axios.get("/api/v1/auth/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Actualizar el estado con los datos del perfil.
        setProfile(response.data);
        setFormData({
          first_name: response.data.first_name || "",
          paternal_last_name: response.data.paternal_last_name || "",
          maternal_last_name: response.data.maternal_last_name || "",
          email: response.data.email || "",
          phone_number: response.data.phone_number || "",
          gender: response.data.gender || "",
          country: response.data.country || "",
          region: response.data.region || "",
          city: response.data.city || "",
        });
      } catch (err) {
        console.error("Error al obtener perfil:", err);
        setError("Error al obtener perfil. ¿Token expirado?");
      }
    };

    // Llamar a la función para obtener el perfil.
    fetchProfile();
  }, []);

  // Efecto para actualizar los valores por defecto de los selectores cuando se abre el modal.
  useEffect(() => {
    if (showModal && profile) {
      const allCountries = Country.getAllCountries();
      const savedCountry = allCountries.find(c => c.name === profile.country);

      // Si se encontró el país guardado, actualizar el estado.
      if (savedCountry) {
        setCountryid(savedCountry.id);

        // Buscar el estado/región guardado dentro del país seleccionado.
        const allStates = State.getStatesOfCountry(savedCountry.isoCode);
        const savedState = allStates.find(s => s.name === profile.region);

        // Si se encontró el estado, buscar la ciudad guardada dentro del estado seleccionado.
        if (savedState) {
          setStateid(savedState.id);
          // Buscar la ciudad guardada dentro del estado seleccionado.
          const allCities = City.getCitiesOfState(savedCountry.isoCode, savedState.isoCode);
          const savedCity = allCities.find(c => c.name === (profile.city));
          // Actualizar los valores por defecto para país, estado y ciudad.
          setDefaultValues({ country: savedCountry, state: savedState, city: savedCity || null });
        } else {
          setDefaultValues({ country: savedCountry, state: null, city: null });
        }
        // Si no se encontró el estado, solo actualizar el país.
      } else {
        setDefaultValues({ country: null, state: null, city: null });
      }
    }
  }, [showModal, profile]);


  // Manejar cambios en los campos del formulario.
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    const formattedValue = value;

    // Actualiza el estado del formulario con el valor formateado.
    setFormData({
      ...formData,
      [name]: formattedValue,
    });
    // Limpia el error del campo específico que se está editando
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null,
      });
    }
  };

  // Manejar el envío del formulario con validaciones y manejo de errores.
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateProfileForm(formData);
    if (Object.keys(validationErrors).filter(key => validationErrors[key]).length > 0) {
      setFormErrors(validationErrors);
      return;
    }
    setFormErrors({});
    // Petición PUT para actualizar los datos del perfil.
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put("/api/v1/auth/profile", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Actualizar el estado con los nuevos datos del perfil.
      setProfile(response.data);
      setShowModal(false);
      setSuccessMessage("Datos actualizados correctamente");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error al actualizar perfil:", err.response);

      // --- LÓGICA PARA MANEJAR ERRORES DEL BACKEND ---
      if (err.response && err.response.status === 400) {
        // Si es un error de validación (400), leemos el mensaje.
        const message = err.response.data.message;
        const newErrors = {};
        if (message.includes('correo')) {
          newErrors.email = message; // Asigna el error al campo email.
        } else if (message.includes('teléfono')) {
          newErrors.phone_number = message; // Asigna el error al campo teléfono.
        } else {
          // Para otros errores de 400, los mostramos en un campo genérico (opcional)
          newErrors.general = message;
        }
        setFormErrors(newErrors);
      } else {
        // Si es un error 500 o de red, mostramos el error genérico.
        setError("Error al actualizar perfil. Intenta de nuevo más tarde.");
      }
    }
  };

  // Renderizado condicional basado en el estado de carga y errores.
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-red-600 text-lg">
        {error}
      </div>
    );
  }

  // Mostrar un indicador de carga mientras se obtienen los datos del perfil.
  if (!profile) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600 text-lg">
        Cargando perfil...
      </div>
    );
  }
  // Construcción del nombre completo.
  const fullName = [
    profile.first_name,
    profile.paternal_last_name,
    profile.maternal_last_name,
  ]

    // Une las partes del nombre, omitiendo cualquier parte que sea null o undefined.
    .filter(Boolean)
    .join(" ");

  // Función para mostrar "Sin datos" si el valor está vacío o es nulo.
  const checkEmpty = (value) => (value ? value : "Sin datos");
  // Renderizado del componente de perfil.
  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      <Navbar setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        {/*Se añade 'relative' para posicionar el mensaje de éxito correctamente. */}
        <main className="relative flex flex-1 items-center p-4 sm:p-8 bg-gray-100 overflow-y-auto">

          {/*Renderizado condicional del mensaje de éxito (Toast/Snackbar) */}
          {successMessage && (
            <div className="absolute top-5 right-5 z-50 bg-green-600 text-white text-sm font-bold px-4 py-3 rounded-md shadow-lg">
              {successMessage}
            </div>
          )}

          {/* Formulario de perfil */}
          {/* Contenedor principal gris centrado y bordes redondeados. */}
          <div className="bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 w-full">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-4xl font-bold shadow-inner">
                {profile.first_name?.charAt(0)}
              </div>
              {/* Nombre completo */}
              <h2 className="text-2xl sm:text-3xl font-semibold text-white mt-4" data-testid="full-name">
                {fullName}
              </h2>

              <p className="text-base text-gray-400">{profile.email}</p>
            </div>

            <div className="mt-8 max-w-md mx-auto border-t border-slate-700/50 pt-6">
              <ul className="space-y-4 text-sm">
                {/* Rut  */}
                <li className="flex items-center">
                  <IdentificationIcon className="h-5 w-5 text-slate-400 mr-3 flex-shrink-0" />
                  <span className="font-medium text-slate-400">Rut:</span>
                  <span className="ml-auto text-slate-200 font-mono">{checkEmpty(profile.rut)}-{checkEmpty(profile.rut_dv)}</span>
                </li>

                {/* Teléfono */}
                <li className="flex items-center">
                  <PhoneIcon className="h-5 w-5 text-slate-400 mr-3 flex-shrink-0" />
                  <span className="font-medium text-slate-400">Teléfono:</span>
                  <span className="ml-auto text-slate-200">{checkEmpty(profile.phone_number)}</span>
                </li>

                {/* Género */}
                <li className="flex items-center">
                  <UsersIcon className="h-5 w-5 text-slate-400 mr-3 flex-shrink-0" />
                  <span className="font-medium text-slate-400">Género:</span>
                  <span className="ml-auto text-slate-200">
                    {(() => {
                      const translateGender = (gender) => {
                        if (gender === 'male') return 'Hombre';
                        if (gender === 'female') return 'Mujer';
                        if (gender === 'other') return 'Otro';
                        return 'Sin datos';
                      };
                      return translateGender(profile.gender);
                    })()}
                  </span>
                </li>

                {/* País */}
                <li className="flex items-center">
                  <GlobeAltIcon className="h-5 w-5 text-slate-400 mr-3 flex-shrink-0" />
                  <span className="font-medium text-slate-400">País:</span>
                  <span className="ml-auto text-slate-200">{checkEmpty(profile.country)}</span>
                </li>

                {/* Región */}
                <li className="flex items-center">
                  <GlobeAltIcon className="h-5 w-5 text-slate-400 mr-3 flex-shrink-0" />
                  <span className="font-medium text-slate-400">Región:</span>
                  <span className="ml-auto text-slate-200">{checkEmpty(profile.region)}</span>
                </li>

                {/* Ciudad */}
                <li className="flex items-center">
                  <GlobeAltIcon className="h-5 w-5 text-slate-400 mr-3 flex-shrink-0" />
                  <span className="font-medium text-slate-400">Ciudad:</span>
                  <span className="ml-auto text-slate-200">{checkEmpty(profile.city)}</span>
                </li>

              </ul>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center justify-center gap-x-2 w-full sm:w-auto px-6 py-2.5 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors shadow-lg"
              >
                <PencilSquareIcon className="h-5 w-5" />
                Modificar datos
              </button>
            </div>
          </div>
        </main>
      </div>

      <Footer />

      {/* Formulario Modificar Datos */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] px-4 sm:px-6 lg:px-8 bg-slate-900 border border-slate-700/50 p-6 sm:p-8 rounded-2xl shadow-2xl text-slate-300 overflow-y-auto">
            <form onSubmit={handleSubmit} className="mt-8" data-testid="profile-form">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">

                {/* Campo Nombre */}
                <div className="sm:col-span-1">
                  <label htmlFor="first_name" className="block text-sm font-medium leading-6">Nombre</label>
                  <div className="mt-2">
                    <input
                      id="first_name"
                      type="text"
                      name="first_name"
                      value={formData.first_name || ''}
                      onChange={handleFormChange}
                      className="block w-full rounded-md border-0 bg-white/5 py-2 px-3 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 transition"
                    />
                    {formErrors.first_name && <p className="text-red-400 text-xs mt-2">{formErrors.first_name}</p>}
                  </div>
                </div>

                {/* Campo Apellido Paterno */}
                <div className="sm:col-span-1">
                  <label htmlFor="paternal_last_name" className="block text-sm font-medium leading-6">Apellido Paterno</label>
                  <div className="mt-2">
                    <input
                      id="paternal_last_name"
                      type="text"
                      name="paternal_last_name"
                      value={formData.paternal_last_name || ''}
                      onChange={handleFormChange}
                      className="block w-full rounded-md border-0 bg-white/5 py-2 px-3 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 transition"
                    />
                    {formErrors.paternal_last_name && <p className="text-red-400 text-xs mt-2">{formErrors.paternal_last_name}</p>}
                  </div>
                </div>

                {/* Campo Apellido Materno (ocupa el ancho completo) */}
                <div className="sm:col-span-2">
                  <label htmlFor="maternal_last_name" className="block text-sm font-medium leading-6">Apellido Materno</label>
                  <div className="mt-2">
                    <input
                      id="maternal_last_name"
                      type="text"
                      name="maternal_last_name"
                      value={formData.maternal_last_name || ''}
                      onChange={handleFormChange}
                      placeholder="Opcional"
                      className="block w-full rounded-md border-0 bg-white/5 py-2 px-3 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 transition placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Campo Correo Electrónico (ocupa el ancho completo) */}
                <div className="sm:col-span-2">
                  <label htmlFor="email" className="block text-sm font-medium leading-6">Correo Electrónico</label>
                  <div className="mt-2">
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleFormChange}
                      className="block w-full rounded-md border-0 bg-white/5 py-2 px-3 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 transition"
                    />
                    {formErrors.email && <p className="text-red-400 text-xs mt-2">{formErrors.email}</p>}
                  </div>
                </div>

                <div className="sm:col-span-1">
                  <label htmlFor="phone_number" className="block text-sm font-medium leading-6 text-slate-300">Teléfono</label>
                  <div className="mt-2">
                    <input
                      id="phone_number"
                      type="text"
                      name="phone_number"
                      value={formData.phone_number || ''}
                      onChange={handleFormChange}
                      placeholder="Opcional"
                      className="block w-full rounded-md border-0 bg-white/5 py-2 px-3 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 transition placeholder:text-slate-500"
                    />
                    {/* Esta línea le dice a React que muestre el error del teléfono si existe */}
                    {formErrors.phone_number && <p className="text-red-400 text-xs mt-2">{formErrors.phone_number}</p>}
                  </div>
                </div>

                {/* Género */}
                <div className="sm:col-span-1">
                  <label htmlFor="gender" className="block text-sm font-medium leading-6 text-slate-300">Género</label>
                  <div className="mt-2">
                    <select
                      name="gender"
                      value={formData.gender || ''}
                      onChange={handleFormChange}
                      className="block w-full appearance-none rounded-md border-0 bg-white/5 py-2 px-3 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 transition"
                      style={{
                        // Añade un ícono de flecha hacia abajo (la imagen) al lado derecho del select.
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center', // posición a la derecha y centrado verticalmente
                        backgroundRepeat: 'no-repeat', // no repetir la imagen
                        backgroundSize: '1.5em 1.5em', // tamaño del ícono
                      }}
                    >
                      {/* Se añaden clases a cada <option> para darles un fondo oscuro y texto claro. */}
                      <option className="text-slate-400 bg-slate-800" value="" disabled>Seleccione...</option>
                      <option className="text-white bg-slate-800" value="male">Hombre</option>
                      <option className="text-white bg-slate-800" value="female">Mujer</option>
                      <option className="text-white bg-slate-800" value="other">Otro</option>
                    </select>
                  </div>
                </div>

                {/* País */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium leading-6 text-slate-300">País</label>
                  <div className="mt-2">
                    <CountrySelect
                      defaultValue={defaultValues.country}
                      onChange={(e) => {
                        setCountryid(e.id);
                        setFormData({ ...formData, country: e.name, region: '', city: '' });
                      }}
                      isSearchable={false} // desactiva la edición de texto
                      placeHolder="Selecciona un País"
                      className="block w-full appearance-none rounded-md border-0 bg-slate-800 py-2 px-3 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-blue-500 transition"
                      menuPortalTarget={document.body} // evita problemas visuales con modales

                    />

                  </div>
                </div>

                {/* Región */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium leading-6 text-slate-300">Región</label>
                  <div className="mt-2">
                    <StateSelect
                      defaultValue={defaultValues.state}
                      countryid={countryid}
                      onChange={(e) => {
                        setStateid(e.id); //guarda el ID de la región seleccionada.
                        setFormData({ ...formData, region: e.name, city: '' }); // actualiza el estado del formulario con la región seleccionada.
                      }}
                      isSearchable={false} // Indica que el selector no permite escribir texto, solo seleccionar de la lista.
                      placeHolder="Selecciona una Región"
                      className="block w-full appearance-none rounded-md border-0 bg-slate-800 py-2 px-3 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-blue-500 transition"
                      menuPortalTarget={document.body} // evita problemas visuales con modales y no se corta 
                    />
                  </div>
                </div>

                {/* Ciudad */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium leading-6 text-slate-300">Ciudad</label>
                  <div className="mt-2">
                    <CitySelect
                      defaultValue={defaultValues.city}
                      countryid={countryid}
                      stateid={stateid}
                      onChange={(e) => {
                        setFormData({ ...formData, city: e.name });
                      }}
                      isSearchable={false}
                      placeHolder="Selecciona una Ciudad"
                      className="block w-full appearance-none rounded-md border-0 bg-slate-800 py-2 px-3 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-blue-500 transition"
                      menuPortalTarget={document.body}

                    />

                  </div>
                </div>

              </div>

              {/* Sirve para separar visualmente los campos de los botones. */}
              <div className="mt-8 border-t border-white/10 pt-6 flex justify-end gap-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-white/20 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={Object.values(formErrors).some(error => error)}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;