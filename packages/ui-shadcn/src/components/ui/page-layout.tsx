import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const pageLayoutVariants = cva('min-h-dvh bg-background text-foreground', {
  variants: {
    variant: {
      default: 'flex flex-col',
      center: 'flex items-center justify-center',
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
    padding: 'default',
  },
});

interface PageLayoutProps
  extends Omit<React.ComponentProps<'div'>, 'className'>, VariantProps<typeof pageLayoutVariants> {}

function PageLayout({ variant, padding, ...props }: PageLayoutProps) {
  return (
    <div
      data-slot="page-layout"
      data-variant={variant}
      className={pageLayoutVariants({ variant, padding })}
      {...props}
    />
  );
}

export { PageLayout, pageLayoutVariants };
