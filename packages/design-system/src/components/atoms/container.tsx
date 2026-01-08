import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const containerVariants = cva('mx-auto w-full', {
  variants: {
    size: {
      sm: 'max-w-screen-sm', // 640px
      md: 'max-w-screen-md', // 768px
      lg: 'max-w-screen-lg', // 1024px
      xl: 'max-w-[1200px]',
      '2xl': 'max-w-[1400px]',
      full: 'max-w-full',
    },
    padding: {
      none: 'px-0',
      sm: 'px-4',
      default: 'px-4 sm:px-6 lg:px-8',
      lg: 'px-6 sm:px-8 lg:px-12',
    },
  },
  defaultVariants: {
    size: 'xl',
    padding: 'default',
  },
});

interface ContainerProps
  extends Omit<React.ComponentProps<'div'>, 'className'>, VariantProps<typeof containerVariants> {}

function Container({ size, padding, ...props }: ContainerProps) {
  return <div data-slot="container" className={containerVariants({ size, padding })} {...props} />;
}

export { Container, containerVariants };
