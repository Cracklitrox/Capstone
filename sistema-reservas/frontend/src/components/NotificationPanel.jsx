import { useState } from 'react';
import { Bell, Check, Archive, Trash2, RefreshCw, Send } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { Badge } from './ui/Badge';
import { Separator } from './ui/Separator';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/Select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/Dialog';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Panel completo de gestión de notificaciones
 */
export function NotificationPanel({
  notifications = [],
  unreadCount = 0,
  onMarkAsRead,
  onMarkAsArchived,
  onUnarchive,
  onMarkAllRead,
  onSendNotification,
  onRefresh,
}) {
  const [activeTab, setActiveTab] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    targetRole: '',
  });

  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === 'all') return !notif.isArchived;
    if (activeTab === 'unread') return notif.status === 'unread' && !notif.isArchived;
    if (activeTab === 'archived') return notif.isArchived;
    return true;
  });

  const handleSendNotification = async () => {
    if (!newNotification.title || !newNotification.targetRole) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      // Mapear nombres de roles a IDs (ajustar según tu BD)
      const roleMap = {
        administrator: 1,
        receptionist: 2,
      };

      await onSendNotification({
        title: newNotification.title,
        message: newNotification.message,
        targetRoleId: roleMap[newNotification.targetRole],
        notificationType: 'message',
      });

      setNewNotification({ title: '', message: '', targetRole: '' });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error al enviar notificación:', error);
      alert('Error al enviar la notificación');
    }
  };

  const getNotificationIcon = (type) => {
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
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Gestiona tus notificaciones y mensajes internos
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Notificación
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enviar Nueva Notificación</DialogTitle>
                  <DialogDescription>
                    Envía una notificación a otros usuarios del sistema
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={newNotification.title}
                      onChange={(e) =>
                        setNewNotification({ ...newNotification, title: e.target.value })
                      }
                      placeholder="Título de la notificación"
                      maxLength={120}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="message">Mensaje</Label>
                    <Input
                      id="message"
                      value={newNotification.message}
                      onChange={(e) =>
                        setNewNotification({ ...newNotification, message: e.target.value })
                      }
                      placeholder="Mensaje detallado (opcional)"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="targetRole">Destinatario *</Label>
                    <Select
                      value={newNotification.targetRole}
                      onValueChange={(value) =>
                        setNewNotification({ ...newNotification, targetRole: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="administrator">Administradores</SelectItem>
                        <SelectItem value="receptionist">Recepcionistas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSendNotification}>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="all">
                Todas
                {notifications.filter((n) => !n.isArchived).length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {notifications.filter((n) => !n.isArchived).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread">
                No leídas
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="archived">Archivadas</TabsTrigger>
            </TabsList>
            
            {activeTab === 'all' && unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
                <Check className="h-4 w-4 mr-2" />
                Marcar todas como leídas
              </Button>
            )}
          </div>
          
          <TabsContent value={activeTab} className="mt-0">
            <div className="max-h-[600px] overflow-y-auto pr-4">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No hay notificaciones</p>
                  <p className="text-sm">
                    {activeTab === 'unread'
                      ? 'No tienes notificaciones sin leer'
                      : activeTab === 'archived'
                      ? 'No has archivado ninguna notificación'
                      : 'Aún no tienes notificaciones'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`
                        transition-all
                        ${notification.status === 'unread' ? 'border-primary' : ''}
                      `}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 text-3xl">
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3
                                className={`text-base font-medium ${
                                  notification.status === 'unread' ? 'font-semibold' : ''
                                }`}
                              >
                                {notification.title}
                              </h3>
                              
                              {notification.status === 'unread' && (
                                <Badge variant="default" className="flex-shrink-0">
                                  Nueva
                                </Badge>
                              )}
                            </div>
                            
                            {notification.message && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {notification.message}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                              <span className="font-medium">{notification.sender?.name}</span>
                              <span>•</span>
                              <span>
                                {formatDistanceToNow(new Date(notification.sentAt), {
                                  addSuffix: true,
                                  locale: es,
                                })}
                              </span>
                            </div>
                            
                            <Separator className="my-3" />
                            
                            <div className="flex gap-2">
                              {notification.status === 'unread' && !notification.isArchived && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onMarkAsRead(notification.id)}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Marcar como leída
                                </Button>
                              )}
                              
                              {!notification.isArchived ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onMarkAsArchived(notification.id)}
                                >
                                  <Archive className="h-3 w-3 mr-1" />
                                  Archivar
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onUnarchive(notification.id)}
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Restaurar
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
