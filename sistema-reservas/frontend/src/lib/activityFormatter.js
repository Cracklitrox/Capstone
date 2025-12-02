/**
 * Formatea una acción de actividad a texto legible en español
 * @param {object} activity - Objeto de actividad del log
 * @returns {string} - Texto formateado
 */
export const formatActivity = (activity) => {
  const { action, details, affectedTable } = activity;

  try {
    switch (action) {
      case 'UPDATE_ROOM_STATUS':
        if (details) {
          const statusTranslations = {
            available: 'Disponible',
            occupied: 'Ocupada',
            cleaning: 'En Limpieza',
            maintenance: 'En Mantenimiento',
            unavailable: 'No Disponible',
            pending: 'Pendiente',
          };
          const oldStatus = statusTranslations[details.old_status] || details.old_status;
          const newStatus = statusTranslations[details.new_status] || details.new_status;
          return `Actualizaste el estado de la Habitación ${details.room_number} de "${oldStatus}" a "${newStatus}"`;
        }
        return 'Actualizaste el estado de una habitación';

      case 'CREATE_RESERVATION':
        return 'Creaste una nueva reserva';

      case 'UPDATE_RESERVATION':
        return 'Actualizaste una reserva';

      case 'CANCEL_RESERVATION':
        return 'Cancelaste una reserva';

      case 'CHECK_IN':
        return 'Realizaste el check-in de un huésped';

      case 'CHECK_OUT':
        return 'Realizaste el check-out de un huésped';

      case 'CREATE_MAINTENANCE':
        return 'Creaste una tarea de mantenimiento';

      case 'UPDATE_MAINTENANCE':
        return 'Actualizaste una tarea de mantenimiento';

      case 'COMPLETE_MAINTENANCE':
        return 'Completaste una tarea de mantenimiento';

      case 'CREATE_CLEANING':
        return 'Registraste una limpieza';

      case 'COMPLETE_CLEANING':
        return 'Completaste una limpieza';

      case 'CREATE_PAYMENT':
        return 'Registraste un pago';

      case 'UPDATE_PAYMENT':
        return 'Actualizaste un pago';

      case 'CREATE_USER':
        return 'Creaste un nuevo usuario';

      case 'UPDATE_USER':
        return 'Actualizaste un usuario';

      case 'UPDATE_PROFILE':
        return 'Actualizaste tu perfil';

      case 'CHANGE_PASSWORD':
        return 'Cambiaste tu contraseña';

      default:
        return 'Realizaste una acción en el sistema';
    }
  } catch (error) {
    return 'Acción registrada en el sistema';
  }
};

/**
 * Obtiene un icono apropiado para el tipo de acción
 * @param {string} action - Tipo de acción
 * @returns {string} - Nombre del icono (compatible con Heroicons)
 */
export const getActivityIcon = (action) => {
  const iconMap = {
    UPDATE_ROOM_STATUS: 'HomeIcon',
    CREATE_RESERVATION: 'CalendarDaysIcon',
    UPDATE_RESERVATION: 'PencilSquareIcon',
    CANCEL_RESERVATION: 'XCircleIcon',
    CHECK_IN: 'ArrowRightOnRectangleIcon',
    CHECK_OUT: 'ArrowLeftOnRectangleIcon',
    CREATE_MAINTENANCE: 'WrenchScrewdriverIcon',
    UPDATE_MAINTENANCE: 'WrenchIcon',
    COMPLETE_MAINTENANCE: 'CheckCircleIcon',
    CREATE_CLEANING: 'SparklesIcon',
    COMPLETE_CLEANING: 'CheckBadgeIcon',
    CREATE_PAYMENT: 'CurrencyDollarIcon',
    UPDATE_PAYMENT: 'BanknotesIcon',
    CREATE_USER: 'UserPlusIcon',
    UPDATE_USER: 'UserIcon',
    UPDATE_PROFILE: 'IdentificationIcon',
    CHANGE_PASSWORD: 'LockClosedIcon',
  };

  return iconMap[action] || 'DocumentTextIcon';
};