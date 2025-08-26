'use client';

import { cn } from '@comp/ui/cn';
import { type SVGMotionProps, motion } from 'framer-motion';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

export interface LogoSpinnerProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  raceColor?: string;
  isDisabled?: boolean;
}

export const LogoSpinner = ({
  size = 40,
  className,
  raceColor = 'hsl(var(--chart-primary))',
  isDisabled = false,
  ...props
}: LogoSpinnerProps) => {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);

  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      setPathLength(length);
    }
  }, []);

  const cShapePath =
    'M22.033 7.327a0.802 0.802 0 0 1 0.937 0l5.126 3.68a0.802 0.802 0 0 1 0 1.306l-2.431 1.744a0.52 0.52 0 0 1 -0.598 -0.001l-2.097 -1.505a0.802 0.802 0 0 0 -0.937 0l-6.979 5.01a0.802 0.802 0 0 0 0 1.306l1.955 1.402 2.63 1.891 2.395 1.718a0.802 0.802 0 0 0 0.938 0l6.979 -5.015a0.802 0.802 0 0 0 0 -1.305l-1.654 -1.19a0.263 0.263 0 0 1 0 -0.427l2.873 -2.06a0.802 0.802 0 0 1 0.937 0l5.123 3.679a0.802 0.802 0 0 1 0 1.306l-2.433 1.747 -11.825 8.491a0.802 0.802 0 0 1 -0.937 0l-6.034 -4.333 -2.63 -1.886 -3.163 -2.27 -2.431 -1.747a0.802 0.802 0 0 1 0 -1.306z';

  return (
    <div className="flex items-center justify-center">
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 45 45"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('', className)}
        {...(isDisabled ? { opacity: 0.5 } : { animate: { scale: [1, 1.1, 1] } })}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeInOut',
        }}
        {...(props as SVGMotionProps<SVGSVGElement>)}
      >
        {/* Original logo path - uses currentColor from className */}
        <path
          d="m32.947 10.714 -1.312 -0.942 -8.665 -6.22a0.802 0.802 0 0 0 -0.937 0L1.942 17.973a0.802 0.802 0 0 0 -0.335 0.653v7.747a0.802 0.802 0 0 0 0.335 0.654l20.091 14.424a0.802 0.802 0 0 0 0.937 0l20.088 -14.424a0.802 0.802 0 0 0 0.335 -0.654v-7.747a0.802 0.802 0 0 0 -0.335 -0.654zM22.033 7.327a0.802 0.802 0 0 1 0.937 0l5.126 3.68a0.802 0.802 0 0 1 0 1.306l-2.431 1.744a0.52 0.52 0 0 1 -0.598 -0.001l-2.097 -1.505a0.802 0.802 0 0 0 -0.937 0l-6.979 5.01a0.802 0.802 0 0 0 0 1.306l1.955 1.402 2.63 1.891 2.395 1.718a0.802 0.802 0 0 0 0.938 0l6.979 -5.015a0.802 0.802 0 0 0 0 -1.305l-1.654 -1.19a0.263 0.263 0 0 1 0 -0.427l2.873 -2.06a0.802 0.802 0 0 1 0.937 0l5.123 3.679a0.802 0.802 0 0 1 0 1.306l-2.433 1.747 -11.825 8.491a0.802 0.802 0 0 1 -0.937 0l-6.034 -4.333 -2.63 -1.886 -3.163 -2.27 -2.431 -1.747a0.802 0.802 0 0 1 0 -1.306z"
          fill="currentColor"
        />

        {!isDisabled && (
          // Racing line - uses the raceColor prop
          <motion.path
            ref={pathRef as any}
            d={cShapePath}
            fill="none"
            stroke={raceColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, pathOffset: 0 }}
            animate={{
              pathLength: 1,
              pathOffset: [0, 1],
            }}
            transition={{
              pathLength: {
                duration: 0.01,
                delay: 0.5,
              },
              pathOffset: {
                duration: 2.5,
                repeat: Number.POSITIVE_INFINITY,
                ease: 'linear',
              },
            }}
          />
        )}
      </motion.svg>
    </div>
  );
};
