'use client';

import { cn } from '@comp/ui/cn';
import { useEffect, useState } from 'react';

interface AnimatedWrapperProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
  duration?: number;
  animationKey?: string | number; // Use animationKey instead of key
}

export function AnimatedWrapper({
  children,
  delay = 0,
  direction = 'up',
  className,
  duration = 500,
  animationKey,
}: AnimatedWrapperProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const getTransformClass = () => {
    if (!isVisible) {
      switch (direction) {
        case 'up':
          return 'translate-y-4';
        case 'down':
          return '-translate-y-4';
        case 'left':
          return 'translate-x-4';
        case 'right':
          return '-translate-x-4';
        default:
          return 'translate-y-4';
      }
    }
    return 'translate-y-0 translate-x-0';
  };

  return (
    <div
      className={cn(
        'transition-all ease-out',
        `duration-${duration}`,
        isVisible ? 'opacity-100' : 'opacity-0',
        getTransformClass(),
        className,
      )}
    >
      {children}
    </div>
  );
}
