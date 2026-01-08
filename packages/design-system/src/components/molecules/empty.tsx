import { cva, type VariantProps } from 'class-variance-authority';

function Empty({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="empty"
      className="gap-4 rounded-lg border-dashed p-12 flex w-full min-w-0 flex-1 flex-col items-center justify-center text-center text-balance"
      {...props}
    />
  );
}

function EmptyHeader({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="empty-header"
      className="gap-2 flex max-w-sm flex-col items-center"
      {...props}
    />
  );
}

const emptyMediaVariants = cva(
  'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function EmptyMedia({
  variant = 'default',
  ...props
}: Omit<React.ComponentProps<'div'>, 'className'> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={emptyMediaVariants({ variant })}
      {...props}
    />
  );
}

function EmptyTitle({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="empty-title"
      className="text-lg font-medium tracking-tight"
      {...props}
    />
  );
}

function EmptyDescription({ ...props }: Omit<React.ComponentProps<'p'>, 'className'>) {
  return (
    <div
      data-slot="empty-description"
      className="text-sm/relaxed text-muted-foreground [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4"
      {...props}
    />
  );
}

function EmptyContent({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="empty-content"
      className="gap-4 text-sm flex w-full max-w-sm min-w-0 flex-col items-center text-balance"
      {...props}
    />
  );
}

export { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle };
