import { useContext } from 'react';
import { NotificationsContext } from '../contexts/NotificationsContextDefinition';

/**
 * Hook para consumir el contexto de notificaciones
 */
export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  
  if (!context) {
    throw new Error('useNotificationsContext debe usarse dentro de NotificationsProvider');
  }
  
  return context;
}
