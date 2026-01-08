import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';

function ItemGroup({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      role="list"
      data-slot="item-group"
      className="gap-4 has-[[data-size=sm]]:gap-2.5 has-[[data-size=xs]]:gap-2 group/item-group flex w-full flex-col"
      {...props}
    />
  );
}

function ItemSeparator({ ...props }: Omit<SeparatorPrimitive.Props, 'className'>) {
  return (
    <SeparatorPrimitive
      data-slot="item-separator"
      orientation="horizontal"
      className="bg-border shrink-0 h-px w-full my-2"
      {...props}
    />
  );
}

const itemVariants = cva(
  '[a]:hover:bg-muted rounded-md border text-sm w-full group/item focus-visible:border-ring focus-visible:ring-ring/50 flex items-center flex-wrap outline-none transition-colors duration-100 focus-visible:ring-[3px] [a]:transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent',
        outline: 'border-border',
        muted: 'bg-muted/50 border-transparent',
      },
      size: {
        default: 'gap-3.5 px-4 py-3.5',
        sm: 'gap-2.5 px-3 py-2.5',
        xs: 'gap-2 px-2.5 py-2 [[data-slot=dropdown-menu-content]_&]:p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Item({
  variant = 'default',
  size = 'default',
  render,
  ...props
}: Omit<useRender.ComponentProps<'div'>, 'className'> & VariantProps<typeof itemVariants>) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: itemVariants({ variant, size }),
      },
      props,
    ),
    render,
    state: {
      slot: 'item',
      variant,
      size,
    },
  });
}

const itemMediaVariants = cva(
  'gap-2 group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start flex shrink-0 items-center justify-center [&_svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: "[&_svg:not([class*='size-'])]:size-4",
        image:
          'size-10 overflow-hidden rounded-sm group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function ItemMedia({
  variant = 'default',
  ...props
}: Omit<React.ComponentProps<'div'>, 'className'> & VariantProps<typeof itemMediaVariants>) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={itemMediaVariants({ variant })}
      {...props}
    />
  );
}

function ItemContent({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="item-content"
      className="gap-1 group-data-[size=xs]/item:gap-0 flex flex-1 flex-col [&+[data-slot=item-content]]:flex-none"
      {...props}
    />
  );
}

function ItemTitle({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="item-title"
      className="gap-2 text-sm leading-snug font-medium underline-offset-4 line-clamp-1 flex w-fit items-center"
      {...props}
    />
  );
}

function ItemDescription({ ...props }: Omit<React.ComponentProps<'p'>, 'className'>) {
  return (
    <p
      data-slot="item-description"
      className="text-muted-foreground text-left text-sm leading-normal group-data-[size=xs]/item:text-xs [&>a:hover]:text-primary line-clamp-2 font-normal [&>a]:underline [&>a]:underline-offset-4"
      {...props}
    />
  );
}

function ItemActions({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return <div data-slot="item-actions" className="gap-2 flex items-center" {...props} />;
}

function ItemHeader({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="item-header"
      className="gap-2 flex basis-full items-center justify-between"
      {...props}
    />
  );
}

function ItemFooter({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="item-footer"
      className="gap-2 flex basis-full items-center justify-between"
      {...props}
    />
  );
}

export {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
};
