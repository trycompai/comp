import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../../lib/utils';

const gridVariants = cva('grid', {
  variants: {
    gap: {
      '0': 'gap-0',
      '1': 'gap-1',
      '2': 'gap-2',
      '3': 'gap-3',
      '4': 'gap-4',
      '5': 'gap-5',
      '6': 'gap-6',
      '8': 'gap-8',
      '10': 'gap-10',
      '12': 'gap-12',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    },
  },
  defaultVariants: {
    gap: '4',
    align: 'stretch',
  },
});

const gridColsVariants = cva('', {
  variants: {
    cols: {
      '1': 'grid-cols-1',
      '2': 'grid-cols-2',
      '3': 'grid-cols-3',
      '4': 'grid-cols-4',
      '5': 'grid-cols-5',
      '6': 'grid-cols-6',
      '12': 'grid-cols-12',
    },
  },
  defaultVariants: {
    cols: '1',
  },
});

type ResponsiveCols = {
  base?: '1' | '2' | '3' | '4' | '5' | '6' | '12';
  sm?: '1' | '2' | '3' | '4' | '5' | '6' | '12';
  md?: '1' | '2' | '3' | '4' | '5' | '6' | '12';
  lg?: '1' | '2' | '3' | '4' | '5' | '6' | '12';
  xl?: '1' | '2' | '3' | '4' | '5' | '6' | '12';
};

const responsiveColsMap: Record<string, Record<string, string>> = {
  base: {
    '1': 'grid-cols-1',
    '2': 'grid-cols-2',
    '3': 'grid-cols-3',
    '4': 'grid-cols-4',
    '5': 'grid-cols-5',
    '6': 'grid-cols-6',
    '12': 'grid-cols-12',
  },
  sm: {
    '1': 'sm:grid-cols-1',
    '2': 'sm:grid-cols-2',
    '3': 'sm:grid-cols-3',
    '4': 'sm:grid-cols-4',
    '5': 'sm:grid-cols-5',
    '6': 'sm:grid-cols-6',
    '12': 'sm:grid-cols-12',
  },
  md: {
    '1': 'md:grid-cols-1',
    '2': 'md:grid-cols-2',
    '3': 'md:grid-cols-3',
    '4': 'md:grid-cols-4',
    '5': 'md:grid-cols-5',
    '6': 'md:grid-cols-6',
    '12': 'md:grid-cols-12',
  },
  lg: {
    '1': 'lg:grid-cols-1',
    '2': 'lg:grid-cols-2',
    '3': 'lg:grid-cols-3',
    '4': 'lg:grid-cols-4',
    '5': 'lg:grid-cols-5',
    '6': 'lg:grid-cols-6',
    '12': 'lg:grid-cols-12',
  },
  xl: {
    '1': 'xl:grid-cols-1',
    '2': 'xl:grid-cols-2',
    '3': 'xl:grid-cols-3',
    '4': 'xl:grid-cols-4',
    '5': 'xl:grid-cols-5',
    '6': 'xl:grid-cols-6',
    '12': 'xl:grid-cols-12',
  },
};

const getResponsiveClasses = (cols: ResponsiveCols): string => {
  const classes: string[] = [];
  const withBase: ResponsiveCols = cols.base ? cols : { base: '1', ...cols };

  for (const [breakpoint, value] of Object.entries(withBase)) {
    if (value && responsiveColsMap[breakpoint]?.[value]) {
      classes.push(responsiveColsMap[breakpoint][value]);
    }
  }

  return classes.join(' ');
};

interface GridProps
  extends
    Omit<React.ComponentProps<'div'>, 'cols' | 'className'>,
    VariantProps<typeof gridVariants> {
  cols?: '1' | '2' | '3' | '4' | '5' | '6' | '12' | ResponsiveCols;
}

function Grid({ cols = '1', gap, align, ...props }: GridProps) {
  const colsClasses =
    typeof cols === 'object' ? getResponsiveClasses(cols) : gridColsVariants({ cols });

  return (
    <div data-slot="grid" className={cn(gridVariants({ gap, align }), colsClasses)} {...props} />
  );
}

export { Grid, gridVariants };
