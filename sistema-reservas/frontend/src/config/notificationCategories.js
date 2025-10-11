/**
 * Configuración de categorías de notificaciones con colores
 */

export const NOTIFICATION_CATEGORIES = {
  general: {
    label: 'General',
    color: 'bg-gray-500',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300',
    bgLight: 'bg-gray-50',
    icon: '📋',
  },
  operational: {
    label: 'Operacional',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
    bgLight: 'bg-blue-50',
    icon: '⚙️',
  },
  administrative: {
    label: 'Administrativo',
    color: 'bg-purple-500',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-300',
    bgLight: 'bg-purple-50',
    icon: '📊',
  },
  alert: {
    label: 'Alerta',
    color: 'bg-red-500',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
    bgLight: 'bg-red-50',
    icon: '🚨',
  },
  maintenance: {
    label: 'Mantenimiento',
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-300',
    bgLight: 'bg-orange-50',
    icon: '🔧',
  },
  reservation: {
    label: 'Reserva',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
    bgLight: 'bg-green-50',
    icon: '📅',
  },
  payment: {
    label: 'Pago',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-300',
    bgLight: 'bg-emerald-50',
    icon: '💰',
  },
};

/**
 * Obtiene la configuración de una categoría
 * @param {string} category - Nombre de la categoría
 * @returns {Object} Configuración de la categoría
 */
export function getCategoryConfig(category) {
  return NOTIFICATION_CATEGORIES[category] || NOTIFICATION_CATEGORIES.general;
}

/**
 * Obtiene todas las categorías para un selector
 * @returns {Array} Array de categorías con value y label
 */
export function getCategoryOptions() {
  return Object.entries(NOTIFICATION_CATEGORIES).map(([value, config]) => ({
    value,
    label: config.label,
    icon: config.icon,
  }));
}
