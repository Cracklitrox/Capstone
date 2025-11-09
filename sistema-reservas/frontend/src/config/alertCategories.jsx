import {
  ClockIcon,
  ChatBubbleLeftIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
  UserIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

/**
 * Configuración de categorías de alertas
 * Define íconos, colores y etiquetas para cada tipo de alerta
 */

export const alertCategories = {
  checkout: {
    key: 'checkout',
    label: 'Check-out',
    icon: <ClockIcon className="h-5 w-5" />,
    color: 'orange',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-200 dark:border-orange-800',
    badgeVariant: 'destructive',
    description: 'Alertas de check-out del día'
  },
  booking_request: {
    key: 'booking_request',
    label: 'WhatsApp',
    icon: <ChatBubbleLeftIcon className="h-5 w-5" />,
    color: 'green',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800',
    badgeVariant: 'success',
    description: 'Solicitudes de reserva por WhatsApp'
  },
  payment: {
    key: 'payment',
    label: 'Pagos',
    icon: <CurrencyDollarIcon className="h-5 w-5" />,
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800',
    badgeVariant: 'default',
    description: 'Alertas de pagos pendientes'
  },
  maintenance: {
    key: 'maintenance',
    label: 'Mantenimiento',
    icon: <WrenchScrewdriverIcon className="h-5 w-5" />,
    color: 'amber',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800',
    badgeVariant: 'warning',
    description: 'Alertas de mantenimiento de habitaciones'
  },
  reservation: {
    key: 'reservation',
    label: 'Reservas',
    icon: <CalendarDaysIcon className="h-5 w-5" />,
    color: 'purple',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-200 dark:border-purple-800',
    badgeVariant: 'secondary',
    description: 'Alertas de reservas'
  },
  guest: {
    key: 'guest',
    label: 'Huéspedes',
    icon: <UserIcon className="h-5 w-5" />,
    color: 'pink',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    textColor: 'text-pink-600 dark:text-pink-400',
    borderColor: 'border-pink-200 dark:border-pink-800',
    badgeVariant: 'outline',
    description: 'Alertas de huéspedes'
  }
};

/**
 * Obtiene la configuración de una categoría de alerta
 * @param {string} category - Nombre de la categoría
 * @returns {Object} Configuración de la categoría
 */
export function getAlertCategoryConfig(category) {
  return alertCategories[category] || alertCategories.reservation;
}

/**
 * Obtiene todas las categorías de alertas como array
 * @returns {Array} Array de configuraciones de categorías
 */
export function getAllAlertCategories() {
  return Object.values(alertCategories);
}
