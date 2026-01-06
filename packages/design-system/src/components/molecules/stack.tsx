import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const stackVariants = cva('flex', {
  variants: {
    direction: {
      row: 'flex-row',
      column: 'flex-col',
      'row-reverse': 'flex-row-reverse',
      'column-reverse': 'flex-col-reverse',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    textAlign: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    },
    gap: {
      '0': 'gap-0',
      '0.5': 'gap-0.5',
      '1': 'gap-1',
      '1.5': 'gap-1.5',
      '2': 'gap-2',
      '2.5': 'gap-2.5',
      '3': 'gap-3',
      '4': 'gap-4',
      '5': 'gap-5',
      '6': 'gap-6',
      '8': 'gap-8',
      '10': 'gap-10',
      '12': 'gap-12',
    },
    wrap: {
      true: 'flex-wrap',
      false: 'flex-nowrap',
    },
  },
  defaultVariants: {
    direction: 'column',
    gap: '0',
    wrap: false,
  },
});

interface StackProps
  extends Omit<React.ComponentProps<'div'>, 'className'>, VariantProps<typeof stackVariants> {}

function Stack({ direction, align, justify, gap, wrap, textAlign, ...props }: StackProps) {
  return (
    <div
      data-slot="stack"
      className={stackVariants({ direction, align, justify, gap, wrap, textAlign })}
      {...props}
    />
  );
}

export { Stack, stackVariants };
