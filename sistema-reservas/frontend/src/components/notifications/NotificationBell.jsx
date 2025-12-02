import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Archive } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../ui/Dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Componente de campana de notificaciones con dropdown
 */
export function NotificationBell({
  notifications = [],
  unreadCount = 0,
  onMarkAsRead,
  onMarkAsArchived,
  onMarkAllRead,
  onNotificationClick,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Eliminar duplicados basándose en el ID de la notificación
  const uniqueNotifications = notifications.reduce((acc, current) => {
    const exists = acc.find(item => item.id === current.id);
    if (!exists) {
      return [...acc, current];
    }
    return acc;
  }, []);

  const handleNotificationClick = (notification) => {
    if (notification.status === 'unread') {
      onMarkAsRead(notification.id);
    }
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    
    // Cerrar el dropdown
    setIsOpen(false);
    
    // Redirigir a la página de notificaciones con el ID de la notificación
    navigate(`/notifications?highlight=${notification.id}`);
  };

  const handleMarkAllRead = () => {
    onMarkAllRead();
  };

  const handleArchive = (e, notificationId) => {
    e.stopPropagation();
    onMarkAsArchived(notificationId);
  };

  const getNotificationIcon = (type) => {
    // Aquí puedes personalizar íconos según el tipo de notificación
    switch (type) {
      case 'reservation':
        return '📅';
      case 'payment':
        return '💳';
      case 'maintenance':
        return '🔧';
      case 'message':
        return '💬';
      default:
        return '🔔';
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notificaciones. ${unreadCount > 0 ? `${unreadCount} no leídas` : 'No hay notificaciones nuevas'}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Marcar todas como leídas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="max-h-[400px] overflow-y-auto">
          {uniqueNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">No hay notificaciones</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {uniqueNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    relative p-3 rounded-lg cursor-pointer transition-colors
                    ${
                      notification.status === 'unread'
                        ? 'bg-primary/10 hover:bg-primary/20'
                        : 'hover:bg-muted'
                    }
                  `}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 text-2xl">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          className={`text-sm font-medium truncate ${
                            notification.status === 'unread' ? 'font-semibold' : ''
                          }`}
                        >
                          {notification.title}
                        </h4>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={(e) => handleArchive(e, notification.id)}
                          aria-label="Archivar notificación"
                        >
                          <Archive className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {notification.message && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {notification.sender?.name}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.sentAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {notification.status === 'unread' && (
                    <div className="absolute top-3 left-1 w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
