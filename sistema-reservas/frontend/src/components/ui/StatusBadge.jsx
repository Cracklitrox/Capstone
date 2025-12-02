import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn } from '../../lib/utils';

/**
 * StatusBadge Component
 *
 * Displays a colored badge for reservation statuses with optional tooltip
 *
 * @param {Object} props
 * @param {string} props.status - One of: pending|confirmed|ready_for_checkin|in_progress|pending_checkout|completed|canceled|no_show
 * @param {string} props.size - One of: sm|md|lg (default: md)
 * @param {boolean} props.showTooltip - Whether to show tooltip on hover (default: true)
 * @param {string} props.className - Additional CSS classes
 */
const StatusBadge = ({
  status,
  size = 'md',
  showTooltip = true,
  className = ''
}) => {
  // Configuración de estados
  const statusConfig = {
    pending: {
      label: 'Pendiente',
      description: 'Esperando confirmación de pago',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      textColor: 'text-yellow-800 dark:text-yellow-400',
      borderColor: 'border-yellow-300 dark:border-yellow-800',
    },
    confirmed: {
      label: 'Confirmada',
      description: 'Reserva confirmada, pago recibido',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-800 dark:text-green-400',
      borderColor: 'border-green-300 dark:border-green-800',
    },
    ready_for_checkin: {
      label: 'Lista para Check-in',
      description: 'Listo para ingresar',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      textColor: 'text-blue-800 dark:text-blue-400',
      borderColor: 'border-blue-300 dark:border-blue-800',
    },
    in_progress: {
      label: 'En Progreso',
      description: 'Huésped hospedado actualmente',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      textColor: 'text-purple-800 dark:text-purple-400',
      borderColor: 'border-purple-300 dark:border-purple-800',
    },
    pending_checkout: {
      label: 'Pendiente Check-out',
      description: 'Programado para check-out hoy',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      textColor: 'text-orange-800 dark:text-orange-400',
      borderColor: 'border-orange-300 dark:border-orange-800',
    },
    completed: {
      label: 'Completada',
      description: 'Estadía completada',
      bgColor: 'bg-gray-100 dark:bg-gray-800',
      textColor: 'text-gray-800 dark:text-gray-300',
      borderColor: 'border-gray-300 dark:border-gray-700',
    },
    canceled: {
      label: 'Cancelada',
      description: 'Reserva cancelada',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      textColor: 'text-red-800 dark:text-red-400',
      borderColor: 'border-red-300 dark:border-red-800',
    },
    no_show: {
      label: 'No Show',
      description: 'Huésped no se presentó',
      bgColor: 'bg-red-200 dark:bg-red-900/50',
      textColor: 'text-red-900 dark:text-red-300',
      borderColor: 'border-red-400 dark:border-red-700',
    },
  };

  // Configuración de tamaños
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  // Obtener configuración del estado actual
  const config = statusConfig[status] || statusConfig.pending;
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  // Badge base
  const badgeClasses = cn(
    'inline-flex items-center justify-center',
    'font-medium rounded-full border',
    'transition-colors duration-200',
    config.bgColor,
    config.textColor,
    config.borderColor,
    sizeClass,
    className
  );

  const BadgeContent = (
    <span
      className={badgeClasses}
      role="status"
      aria-label={config.description}
    >
      {config.label}
    </span>
  );

  // Si showTooltip es false, retornar solo el badge
  if (!showTooltip) {
    return BadgeContent;
  }

  // Retornar badge con tooltip
  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {BadgeContent}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95"
            sideOffset={5}
            side="top"
            align="center"
          >
            {config.description}
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

export default StatusBadge;
