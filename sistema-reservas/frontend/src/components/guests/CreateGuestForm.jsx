import React, { useState } from 'react';
import { UserPlus, Loader2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { toast } from 'sonner';
import {
  validateRutFormat,
  validateRutDv,
  formatRutInput,
  cleanRut,
} from '@/lib/rutValidator';

/**
 * CreateGuestForm Component
 *
 * Modal standalone para crear nuevo huésped
 * Reutilizable en cualquier parte de la aplicación
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Estado del modal
 * @param {Function} props.onClose - Callback para cerrar el modal
 * @param {Function} props.onSuccess - Callback al crear exitosamente (recibe el nuevo huésped)
 * @param {boolean} props.isMainGuest - Si es huésped principal (requiere email) (default: true)
 */
const CreateGuestForm = ({
  isOpen,
  onClose,
  onSuccess,
  isMainGuest = true,
}) => {
  const [formData, setFormData] = useState({
    identificationNumber: '',
    firstName: '',
    paternalLastName: '',
    maternalLastName: '',
    email: '',
    phoneNumber: '',
    birthDate: '',
    gender: '',
    country: 'Chile',
    region: '',
    city: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resetear formulario al cerrar
  const handleClose = () => {
    setFormData({
      identificationNumber: '',
      firstName: '',
      paternalLastName: '',
      maternalLastName: '',
      email: '',
      phoneNumber: '',
      birthDate: '',
      gender: '',
      country: 'Chile',
      region: '',
      city: '',
    });
    setErrors({});
    onClose();
  };

  // Manejo de cambios
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpiar error del campo al editar
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Manejo especial de RUT con formateo
  const handleRutChange = (value) => {
    const formatted = formatRutInput(value);
    handleChange('identificationNumber', formatted);
  };

  // Validaciones
  const validateForm = () => {
    const newErrors = {};

    // RUT (obligatorio y válido)
    if (!formData.identificationNumber) {
      newErrors.identificationNumber = 'RUT es obligatorio';
    } else {
      const cleaned = cleanRut(formData.identificationNumber);
      const rutPart = cleaned.slice(0, -1);
      const dvPart = cleaned.slice(-1);
      if (!validateRutFormat(rutPart) || !validateRutDv(rutPart, dvPart)) {
        newErrors.identificationNumber = 'RUT inválido';
      }
    }

    // Nombre (obligatorio)
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Nombre es obligatorio';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'Nombre debe tener al menos 2 caracteres';
    }

    // Apellido paterno (obligatorio)
    if (!formData.paternalLastName.trim()) {
      newErrors.paternalLastName = 'Apellido paterno es obligatorio';
    } else if (formData.paternalLastName.trim().length < 2) {
      newErrors.paternalLastName = 'Apellido debe tener al menos 2 caracteres';
    }

    // Email (obligatorio solo para huésped principal)
    if (isMainGuest) {
      if (!formData.email.trim()) {
        newErrors.email = 'Email es obligatorio para huésped principal';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          newErrors.email = 'Email inválido';
        }
      }
    } else if (formData.email.trim()) {
      // Si es huésped adicional pero proporcionó email, validarlo
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Email inválido';
      }
    }

    // Teléfono (opcional pero si se proporciona debe ser válido)
    if (formData.phoneNumber && !/^\+?[\d\s()-]{8,15}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Teléfono inválido (8-15 dígitos)';
    }

    // Fecha de nacimiento (opcional pero si se proporciona debe ser mayor de edad)
    if (formData.birthDate) {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18) {
        newErrors.birthDate = 'El huésped debe ser mayor de edad (18+)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor corrige los errores en el formulario');
      return;
    }

    try {
      setIsSubmitting(true);

      const token = localStorage.getItem('token');

      // Preparar datos para enviar (solo campos no vacíos)
      const payload = {
        identificationNumber: cleanRut(formData.identificationNumber),
        firstName: formData.firstName.trim(),
        paternalLastName: formData.paternalLastName.trim(),
        isMainGuest,
      };

      if (formData.maternalLastName.trim()) {
        payload.maternalLastName = formData.maternalLastName.trim();
      }

      if (formData.email.trim()) {
        payload.email = formData.email.trim();
      }

      if (formData.phoneNumber.trim()) {
        payload.phoneNumber = formData.phoneNumber.trim();
      }

      if (formData.birthDate) {
        payload.birthDate = formData.birthDate;
      }

      if (formData.gender) {
        payload.gender = formData.gender;
      }

      if (formData.country.trim()) {
        payload.country = formData.country.trim();
      }

      if (formData.region.trim()) {
        payload.region = formData.region.trim();
      }

      if (formData.city.trim()) {
        payload.city = formData.city.trim();
      }

      const response = await fetch('http://localhost:3001/api/v1/guests', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear huésped');
      }

      const data = await response.json();

      toast.success('Huésped creado exitosamente', {
        description: `${data.guest.first_name} ${data.guest.paternal_last_name}`,
      });

      handleClose();

      if (onSuccess) {
        onSuccess(data.guest);
      }
    } catch (error) {
      toast.error('Error al crear huésped', {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Nuevo Huésped
          </DialogTitle>
          <DialogDescription>
            {isMainGuest
              ? 'Crea un nuevo huésped principal. Los campos marcados con * son obligatorios.'
              : 'Crea un huésped adicional. El email es opcional.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sección 1: Identificación */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground border-b pb-2">
              Información Personal
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* RUT */}
              <div className="space-y-2">
                <Label htmlFor="rut">
                  RUT <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="rut"
                  type="text"
                  placeholder="12.345.678-9"
                  value={formData.identificationNumber}
                  onChange={(e) => handleRutChange(e.target.value)}
                  className={errors.identificationNumber ? 'border-red-500' : ''}
                />
                {errors.identificationNumber && (
                  <p className="text-xs text-red-500">{errors.identificationNumber}</p>
                )}
              </div>

              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Juan"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  className={errors.firstName ? 'border-red-500' : ''}
                />
                {errors.firstName && (
                  <p className="text-xs text-red-500">{errors.firstName}</p>
                )}
              </div>

              {/* Apellido Paterno */}
              <div className="space-y-2">
                <Label htmlFor="paternalLastName">
                  Apellido Paterno <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="paternalLastName"
                  type="text"
                  placeholder="Pérez"
                  value={formData.paternalLastName}
                  onChange={(e) => handleChange('paternalLastName', e.target.value)}
                  className={errors.paternalLastName ? 'border-red-500' : ''}
                />
                {errors.paternalLastName && (
                  <p className="text-xs text-red-500">{errors.paternalLastName}</p>
                )}
              </div>

              {/* Apellido Materno */}
              <div className="space-y-2">
                <Label htmlFor="maternalLastName">Apellido Materno</Label>
                <Input
                  id="maternalLastName"
                  type="text"
                  placeholder="González"
                  value={formData.maternalLastName}
                  onChange={(e) => handleChange('maternalLastName', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Contacto */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground border-b pb-2">
              Información de Contacto
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email {isMainGuest && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Teléfono */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Teléfono</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+56 9 1234 5678"
                  value={formData.phoneNumber}
                  onChange={(e) => handleChange('phoneNumber', e.target.value)}
                  className={errors.phoneNumber ? 'border-red-500' : ''}
                />
                {errors.phoneNumber && (
                  <p className="text-xs text-red-500">{errors.phoneNumber}</p>
                )}
              </div>
            </div>
          </div>

          {/* Sección 3: Datos Personales */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground border-b pb-2">
              Datos Adicionales
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Fecha de Nacimiento */}
              <div className="space-y-2">
                <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleChange('birthDate', e.target.value)}
                  className={errors.birthDate ? 'border-red-500' : ''}
                />
                {errors.birthDate && (
                  <p className="text-xs text-red-500">{errors.birthDate}</p>
                )}
              </div>

              {/* Género */}
              <div className="space-y-2">
                <Label htmlFor="gender">Género</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleChange('gender', value)}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unspecified">Sin especificar</SelectItem>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Femenino</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* País */}
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  type="text"
                  placeholder="Chile"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                />
              </div>

              {/* Región */}
              <div className="space-y-2">
                <Label htmlFor="region">Región</Label>
                <Input
                  id="region"
                  type="text"
                  placeholder="Metropolitana"
                  value={formData.region}
                  onChange={(e) => handleChange('region', e.target.value)}
                />
              </div>

              {/* Ciudad */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Santiago"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <X className="w-4 h-4" />
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Crear Huésped
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGuestForm;
