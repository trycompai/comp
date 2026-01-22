import * as React from 'react';

import { cn } from '../../utils';

const sideStyles = {
  top: 'bg-linear-to-t from-transparent to-(--background) mask-b-to-(--stop)',
  bottom: 'bg-linear-to-b from-transparent to-(--background) mask-t-to-(--stop)',
  left: 'bg-linear-to-l from-transparent to-(--background) mask-r-to-(--stop)',
  right: 'bg-linear-to-r from-transparent to-(--background) mask-l-to-(--stop)',
} as const;

export function Fade({
  stop = '25%',
  blur = '4px',
  side = 'top',
  className,
  background,
  style,
  ref,
  debug,
}: {
  stop?: string;
  blur?: string;
  side: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  background: string;
  debug?: boolean;
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
      aria-hidden
      className={cn('absolute pointer-events-none select-none', sideStyles[side], className)}
      style={
        {
          '--stop': stop,
          '--background': background,
          backdropFilter: `blur(${blur})`,
          ...(debug && { outline: '2px solid red' }),
          ...style,
        } as React.CSSProperties
      }
    />
  );
}
