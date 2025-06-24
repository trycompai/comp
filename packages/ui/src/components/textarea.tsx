import * as React from 'react';

import { cn } from '../utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'border-input bg-background flex min-h-[60px] w-full rounded-sm border px-3 py-2 text-sm transition-colors',
          'placeholder:text-muted-foreground focus-visible:ring-ring',
          'focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:outline-hidden',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
