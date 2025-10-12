import { useState, useEffect } from 'react';
import { Bell, Check, Archive, Trash2, RefreshCw, Send, Users, User } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { Badge } from './ui/Badge';
import { Separator } from './ui/Separator';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Checkbox } from './ui/Checkbox';
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
import { RadioGroup, RadioGroupItem } from './ui/RadioGroup';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { getUsersByRole } from '../services/notifications';
import { getCategoryConfig, getCategoryOptions } from '../config/notificationCategories';
import NotificationReadStats from './NotificationReadStats';

/**
 * Panel completo de gestión de notificaciones
 */
export function NotificationPanel({
  notifications = [],
  unreadCount = 0,
  onMarkAsRead,
  onMarkAsArchived,
  onUnarchive,
  onDelete,
  onMarkAllRead,
  onSendNotification,
  onRefresh,
}) {
  const [activeTab, setActiveTab] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null); // ID del usuario actual
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    targetRole: '',
    category: 'general',
    sendToAll: true,
    targetUserIds: [], // Cambio: array de IDs en lugar de un solo ID
  });
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([
    { value: 'administrator', label: 'Administradores' },
    { value: 'receptionist', label: 'Recepcionistas' },
  ]);

  // Obtener el rol y el ID del usuario actual desde el token
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserRole(payload.role);
        setCurrentUserId(payload.id); // Guardar el ID del usuario
      }
    } catch (error) {
      console.error('Error al decodificar token:', error);
    }
  }, []);

  // Verificar roles disponibles (excluir el rol actual si es el único usuario)
  useEffect(() => {
    const checkAvailableRoles = async () => {
      if (!currentUserRole) return;

      const token = localStorage.getItem('token');
      const roleMap = { administrator: 1, receptionist: 2 };
      const roles = [];

      for (const [roleKey, roleLabel] of [
        ['administrator', 'Administradores'],
        ['receptionist', 'Recepcionistas'],
      ]) {
        try {
          const roleId = roleMap[roleKey];
          const response = await getUsersByRole(token, roleId);
          const users = response.data || [];

          // Solo agregar el rol si hay otros usuarios además del actual
          // O si el usuario actual NO es de ese rol
          if (users.length > 0 || currentUserRole !== roleKey) {
            roles.push({ value: roleKey, label: roleLabel });
          }
        } catch (error) {
          console.error(`Error al verificar rol ${roleKey}:`, error);
        }
      }

      setAvailableRoles(roles);
    };

    checkAvailableRoles();
  }, [currentUserRole]);

  // Cargar usuarios cuando cambia el rol objetivo
  useEffect(() => {
    const loadUsers = async () => {
      if (!newNotification.targetRole) {
        setAvailableUsers([]);
        return;
      }

      setLoadingUsers(true);
      try {
        const token = localStorage.getItem('token');
        const roleMap = { administrator: 1, receptionist: 2 };
        const roleId = roleMap[newNotification.targetRole];
        
        const response = await getUsersByRole(token, roleId);
        setAvailableUsers(response.data || []);
      } catch (error) {
        console.error('Error al cargar usuarios:', error);
        setAvailableUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [newNotification.targetRole]);

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

    if (!newNotification.sendToAll && newNotification.targetUserIds.length === 0) {
      alert('Por favor selecciona al menos un destinatario');
      return;
    }

    try {
      // Mapear nombres de roles a IDs (ajustar según tu BD)
      const roleMap = {
        administrator: 1,
        receptionist: 2,
      };

      // Enviar a todos los usuarios del rol
      if (newNotification.sendToAll) {
        const notificationData = {
          title: newNotification.title,
          message: newNotification.message,
          category: newNotification.category,
          notificationType: 'message',
          targetRoleId: roleMap[newNotification.targetRole],
        };
        
        await onSendNotification(notificationData);
      } else {
        // Enviar a múltiples usuarios específicos
        const promises = newNotification.targetUserIds.map((userId) => {
          const notificationData = {
            title: newNotification.title,
            message: newNotification.message,
            category: newNotification.category,
            notificationType: 'message',
            targetUserId: parseInt(userId),
          };
          return onSendNotification(notificationData);
        });
        
        await Promise.all(promises);
      }

      setNewNotification({ 
        title: '', 
        message: '', 
        targetRole: '',
        category: 'general',
        sendToAll: true,
        targetUserIds: [],
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error al enviar notificación:', error);
      alert('Error al enviar la notificación');
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
                    <Label htmlFor="category">Categoría *</Label>
                    <Select
                      value={newNotification.category}
                      onValueChange={(value) =>
                        setNewNotification({ ...newNotification, category: value })
                      }
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {getCategoryOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="flex items-center gap-2">
                              <span>{option.icon}</span>
                              <span>{option.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="targetRole">Rol Destinatario *</Label>
                    <Select
                      value={newNotification.targetRole}
                      onValueChange={(value) => {
                        setNewNotification({ 
                          ...newNotification, 
                          targetRole: value,
                          sendToAll: true,
                          targetUserIds: [],
                        });
                      }}
                    >
                      <SelectTrigger id="targetRole">
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Opciones de envío: Todos o Usuario Específico */}
                  {newNotification.targetRole && availableUsers.length > 0 && (
                    <div className="space-y-3">
                      <Label>Tipo de Envío</Label>
                      <RadioGroup
                        value={newNotification.sendToAll ? 'all' : 'specific'}
                        onValueChange={(value) => {
                          setNewNotification({
                            ...newNotification,
                            sendToAll: value === 'all',
                            targetUserIds: value === 'all' ? [] : newNotification.targetUserIds,
                          });
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all" id="sendToAll" />
                          <Label htmlFor="sendToAll" className="cursor-pointer flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Enviar a todos los {newNotification.targetRole === 'administrator' ? 'administradores' : 'recepcionistas'}
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="specific" id="sendToSpecific" />
                          <Label htmlFor="sendToSpecific" className="cursor-pointer flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Enviar a usuarios seleccionados
                          </Label>
                        </div>
                      </RadioGroup>

                      {/* Selector de Usuarios Específicos con Checkboxes */}
                      {!newNotification.sendToAll && (
                        <div className="mt-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>
                              Selecciona usuarios * 
                              <span className="text-sm text-gray-500 ml-2">
                                ({newNotification.targetUserIds.length} de {availableUsers.length} seleccionados)
                              </span>
                            </Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setNewNotification({
                                    ...newNotification,
                                    targetUserIds: availableUsers.map(u => u.id.toString()),
                                  });
                                }}
                                disabled={loadingUsers}
                              >
                                Seleccionar todos
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setNewNotification({
                                    ...newNotification,
                                    targetUserIds: [],
                                  });
                                }}
                                disabled={loadingUsers}
                              >
                                Deseleccionar todos
                              </Button>
                            </div>
                          </div>
                          
                          <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                            {loadingUsers ? (
                              <p className="text-sm text-gray-500 text-center py-4">Cargando usuarios...</p>
                            ) : availableUsers.length === 0 ? (
                              <p className="text-sm text-gray-500 text-center py-4">No hay usuarios disponibles</p>
                            ) : (
                              availableUsers.map((user) => (
                                <div key={user.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                                  <Checkbox
                                    id={`user-${user.id}`}
                                    checked={newNotification.targetUserIds.includes(user.id.toString())}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setNewNotification({
                                          ...newNotification,
                                          targetUserIds: [...newNotification.targetUserIds, user.id.toString()],
                                        });
                                      } else {
                                        setNewNotification({
                                          ...newNotification,
                                          targetUserIds: newNotification.targetUserIds.filter(
                                            (id) => id !== user.id.toString()
                                          ),
                                        });
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`user-${user.id}`} className="cursor-pointer flex-1">
                                    {user.name}
                                  </Label>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                  {filteredNotifications.map((notification) => {
                    const categoryConfig = getCategoryConfig(notification.category || 'general');
                    
                    return (
                      <Card
                        key={notification.id}
                        className={`
                          transition-all border-l-4
                          ${notification.status === 'unread' ? 'border-primary' : categoryConfig.borderColor}
                        `}
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            <div className="flex-shrink-0 text-3xl">
                              {categoryConfig.icon}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3
                                    className={`text-base font-medium ${
                                      notification.status === 'unread' ? 'font-semibold' : ''
                                    }`}
                                  >
                                    {notification.title}
                                  </h3>
                                  <Badge 
                                    variant="outline" 
                                    className={`${categoryConfig.textColor} ${categoryConfig.borderColor} text-xs`}
                                  >
                                    {categoryConfig.label}
                                  </Badge>
                                </div>
                                
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
                            
                            <div className="flex gap-2 flex-wrap">
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
                              
                              {/* Botón "Ver quién leyó" solo para mensajes enviados por el usuario */}
                              {notification.sender?.id === currentUserId && (
                                <NotificationReadStats 
                                  notificationId={notification.id}
                                  notificationTitle={notification.title}
                                />
                              )}
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm('¿Estás seguro de eliminar esta notificación?')) {
                                    onDelete(notification.id);
                                  }
                                }}
                                className="text-red-600 hover:text-red-700 hover:border-red-600"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
