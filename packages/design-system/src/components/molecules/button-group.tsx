import { mergeProps } from '@base-ui/react/merge-props';
import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonGroupVariants = cva(
  "has-[>[data-slot=button-group]]:gap-2 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md flex w-fit items-stretch [&>*]:focus-visible:z-10 [&>*]:focus-visible:relative [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    variants: {
      orientation: {
        horizontal:
          '[&>[data-slot]:not(:has(~[data-slot]))]:rounded-r-md! [&>[data-slot]~[data-slot]]:rounded-l-none [&>[data-slot]~[data-slot]]:border-l-0 [&>[data-slot]]:rounded-r-none',
        vertical:
          '[&>[data-slot]:not(:has(~[data-slot]))]:rounded-b-md! flex-col [&>[data-slot]~[data-slot]]:rounded-t-none [&>[data-slot]~[data-slot]]:border-t-0 [&>[data-slot]]:rounded-b-none',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
    },
  },
);

const buttonGroupTextVariants = cva(
  "gap-2 rounded-md border px-2.5 text-sm font-medium shadow-xs [&_svg:not([class*='size-'])]:size-4 flex items-center [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: 'bg-muted',
        display: 'bg-background border-y border-x-0 min-w-[60px] justify-center tabular-nums',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function ButtonGroup({
  orientation,
  ...props
}: Omit<React.ComponentProps<'div'>, 'className'> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={buttonGroupVariants({ orientation })}
      {...props}
    />
  );
}

function ButtonGroupText({
  variant,
  render,
  ...props
}: Omit<useRender.ComponentProps<'div'>, 'className'> &
  VariantProps<typeof buttonGroupTextVariants>) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: buttonGroupTextVariants({ variant }),
      },
      props,
    ),
    render,
    state: {
      slot: 'button-group-text',
      variant,
    },
  });
}

function ButtonGroupSeparator({
  orientation = 'vertical',
  ...props
}: Omit<SeparatorPrimitive.Props, 'className'>) {
  return (
    <SeparatorPrimitive
      data-slot="button-group-separator"
      orientation={orientation}
      className="bg-input shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch relative data-[orientation=horizontal]:mx-px data-[orientation=horizontal]:w-auto data-[orientation=vertical]:my-px data-[orientation=vertical]:h-auto"
      {...props}
    />
  );
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants };
