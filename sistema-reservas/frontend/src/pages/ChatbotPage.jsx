import { WhatsAppReservationPanel } from '../components/WhatsAppReservationPanel';
import { MessageSquare } from 'lucide-react';

/**
 * Página de gestión de reservas del Chatbot de WhatsApp
 */
export default function ChatbotPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
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
