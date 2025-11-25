import * as React from 'react';

import { cn } from '../../../utils';
import styles from './fade.module.css';

export function Fade({
  stop,
  blur,
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
      className={cn(styles.root, className)}
      data-side={side}
      style={
        {
          '--stop': stop,
          '--blur': blur,
          '--background': background,
          ...(debug && {
            outline: '2px solid red',
          }),
          ...style,
        } as React.CSSProperties
      }
    />
  );
}
