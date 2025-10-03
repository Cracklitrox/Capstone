import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, User, Search } from 'lucide-react';
import { toast } from 'sonner';
import { guestsService } from '@/services/guests';
import { validateRutFormat, validateRutDv } from '@/lib/rutValidator';

const Step5AdditionalGuests = ({ data, onUpdate, onNext, onBack }) => {
  const [additionalGuests, setAdditionalGuests] = useState(data.additionalGuests || []);
  const [currentGuestIndex, setCurrentGuestIndex] = useState(0);
  const [searchMode, setSearchMode] = useState(true);
  const [nationality, setNationality] = useState('chileno');
  const [rutSearch, setRutSearch] = useState('');
  const [rutDvSearch, setRutDvSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [guestFound, setGuestFound] = useState(null);
  const [creating, setCreating] = useState(false);

  const totalGuests = data.guests;
  const remainingGuests = totalGuests - 1; // -1 por el huésped principal

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
        toast.info('Huésped no encontrado. Complete el formulario.');
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
    const newGuests = [...additionalGuests];
    newGuests[currentGuestIndex] = guestFound;
    setAdditionalGuests(newGuests);
    
    toast.success(`Huésped ${currentGuestIndex + 2} agregado`);
    
    // Reset form
    setGuestFound(null);
    setRutSearch('');
    setRutDvSearch('');
    setSearchMode(true);
    
    // Move to next guest if there are more
    if (currentGuestIndex < remainingGuests - 1) {
      setCurrentGuestIndex(currentGuestIndex + 1);
    }
  };

  const handleCreateGuest = async () => {
    if (!formData.firstName || !formData.paternalLastName || !formData.email) {
      toast.error('Nombre, apellido paterno y email son obligatorios');
      return;
    }

    if (nationality === 'chileno') {
      if (!validateRutFormat(formData.rut) || !validateRutDv(formData.rut, formData.rutDv)) {
        toast.error('RUT inválido');
        return;
      }
    }

    setCreating(true);
    try {
      const result = await guestsService.createGuest(formData);
      
      const newGuests = [...additionalGuests];
      newGuests[currentGuestIndex] = {
        id: result.guest.id,
        firstName: result.guest.firstName,
        paternalLastName: result.guest.paternalLastName,
        email: result.guest.email,
      };
      setAdditionalGuests(newGuests);
      
      toast.success(`Huésped ${currentGuestIndex + 2} registrado`);
      
      // Reset form
      setFormData({
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
        observations: '',
        nationality: 'chileno',
      });
      setSearchMode(true);
      
      // Move to next guest
      if (currentGuestIndex < remainingGuests - 1) {
        setCurrentGuestIndex(currentGuestIndex + 1);
      }
    } catch (error) {
      console.error('Error al crear huésped:', error);
      toast.error(error.response?.data?.message || 'Error al crear huésped');
    } finally {
      setCreating(false);
    }
  };

  const handleContinue = () => {
    onUpdate({ additionalGuests });
    onNext();
  };

  const handleSkip = () => {
    if (additionalGuests.length === 0) {
      toast.info('Los huéspedes pueden registrarse después en el check-in');
    }
    onUpdate({ additionalGuests });
    onNext();
  };

  const updateFormField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Huéspedes Adicionales
        </h2>
        <p className="text-muted-foreground">
          Registre los {remainingGuests} huéspedes restantes (opcional)
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">
              <User className="h-3 w-3 mr-1" />
              Huésped Principal ✓
            </Badge>
            {Array.from({ length: remainingGuests }).map((_, index) => (
              <Badge
                key={index}
                variant={additionalGuests[index] ? 'default' : 'outline'}
              >
                {additionalGuests[index] ? (
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                ) : (
                  <User className="h-3 w-3 mr-1" />
                )}
                Huésped {index + 2}
                {additionalGuests[index] && ' ✓'}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Guest Form */}
      {currentGuestIndex < remainingGuests && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold text-foreground">
              Huésped {currentGuestIndex + 2} de {totalGuests}
            </h3>

            {searchMode ? (
              <>
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

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-2">
                    <Label>{nationality === 'chileno' ? 'RUT' : 'Pasaporte'}</Label>
                    <Input
                      value={rutSearch}
                      onChange={(e) => setRutSearch(e.target.value)}
                      placeholder={nationality === 'chileno' ? '12345678' : 'ABC123456'}
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
                  disabled={searching}
                  className="w-full"
                >
                  <Search className="mr-2 h-4 w-4" />
                  {searching ? 'Buscando...' : 'Buscar'}
                </Button>

                {guestFound && (
                  <Card className="border-primary bg-primary/5">
                    <CardContent className="pt-4 space-y-2">
                      <p className="font-semibold">✓ Huésped encontrado:</p>
                      <p className="text-sm">{guestFound.firstName} {guestFound.paternalLastName}</p>
                      <Button onClick={handleUseFoundGuest} className="w-full">
                        Usar estos datos
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Button
                  variant="outline"
                  onClick={() => setSearchMode(false)}
                  className="w-full"
                >
                  Registrar Nuevo
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchMode(true)}
                >
                  ← Volver a búsqueda
                </Button>

                {/* Simplified form */}
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-2">
                      <Label>RUT/Pasaporte *</Label>
                      <Input
                        value={formData.rut}
                        onChange={(e) => updateFormField('rut', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>DV</Label>
                      <Input
                        value={formData.rutDv}
                        onChange={(e) => updateFormField('rutDv', e.target.value)}
                        maxLength={1}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre *</Label>
                      <Input
                        value={formData.firstName}
                        onChange={(e) => updateFormField('firstName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Apellido Paterno *</Label>
                      <Input
                        value={formData.paternalLastName}
                        onChange={(e) => updateFormField('paternalLastName', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormField('email', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={formData.phoneNumber}
                      onChange={(e) => updateFormField('phoneNumber', e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={handleCreateGuest}
                    disabled={creating}
                    className="w-full"
                  >
                    {creating ? 'Guardando...' : 'Guardar Huésped'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Volver
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSkip}>
            {additionalGuests.length > 0 ? 'Continuar' : 'Omitir Restantes'}
          </Button>
          {additionalGuests.length === remainingGuests && (
            <Button onClick={handleContinue}>
              Continuar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step5AdditionalGuests;