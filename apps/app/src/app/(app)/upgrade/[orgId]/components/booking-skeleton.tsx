'use client';

import { Card } from '@comp/ui/card';

export function BookingSkeleton() {
  return (
    <Card
      className="p-0 overflow-hidden min-h-[500px]"
      style={{ backgroundColor: 'hsla(0, 0%, 9%, 1)' }}
    >
      {/* Mobile view */}
      <div className="min-h-[500px] flex lg:hidden flex-col">
        {/* Mobile header */}
        <div className="p-4 border-b border-muted">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-muted animate-pulse rounded" />
            <div>
              <div className="h-5 w-32 bg-muted animate-pulse rounded mb-1" />
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
          </div>
        </div>

        {/* Mobile calendar */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="mb-4">
            <div className="h-6 w-32 bg-muted animate-pulse rounded mb-2" />
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-muted animate-pulse rounded" />
              <div className="h-8 w-8 bg-muted animate-pulse rounded" />
            </div>
          </div>

          {/* Mini calendar grid for mobile */}
          <div className="grid grid-cols-7 gap-1 text-xs">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={`mobile-day-${i}`}
                className="aspect-square p-1 border border-muted rounded"
              >
                <div className="h-full w-full bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>

          {/* Mobile time slots */}
          <div className="mt-4 space-y-2">
            <div className="h-5 w-24 bg-muted animate-pulse rounded mb-2" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`mobile-slot-${i}`}
                className="h-10 w-full bg-muted animate-pulse rounded"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Desktop view */}
      <div className="h-[500px] hidden lg:flex">
        {/* Left sidebar skeleton */}
        <div className="w-80 border-r border-muted p-6 space-y-6">
          {/* Company logo */}
          <div className="w-12 h-12 bg-muted animate-pulse rounded" />

          {/* Company name */}
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />

          {/* Title */}
          <div className="h-8 w-40 bg-muted animate-pulse rounded" />

          {/* Description */}
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
          </div>

          {/* Meeting details */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-muted animate-pulse rounded" />
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-muted animate-pulse rounded" />
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-muted animate-pulse rounded" />
              <div className="h-4 w-40 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>

        {/* Center calendar skeleton */}
        <div className="flex-1 p-6">
          {/* Month header */}
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-muted animate-pulse rounded" />
              <div className="w-8 h-8 bg-muted animate-pulse rounded" />
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
              <div key={day} className="h-8 flex items-center justify-center">
                <div className="h-4 w-12 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={`day-${i}`} className="aspect-square p-2 border border-muted rounded">
                <div className="h-full w-full bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Right time slots skeleton */}
        <div className="w-80 border-l border-muted p-6">
          {/* Date header */}
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-24 bg-muted animate-pulse rounded" />
            <div className="flex gap-2">
              <div className="h-6 w-12 bg-muted animate-pulse rounded" />
              <div className="h-6 w-12 bg-muted animate-pulse rounded" />
            </div>
          </div>

          {/* Time slots */}
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`slot-${i}`} className="h-12 w-full bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
