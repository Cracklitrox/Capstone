import { useNotificationsContext } from '@/hooks/useNotificationsContext';
import { NotificationPanel } from '../components/notifications/NotificationPanel';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * Página de gestión de notificaciones en tiempo real
 */
export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    connected,
    sendNotification,
    markAsRead,
    markAsArchived,
    unarchive,
    deleteNotification,
    refreshNotifications,
  } = useNotificationsContext();

  if (loading && notifications.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando notificaciones...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Centro de Notificaciones</h1>
        
        <div className={`flex items-center gap-2 px-4 py-2 rounded-md border ${connected ? 'border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-600' : 'border-red-500 bg-red-50 dark:bg-red-950 dark:border-red-600'}`}>
          {connected ? (
            <>
              <Wifi className="h-4 w-4 text-green-700 dark:text-green-300" />
              <span className="text-sm text-green-700 dark:text-green-300 font-medium">Conectado en tiempo real</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-600 dark:text-red-300" />
              <span className="text-sm text-red-600 dark:text-red-300 font-medium">Desconectado</span>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-md border border-red-500 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <NotificationPanel
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAsArchived={markAsArchived}
        onUnarchive={unarchive}
        onDelete={deleteNotification}
        onSendNotification={sendNotification}
        onRefresh={() => refreshNotifications()}
      />
    </div>
  );
}
