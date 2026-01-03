import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const headingVariants = cva('font-semibold', {
  variants: {
    level: {
      '1': 'text-2xl tracking-tight',
      '2': 'text-xl',
      '3': 'text-lg font-medium',
      '4': 'text-base font-medium',
      '5': 'text-sm font-medium',
      '6': 'text-sm font-medium',
    },
    variant: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
    },
    tracking: {
      default: '',
      tight: 'tracking-tight',
    },
  },
  defaultVariants: {
    level: '1',
    variant: 'default',
    tracking: 'default',
  },
});

type HeadingLevel = '1' | '2' | '3' | '4' | '5' | '6';

type HeadingProps<T extends HeadingLevel = '1'> = {
  level?: T;
  as?: `h${HeadingLevel}`;
} & Omit<VariantProps<typeof headingVariants>, 'level'> &
  Omit<React.ComponentProps<`h${T}`>, 'className'>;

function Heading<T extends HeadingLevel = '1'>({
  level = '1' as T,
  as,
  variant,
  tracking,
  ...props
}: HeadingProps<T>) {
  const Component = as ?? (`h${level}` as `h${T}`);

  return (
    <Component
      data-slot="heading"
      className={headingVariants({ level, variant, tracking })}
      {...props}
    />
  );
}

export { Heading, headingVariants };
