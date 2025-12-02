import React, { useState, useEffect } from 'react';
import { PencilIcon, Loader2, X } from 'lucide-react';
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
import { guestHistoryService } from '@/services/guestHistory';

/**
 * EditGuestForm Component
 *
 * Modal standalone para editar un huésped existente
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Estado del modal
 * @param {Function} props.onClose - Callback para cerrar el modal
 * @param {Function} props.onSuccess - Callback al editar exitosamente
 * @param {string} props.guestId - ID del huésped a editar
 */
const EditGuestForm = ({
    isOpen,
    onClose,
    onSuccess,
    guestId,
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
        country: '',
        region: '',
        city: '',
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Cargar datos del huésped al abrir
    useEffect(() => {
        const loadGuestData = async () => {
            if (isOpen && guestId) {
                setIsLoading(true);
                try {
                    const response = await guestHistoryService.getGuestProfile(guestId);
                    if (response.found && response.profile) {
                        const guest = response.profile;
                        setFormData({
                            identificationNumber: guest.identificationNumber || '',
                            firstName: guest.firstName || '',
                            paternalLastName: guest.paternalLastName || '',
                            maternalLastName: guest.maternalLastName || '',
                            email: guest.email || '',
                            phoneNumber: guest.phone || '',
                            birthDate: guest.birthDate ? guest.birthDate.split('T')[0] : '',
                            gender: guest.gender || 'unspecified',
                            country: guest.nationality || '',
                            region: guest.region || '',
                            city: guest.city || '',
                        });
                    }
                } catch (error) {
                    toast.error("Error al cargar datos del huésped");
                    console.error(error);
                    onClose();
                } finally {
                    setIsLoading(false);
                }
            }
        };

        loadGuestData();
        setErrors({});
    }, [isOpen, guestId, onClose]);

    // Manejo de cambios
    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: null }));
        }
    };

    // Validaciones
    const validateForm = () => {
        const newErrors = {};

        // RUT (Ya no se valida formato porque es read-only, solo que exista)
        if (!formData.identificationNumber) {
            newErrors.identificationNumber = 'RUT es obligatorio';
        }

        // Nombre
        if (!formData.firstName.trim()) {
            newErrors.firstName = 'Nombre es obligatorio';
        } else if (formData.firstName.trim().length < 2) {
            newErrors.firstName = 'Nombre debe tener al menos 2 caracteres';
        }

        // Apellido Paterno
        if (!formData.paternalLastName.trim()) {
            newErrors.paternalLastName = 'Apellido paterno es obligatorio';
        } else if (formData.paternalLastName.trim().length < 2) {
            newErrors.paternalLastName = 'Apellido debe tener al menos 2 caracteres';
        }

        // Email
        if (!formData.email.trim()) {
            newErrors.email = 'Email es obligatorio';
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                newErrors.email = 'Email inválido';
            }
        }

        // Teléfono
        if (formData.phoneNumber && !/^\+?[\d\s()-]{8,15}$/.test(formData.phoneNumber)) {
            newErrors.phoneNumber = 'Teléfono inválido';
        }

        // Fecha de nacimiento
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

            const payload = {
                // identificationNumber no se envía porque no se debe modificar
                firstName: formData.firstName.trim(),
                paternalLastName: formData.paternalLastName.trim(),
                maternalLastName: formData.maternalLastName.trim(),
                email: formData.email.trim(),
                phone: formData.phoneNumber.trim(),
                birthDate: formData.birthDate,
                gender: formData.gender,
                nationality: formData.country.trim(),
                region: formData.region.trim(),
                city: formData.city.trim(),
            };

            await guestHistoryService.updateGuestProfile(guestId, payload);

            toast.success('Huésped actualizado exitosamente');
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Error al actualizar huésped');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PencilIcon className="w-5 h-5" />
                        Editar Huésped
                    </DialogTitle>
                    <DialogDescription>
                        Actualiza la información del huésped. Los campos marcados con * son obligatorios.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Sección 1: Identificación */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm text-muted-foreground border-b pb-2">
                                Información Personal
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* RUT */}
                                <div className="space-y-2">
                                    <Label htmlFor="edit-rut">
                                        RUT <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="edit-rut"
                                        type="text"
                                        value={formData.identificationNumber}
                                        disabled
                                        className="bg-muted opacity-70 cursor-not-allowed"
                                    />
                                </div>

                                {/* Nombre */}
                                <div className="space-y-2">
                                    <Label htmlFor="edit-firstName">
                                        Nombre <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="edit-firstName"
                                        type="text"
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
                                    <Label htmlFor="edit-paternalLastName">
                                        Apellido Paterno <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="edit-paternalLastName"
                                        type="text"
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
                                    <Label htmlFor="edit-maternalLastName">Apellido Materno</Label>
                                    <Input
                                        id="edit-maternalLastName"
                                        type="text"
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
                                    <Label htmlFor="edit-email">
                                        Email <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="edit-email"
                                        type="email"
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
                                    <Label htmlFor="edit-phoneNumber">Teléfono</Label>
                                    <Input
                                        id="edit-phoneNumber"
                                        type="tel"
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
                                    <Label htmlFor="edit-birthDate">Fecha de Nacimiento</Label>
                                    <Input
                                        id="edit-birthDate"
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
                                    <Label htmlFor="edit-gender">Género</Label>
                                    <Select
                                        value={formData.gender}
                                        onValueChange={(value) => handleChange('gender', value)}
                                    >
                                        <SelectTrigger id="edit-gender">
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
                                    <Label htmlFor="edit-country">País</Label>
                                    <Input
                                        id="edit-country"
                                        type="text"
                                        value={formData.country}
                                        onChange={(e) => handleChange('country', e.target.value)}
                                    />
                                </div>

                                {/* Región */}
                                <div className="space-y-2">
                                    <Label htmlFor="edit-region">Región</Label>
                                    <Input
                                        id="edit-region"
                                        type="text"
                                        value={formData.region}
                                        onChange={(e) => handleChange('region', e.target.value)}
                                    />
                                </div>

                                {/* Ciudad */}
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="edit-city">Ciudad</Label>
                                    <Input
                                        id="edit-city"
                                        type="text"
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
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                <X className="w-4 h-4" />
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <PencilIcon className="w-4 h-4" />
                                        Guardar Cambios
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default EditGuestForm;
