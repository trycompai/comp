'use client';

import type { TaskItemStatus } from '@/hooks/use-task-items';
import { cn } from '@/lib/utils';
import { CheckmarkFilled, DotMark, Misuse, Time } from '@trycompai/design-system/icons';

interface StatusCircleProps {
  status: TaskItemStatus;
  className?: string;
}

/**
 * Circular status indicator with icons
 * Shows different icons based on status
 */
export function StatusCircle({ status, className }: StatusCircleProps) {
  const size = 16;
  const radius = size / 2 - 1;
  const center = size / 2;
  const iconSize = 10;

  const getStatusConfig = (status: TaskItemStatus) => {
    switch (status) {
      case 'done':
        return {
          icon: CheckmarkFilled,
          iconColor: 'text-white',
          bgColor: 'fill-green-500',
          strokeColor: 'stroke-green-500',
          fillPercent: 100, // Filled green circle with white checkmark
        };
      case 'in_progress':
        return {
          icon: null, // Half-filled circle, no icon
          fillColor: 'fill-amber-500',
          strokeColor: 'stroke-amber-500',
          fillPercent: 50, // Half-filled like in the image
        };
      case 'in_review':
        return {
          icon: Time,
          iconColor: 'text-white',
          bgColor: 'fill-green-500',
          strokeColor: 'stroke-green-500',
          fillPercent: 100, // Filled green circle with white clock icon
        };
      case 'canceled':
        return {
          icon: Misuse,
          iconColor: 'text-white',
          bgColor: 'fill-slate-500',
          strokeColor: 'stroke-slate-500',
          fillPercent: 100, // Filled grey circle with white ban icon
        };
      default: // todo
        return {
          icon: DotMark,
          iconColor: 'text-slate-400',
          bgColor: 'fill-transparent',
          strokeColor: 'stroke-slate-400',
          fillPercent: 0, // Empty circle with dot
        };
    }
  };

  const config = getStatusConfig(status);

  // Calculate the path for the filled portion (for in_progress)
  const getFillPath = (percent: number) => {
    if (percent === 0) return '';

    // For half-filled (50%), fill the right half
    const startAngle = 180; // Start from left
    const endAngle = startAngle + (percent / 100) * 360;
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startAngleRad);
    const y1 = center + radius * Math.sin(startAngleRad);
    const x2 = center + radius * Math.cos(endAngleRad);
    const y2 = center + radius * Math.sin(endAngleRad);

    const largeArcFlag = percent > 50 ? 1 : 0;

    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  const IconComponent = config.icon;

  // For in_progress: show half-filled circle
  if (status === 'in_progress') {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={cn('flex-shrink-0', className)}
      >
        {/* Filled portion - colored half */}
        <path
          d={getFillPath(config.fillPercent)}
          className={config.fillColor}
        />
        {/* Border */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          className={cn('fill-none stroke-1', config.strokeColor)}
        />
      </svg>
    );
  }

  // For filled circles with icons (done, in_review, canceled)
  if (config.fillPercent === 100 && IconComponent) {
    return (
      <div className={cn('relative flex-shrink-0', className)} style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0"
        >
          {/* Filled circle background */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            className={config.bgColor}
          />
          {/* Circle border */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            className={cn('fill-none stroke-1', config.strokeColor)}
          />
        </svg>
        {/* White icon */}
        <IconComponent
          className={cn('absolute', config.iconColor)}
          style={{
            width: iconSize,
            height: iconSize,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          strokeWidth={2}
        />
      </div>
    );
  }

  // For empty circles (todo)
  return (
    <div className={cn('relative flex-shrink-0', className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        {/* Circle border */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          className={cn('fill-none stroke-1', config.strokeColor)}
        />
      </svg>
      {/* Icon */}
      {IconComponent && (
        <IconComponent
          className={cn('absolute', config.iconColor)}
          style={{
            width: iconSize,
            height: iconSize,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          strokeWidth={2}
        />
      )}
    </div>
  );
}

