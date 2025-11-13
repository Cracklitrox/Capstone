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
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-300',
    },
    confirmed: {
      label: 'Confirmada',
      description: 'Reserva confirmada, pago recibido',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300',
    },
    ready_for_checkin: {
      label: 'Lista para Check-in',
      description: 'Listo para ingresar',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-300',
    },
    in_progress: {
      label: 'En Progreso',
      description: 'Huésped hospedado actualmente',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-800',
      borderColor: 'border-purple-300',
    },
    pending_checkout: {
      label: 'Pendiente Check-out',
      description: 'Programado para check-out hoy',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-800',
      borderColor: 'border-orange-300',
    },
    completed: {
      label: 'Completada',
      description: 'Estadía completada',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-300',
    },
    canceled: {
      label: 'Cancelada',
      description: 'Reserva cancelada',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300',
    },
    no_show: {
      label: 'No Show',
      description: 'Huésped no se presentó',
      bgColor: 'bg-red-200',
      textColor: 'text-red-900',
      borderColor: 'border-red-400',
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
