import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { User, Mail, Phone, Calendar, MapPin, Baby, MessageSquare } from 'lucide-react';

export const GuestDetailsModal = ({ guest, open, onOpenChange }) => {
  if (!guest) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificado';
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getGenderLabel = (gender) => {
    const labels = {
      male: 'Masculino',
      female: 'Femenino',
      other: 'Otro',
    };
    return labels[gender] || 'No especificado';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Detalles del Huésped
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header con nombre completo */}
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mx-auto mb-2">
              {guest.firstName?.charAt(0)}{guest.paternalLastName?.charAt(0)}
            </div>
            <h3 className="font-bold text-xl">
              {guest.firstName} {guest.paternalLastName} {guest.maternalLastName}
            </h3>
            <p className="text-sm text-muted-foreground">{guest.identificationNumber}</p>
          </div>

          <Separator />

          {/* Información de Contacto */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground">CONTACTO</h4>
            
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">{guest.email}</p>
              </div>
            </div>

            {guest.phoneNumber && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{guest.phoneNumber}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Información Personal */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground">INFORMACIÓN PERSONAL</h4>
            
            {guest.birthDate && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Fecha de Nacimiento</p>
                  <p className="text-sm font-medium">{formatDate(guest.birthDate)}</p>
                </div>
              </div>
            )}

            {guest.gender && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Género</p>
                  <p className="text-sm font-medium">{getGenderLabel(guest.gender)}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Ubicación */}
          {(guest.country || guest.region || guest.city) && (
            <>
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">UBICACIÓN</h4>
                
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {[guest.city, guest.region, guest.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Información Adicional */}
          {(guest.travelsWithChildren || guest.childrenUnderFour > 0 || guest.specialRequests || guest.observations) && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground">INFORMACIÓN ADICIONAL</h4>
              
              {guest.travelsWithChildren && (
                <div className="flex items-center gap-2">
                  <Baby className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Viaja con niños</span>
                    {guest.childrenUnderFour > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {guest.childrenUnderFour} menor(es) de 4 años
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {guest.specialRequests && (
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Peticiones Especiales</p>
                    <p className="text-sm">{guest.specialRequests}</p>
                  </div>
                </div>
              )}

              {guest.observations && (
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Observaciones</p>
                    <p className="text-sm">{guest.observations}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};