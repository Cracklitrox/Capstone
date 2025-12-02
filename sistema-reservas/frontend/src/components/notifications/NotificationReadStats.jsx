import { useState, useEffect } from 'react';
import { Eye, EyeOff, Users, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/Dialog';
import { getNotificationReadStats } from '../../services/notifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function NotificationReadStats({ notificationId, notificationTitle }) {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadStats = async () => {
    if (!isOpen || !notificationId) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No se encontró el token de autenticación');
        return;
      }

      const response = await getNotificationReadStats(notificationId);
      setStats(response.data);
    } catch (err) {
      setError(err.message || 'Error al cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, notificationId]);

  const getReadPercentage = () => {
    if (!stats || stats.totalRecipients === 0) return 0;
    return Math.round((stats.readCount / stats.totalRecipients) * 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye className="h-4 w-4" />
          Ver quién leyó
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Estadísticas de Lectura
          </DialogTitle>
          <DialogDescription>
            {notificationTitle || 'Notificación'}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md">
            {error}
          </div>
        )}

        {!loading && !error && stats && (
          <div className="space-y-6">
            {/* Resumen General */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total de destinatarios:</span>
                <Badge variant="secondary">{stats.totalRecipients}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Han leído:</span>
                <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                  {stats.readCount} ({getReadPercentage()}%)
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">No han leído:</span>
                <Badge className="bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                  {stats.unreadCount}
                </Badge>
              </div>

              {/* Barra de progreso */}
              <div className="mt-3">
                <div className="w-full bg-secondary rounded-full h-2.5">
                  <div
                    className="bg-green-600 h-2.5 rounded-full transition-all duration-300 dark:bg-green-500"
                    style={{ width: `${getReadPercentage()}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Lista de usuarios que HAN leído */}
            {stats.readBy.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                  Han leído ({stats.readBy.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {stats.readBy.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md dark:bg-green-900/10 dark:border-green-800"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {user.readAt
                          ? formatDistanceToNow(new Date(user.readAt), {
                            addSuffix: true,
                            locale: es,
                          })
                          : 'Fecha no disponible'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de usuarios que NO han leído */}
            {stats.unreadBy.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
                  No han leído ({stats.unreadBy.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {stats.unreadBy.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/10 dark:border-red-800"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <EyeOff className="h-4 w-4 text-red-500 dark:text-red-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
