import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const cardVariants = cva(
  'ring-foreground/10 bg-card text-card-foreground gap-6 overflow-hidden rounded-xl py-6 text-sm shadow-xs ring-1 has-[>img:first-child]:pt-0 data-[size=sm]:gap-4 data-[size=sm]:py-4 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl group/card flex flex-col',
  {
    variants: {
      width: {
        auto: '', // shrink to content (default behavior)
        full: 'w-full', // fill parent container
        sm: 'w-sm', // 24rem (384px)
        md: 'w-md', // 28rem (448px)
        lg: 'w-lg', // 32rem (512px)
        xl: 'w-xl', // 36rem (576px)
        '2xl': 'w-2xl', // 42rem (672px)
        '3xl': 'w-3xl', // 48rem (768px)
      },
      maxWidth: {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        full: 'max-w-full',
      },
    },
    defaultVariants: {
      width: 'auto',
    },
  },
);

interface CardProps
  extends
    Omit<React.ComponentProps<'div'>, 'className' | 'title'>,
    VariantProps<typeof cardVariants> {
  size?: 'default' | 'sm';
  /** Card title - renders in CardHeader */
  title?: React.ReactNode;
  /** Card description - renders below title in CardHeader */
  description?: React.ReactNode;
  /** Action element(s) in the header (e.g., buttons, badges) */
  headerAction?: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
}

function Card({
  size = 'default',
  width,
  maxWidth,
  title,
  description,
  headerAction,
  footer,
  children,
  ...props
}: CardProps) {
  const hasHeader = title || description || headerAction;

  // Check if children contain compound components (have data-slot)
  const hasCompoundChildren = React.Children.toArray(children).some((child) => {
    if (React.isValidElement(child)) {
      const props = child.props as Record<string, unknown>;
      return (
        props['data-slot'] === 'card-header' ||
        props['data-slot'] === 'card-content' ||
        props['data-slot'] === 'card-footer'
      );
    }
    return false;
  });

  return (
    <div data-slot="card" data-size={size} className={cardVariants({ width, maxWidth })} {...props}>
      {hasHeader && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
          {headerAction && <CardAction>{headerAction}</CardAction>}
        </CardHeader>
      )}
      {hasCompoundChildren ? children : children && <CardContent>{children}</CardContent>}
      {footer && <CardFooter>{footer}</CardFooter>}
    </div>
  );
}

function CardHeader({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="card-header"
      className="gap-1 rounded-t-xl px-6 group-data-[size=sm]/card:px-4 [.border-b]:pb-6 group-data-[size=sm]/card:[.border-b]:pb-4 group/card-header @container/card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]"
      {...props}
    />
  );
}

function CardTitle({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="card-title"
      className="text-base leading-normal font-medium group-data-[size=sm]/card:text-sm"
      {...props}
    />
  );
}

function CardDescription({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return <div data-slot="card-description" className="text-muted-foreground text-sm" {...props} />;
}

function CardAction({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="card-action"
      className="col-start-2 row-span-2 row-start-1 self-start justify-self-end"
      {...props}
    />
  );
}

function CardContent({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div data-slot="card-content" className="px-6 group-data-[size=sm]/card:px-4" {...props} />
  );
}

function CardFooter({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="card-footer"
      className="rounded-b-xl px-6 group-data-[size=sm]/card:px-4 [.border-t]:pt-6 group-data-[size=sm]/card:[.border-t]:pt-4 flex items-center justify-end gap-2"
      {...props}
    />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cardVariants,
};
