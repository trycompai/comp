import * as React from 'react';

import { cn } from '../utils';

interface InputProps extends React.ComponentProps<'input'> {
  leftIcon?: React.ReactNode;
  prefix?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leftIcon, prefix, ...props }, ref) => {
    const isUrl = type === 'url';
    const isPrefix = !!prefix;

    const adornmentWidth = 82; // px, matches pl-[82px]

    return (
      <div className={cn('relative w-full', className)}>
        {isPrefix && prefix && (
          <span
            className="text-muted-foreground border-input bg-foreground/5 absolute top-0 left-0 flex h-full cursor-default items-center border-r px-4 text-sm font-medium select-none"
            style={{
              width: adornmentWidth,
              zIndex: 2,
              borderTopLeftRadius: '0.125rem',
              borderBottomLeftRadius: '0.125rem',
            }}
          >
            {prefix}
          </span>
        )}
        {leftIcon && !isUrl && !isPrefix && (
          <span className="text-primary pointer-events-none absolute top-0 left-0 flex h-full items-center justify-center pl-3 text-sm">
            {leftIcon}
          </span>
        )}
        <input
          type={type}
          // Add these attributes to help prevent interference from browser extensions
          autoComplete="off"
          data-lpignore="true"
          className={cn(
            'border-input bg-background flex h-9 w-full rounded-sm border py-1 text-sm transition-colors',
            'placeholder:text-muted-foreground file:text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'focus-visible:ring-ring focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:outline-hidden',
            'text-sm disabled:cursor-not-allowed disabled:opacity-50',
            isPrefix ? 'pl-[90px]' : leftIcon ? 'pl-[36px]' : 'px-3',
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
