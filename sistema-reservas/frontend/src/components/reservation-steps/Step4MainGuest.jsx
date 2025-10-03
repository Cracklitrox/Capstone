import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Separator } from '@/components/ui/Separator';
import { Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { guestsService } from '@/services/guests';
import { validateRutFormat, validateRutDv, parseRut } from '@/lib/rutValidator';

const Step4MainGuest = ({ data, onUpdate, onNext, onBack }) => {
  const [searchMode, setSearchMode] = useState(true);
  const [nationality, setNationality] = useState('chileno');
  const [rutSearch, setRutSearch] = useState('');
  const [rutDvSearch, setRutDvSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [guestFound, setGuestFound] = useState(null);
  const [creating, setCreating] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    rut: '',
    rutDv: '',
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
    commune: '',
    travelsWithChildren: false,
    specialRequests: '',
    observations: '',
    nationality: 'chileno',
  });

  const handleSearchGuest = async () => {
    if (nationality === 'chileno') {
      if (!validateRutFormat(rutSearch)) {
        toast.error('Formato de RUT inválido');
        return;
      }

      if (!validateRutDv(rutSearch, rutDvSearch)) {
        toast.error('Dígito verificador incorrecto');
        return;
      }
    }

    setSearching(true);
    try {
      const result = await guestsService.searchByRut(rutSearch, rutDvSearch);

      if (result.found) {
        setGuestFound(result.guest);
        toast.success('Huésped encontrado');
      } else {
        setGuestFound(null);
        toast.info('Huésped no encontrado. Complete el formulario para registrarlo.');
        setSearchMode(false);
        setFormData(prev => ({
          ...prev,
          rut: rutSearch,
          rutDv: rutDvSearch,
          nationality,
        }));
      }
    } catch (error) {
      console.error('Error al buscar huésped:', error);
      toast.error('Error al buscar huésped');
    } finally {
      setSearching(false);
    }
  };

  const handleUseFoundGuest = () => {
    onUpdate({ mainGuest: guestFound });
    onNext();
  };

  const handleCreateGuest = async () => {
    // Validaciones
    if (!formData.firstName || !formData.paternalLastName || !formData.email) {
      toast.error('Nombre, apellido paterno y email son obligatorios');
      return;
    }

    if (nationality === 'chileno') {
      if (!validateRutFormat(formData.rut)) {
        toast.error('Formato de RUT inválido');
        return;
      }

      if (!validateRutDv(formData.rut, formData.rutDv)) {
        toast.error('Dígito verificador incorrecto');
        return;
      }
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(formData.email)) {
      toast.error('Email inválido');
      return;
    }

    setCreating(true);
    try {
      const result = await guestsService.createGuest(formData);
      toast.success('Huésped registrado exitosamente');
      
      onUpdate({ 
        mainGuest: {
          id: result.guest.id,
          firstName: result.guest.firstName,
          paternalLastName: result.guest.paternalLastName,
          email: result.guest.email,
        }
      });
      onNext();
    } catch (error) {
      console.error('Error al crear huésped:', error);
      toast.error(error.response?.data?.message || 'Error al crear huésped');
    } finally {
      setCreating(false);
    }
  };

  const updateFormField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
            <h3 className="font-semibold text-foreground">Buscar Huésped Existente</h3>

            {/* Nationality Selection */}
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

            {/* RUT/Passport Search */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-2">
                <Label>{nationality === 'chileno' ? 'RUT' : 'Pasaporte'}</Label>
                <Input
                  value={rutSearch}
                  onChange={(e) => setRutSearch(e.target.value)}
                  placeholder={nationality === 'chileno' ? '12345678' : 'ABC123456'}
                  maxLength={nationality === 'chileno' ? 8 : 20}
                />
              </div>
              {nationality === 'chileno' && (
                <div className="space-y-2">
                  <Label>DV</Label>
                  <Input
                    value={rutDvSearch}
                    onChange={(e) => setRutDvSearch(e.target.value.toUpperCase())}
                    placeholder="9"
                    maxLength={1}
                  />
                </div>
              )}
            </div>

            <Button
              onClick={handleSearchGuest}
              disabled={searching || !rutSearch || (nationality === 'chileno' && !rutDvSearch)}
              className="w-full"
            >
              <Search className="mr-2 h-4 w-4" />
              {searching ? 'Buscando...' : 'Buscar'}
            </Button>

            {guestFound && (
              <Card className="border-primary bg-primary/5">
                <CardContent className="pt-4 space-y-2">
                  <p className="font-semibold text-foreground">✓ Huésped encontrado:</p>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Nombre:</span> {guestFound.firstName} {guestFound.paternalLastName}</p>
                    <p><span className="font-medium">Email:</span> {guestFound.email}</p>
                    <p><span className="font-medium">Teléfono:</span> {guestFound.phoneNumber || 'N/A'}</p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleUseFoundGuest} className="flex-1">
                      Usar estos datos
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setGuestFound(null);
                        setRutSearch('');
                        setRutDvSearch('');
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
              <h3 className="font-semibold text-foreground">Registrar Nuevo Huésped</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchMode(true)}
              >
                Volver a búsqueda
              </Button>
            </div>

            {/* Nationality */}
            <div className="space-y-2">
              <Label>Nacionalidad *</Label>
              <Select 
                value={formData.nationality} 
                onValueChange={(val) => updateFormField('nationality', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chileno">Chileno</SelectItem>
                  <SelectItem value="extranjero">Extranjero</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* RUT / Passport */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-2">
                <Label>{formData.nationality === 'chileno' ? 'RUT *' : 'Pasaporte *'}</Label>
                <Input
                  value={formData.rut}
                  onChange={(e) => updateFormField('rut', e.target.value)}
                  placeholder={formData.nationality === 'chileno' ? '12345678' : 'ABC123456'}
                />
              </div>
              {formData.nationality === 'chileno' && (
                <div className="space-y-2">
                  <Label>DV *</Label>
                  <Input
                    value={formData.rutDv}
                    onChange={(e) => updateFormField('rutDv', e.target.value.toUpperCase())}
                    placeholder="9"
                    maxLength={1}
                  />
                </div>
              )}
            </div>

            {/* Personal Data */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => updateFormField('firstName', e.target.value)}
                  placeholder="Juan"
                />
              </div>
              <div className="space-y-2">
                <Label>Apellido Paterno *</Label>
                <Input
                  value={formData.paternalLastName}
                  onChange={(e) => updateFormField('paternalLastName', e.target.value)}
                  placeholder="Pérez"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Apellido Materno</Label>
              <Input
                value={formData.maternalLastName}
                onChange={(e) => updateFormField('maternalLastName', e.target.value)}
                placeholder="González"
              />
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormField('email', e.target.value)}
                  placeholder="ejemplo@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={formData.phoneNumber}
                  onChange={(e) => updateFormField('phoneNumber', e.target.value)}
                  placeholder="+56 9 1234 5678"
                />
              </div>
            </div>

            {/* Optional Data */}
            <Separator />
            <h4 className="font-medium text-foreground">Datos Opcionales</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Nacimiento</Label>
                <Input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => updateFormField('birthDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Género</Label>
                <Select 
                  value={formData.gender} 
                  onValueChange={(val) => updateFormField('gender', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Femenino</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>País</Label>
                <Input
                  value={formData.country}
                  onChange={(e) => updateFormField('country', e.target.value)}
                  placeholder="Chile"
                />
              </div>
              <div className="space-y-2">
                <Label>Región</Label>
                <Input
                  value={formData.region}
                  onChange={(e) => updateFormField('region', e.target.value)}
                  placeholder="Metropolitana"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => updateFormField('city', e.target.value)}
                  placeholder="Santiago"
                />
              </div>
              <div className="space-y-2">
                <Label>Comuna</Label>
                <Input
                  value={formData.commune}
                  onChange={(e) => updateFormField('commune', e.target.value)}
                  placeholder="Las Condes"
                />
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-2">
              <Label>Peticiones Especiales</Label>
              <Input
                value={formData.specialRequests}
                onChange={(e) => updateFormField('specialRequests', e.target.value)}
                placeholder="Ej: Cama extra, cuna, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Input
                value={formData.observations}
                onChange={(e) => updateFormField('observations', e.target.value)}
                placeholder="Alergias, preferencias, etc."
              />
            </div>

            <Button
              onClick={handleCreateGuest}
              disabled={creating}
              className="w-full"
            >
              {creating ? 'Registrando...' : 'Guardar y Continuar'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Volver
        </Button>
      </div>
    </div>
  );
};

export default Step4MainGuest;