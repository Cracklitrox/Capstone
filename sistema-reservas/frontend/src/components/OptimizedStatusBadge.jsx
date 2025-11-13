import React, { memo } from 'react';
import { Badge } from './ui/Badge';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  DoorClosed,
  DoorOpen,
  Ghost,
} from 'lucide-react';

/**
 * Optimized StatusBadge Component
 * Memoized version to prevent unnecessary re-renders
 */
const statusConfig = {
  pending: {
    label: 'Pendiente',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200',
    description: 'Pago de depósito pendiente',
  },
  confirmed: {
    label: 'Confirmado',
    icon: CheckCircle,
    className: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
    description: 'Reserva confirmada con depósito',
  },
  ready_for_checkin: {
    label: 'Ready for Check-in',
    icon: DoorClosed,
    className: 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200',
    description: 'Lista para hacer check-in',
  },
  in_progress: {
    label: 'En Progreso',
    icon: Loader,
    className: 'bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-200',
    description: 'Huésped actualmente hospedado',
  },
  pending_checkout: {
    label: 'Pending Checkout',
    icon: DoorOpen,
    className: 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200',
    description: 'Esperando check-out',
  },
  completed: {
    label: 'Completado',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
    description: 'Reserva completada exitosamente',
  },
  canceled: {
    label: 'Cancelado',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200',
    description: 'Reserva cancelada',
  },
  no_show: {
    label: 'No-Show',
    icon: Ghost,
    className: 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200',
    description: 'Huésped no se presentó',
  },
};

const OptimizedStatusBadge = memo(({ status, size = 'default', showIcon = true }) => {
  const config = statusConfig[status] || {
    label: status,
    icon: AlertCircle,
    className: 'bg-gray-100 text-gray-800 border-gray-300',
    description: 'Estado desconocido',
  };

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <Badge
      className={`${config.className} ${sizeClasses[size]} border flex items-center gap-1.5 font-medium`}
      title={config.description}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />}
      {config.label}
    </Badge>
  );
});

OptimizedStatusBadge.displayName = 'OptimizedStatusBadge';

export default OptimizedStatusBadge;
