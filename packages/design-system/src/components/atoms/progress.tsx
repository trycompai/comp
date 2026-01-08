'use client';

import { Progress as ProgressPrimitive } from '@base-ui/react/progress';

function Progress({ children, value, ...props }: Omit<ProgressPrimitive.Root.Props, 'className'>) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className="flex flex-wrap gap-3"
      {...props}
    >
      {children}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  );
}

function ProgressTrack({ ...props }: Omit<ProgressPrimitive.Track.Props, 'className'>) {
  return (
    <ProgressPrimitive.Track
      className="bg-muted h-1.5 rounded-full relative flex w-full items-center overflow-x-hidden"
      data-slot="progress-track"
      {...props}
    />
  );
}

function ProgressIndicator({ ...props }: Omit<ProgressPrimitive.Indicator.Props, 'className'>) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className="bg-primary h-full transition-all"
      {...props}
    />
  );
}

function ProgressLabel({ ...props }: Omit<ProgressPrimitive.Label.Props, 'className'>) {
  return (
    <ProgressPrimitive.Label
      className="text-sm font-medium"
      data-slot="progress-label"
      {...props}
    />
  );
}

function ProgressValue({ ...props }: Omit<ProgressPrimitive.Value.Props, 'className'>) {
  return (
    <ProgressPrimitive.Value
      className="text-muted-foreground ml-auto text-sm tabular-nums"
      data-slot="progress-value"
      {...props}
    />
  );
}

export { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue };
