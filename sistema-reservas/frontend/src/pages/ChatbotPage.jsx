import { WhatsAppReservationPanel } from '../components/notifications/WhatsAppReservationPanel';
import { MessageSquare } from 'lucide-react';

/**
 * Página de gestión de reservas del Chatbot de WhatsApp
 */
export default function ChatbotPage() {
  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <MessageSquare className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Chatbot WhatsApp</h1>
            <p className="text-muted-foreground">
              Gestiona las solicitudes de reserva recibidas desde WhatsApp
            </p>
          </div>
        </div>
      </div>

      <WhatsAppReservationPanel />
    </div>
  );
}
