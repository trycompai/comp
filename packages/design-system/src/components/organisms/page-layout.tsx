import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const pageLayoutVariants = cva('min-h-dvh bg-background text-foreground', {
  variants: {
    variant: {
      default: 'flex flex-col',
      center: 'flex items-center justify-center',
    },
    contentWidth: {
      auto: '',
      sm: 'w-full max-w-sm',
      md: 'w-full max-w-md',
      lg: 'w-full max-w-lg',
      xl: 'w-full max-w-xl',
      '2xl': 'w-full max-w-2xl',
      '3xl': 'w-full max-w-3xl',
      full: 'w-full max-w-full',
    },
    padding: {
      none: '',
      sm: 'px-4 py-6',
      default: 'px-4 py-10 sm:px-6 lg:px-8',
      lg: 'px-6 py-12 sm:px-8 lg:px-12',
    },
  },
  defaultVariants: {
    variant: 'default',
    contentWidth: 'auto',
    padding: 'default',
  },
});

interface PageLayoutProps
  extends
    Omit<React.ComponentProps<'div'>, 'className' | 'children'>,
    VariantProps<typeof pageLayoutVariants> {
  children?: React.ReactNode;
}

function PageLayout({ variant, padding, contentWidth, children, ...props }: PageLayoutProps) {
  const resolvedContentWidth = contentWidth ?? (variant === 'center' ? 'lg' : 'auto');

  return (
    <div
      data-slot="page-layout"
      data-variant={variant}
      className={pageLayoutVariants({ variant, padding })}
      {...props}
    >
      {resolvedContentWidth !== 'auto' ? (
        <div
          data-slot="page-layout-content"
          className={pageLayoutVariants({ contentWidth: resolvedContentWidth })}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export { PageLayout, pageLayoutVariants };
