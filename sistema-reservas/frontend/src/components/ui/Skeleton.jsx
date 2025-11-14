import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Skeleton Component
 * Base component for loading placeholders
 */
const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
};

/**
 * ReservationCardSkeleton
 * Skeleton for reservation cards in grid view
 */
export const ReservationCardSkeleton = () => {
  return (
    <div className="bg-card border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>

      {/* Rooms */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-16" />
        </div>
      </div>

      {/* Dates */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-20" />
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-2 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
};

/**
 * GuestCardSkeleton
 * Skeleton for guest cards in grid view
 */
export const GuestCardSkeleton = () => {
  return (
    <div className="bg-card border rounded-lg hover:shadow-lg transition-shadow">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>

        {/* Contact info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>

        {/* Separator */}
        <Skeleton className="h-px w-full" />

        {/* Buttons */}
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
    </div>
  );
};

/**
 * RoomCardSkeleton
 * Skeleton for room cards in status board
 */
export const RoomCardSkeleton = () => {
  return (
    <div className="p-3 border-2 rounded-lg bg-muted">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-6 w-12" />
        </div>
        <Skeleton className="h-5 w-14" />
      </div>

      <div className="space-y-1 mb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>

      <Skeleton className="h-8 w-full" />
    </div>
  );
};

/**
 * TableRowSkeleton
 * Skeleton for table rows
 */
export const TableRowSkeleton = ({ columns = 5 }) => {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
};

/**
 * StatCardSkeleton
 * Skeleton for dashboard stat cards
 */
export const StatCardSkeleton = () => {
  return (
    <div className="bg-card border rounded-lg p-6 space-y-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
};

/**
 * ListSkeleton
 * Skeleton for generic lists
 */
export const ListSkeleton = ({ items = 5, className }) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 p-3 border rounded-lg"
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
};

export { Skeleton };
