import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import * as React from 'react';

const alertVariants = cva(
  'grid gap-0.5 rounded-lg border px-4 py-3 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*="size-"])]:size-4 w-full relative group/alert',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200 *:data-[slot=alert-description]:text-blue-700 dark:*:data-[slot=alert-description]:text-blue-300',
        success:
          'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/50 dark:text-green-200 *:data-[slot=alert-description]:text-green-700 dark:*:data-[slot=alert-description]:text-green-300',
        warning:
          'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-200 *:data-[slot=alert-description]:text-yellow-700 dark:*:data-[slot=alert-description]:text-yellow-300',
        destructive:
          'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200 *:data-[slot=alert-description]:text-red-700 dark:*:data-[slot=alert-description]:text-red-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const variantIcons = {
  default: null,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: AlertCircle,
} as const;

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>['variant']>;

interface AlertProps
  extends Omit<React.ComponentProps<'div'>, 'className' | 'title'>,
    VariantProps<typeof alertVariants> {
  /** Alert title - renders AlertTitle component */
  title?: React.ReactNode;
  /** Alert description - renders AlertDescription component */
  description?: React.ReactNode;
  /** Custom icon - if not provided, uses default icon for the variant */
  icon?: React.ReactNode;
  /** Hide the default variant icon */
  hideIcon?: boolean;
}

function Alert({
  variant = 'default',
  title,
  description,
  icon,
  hideIcon,
  children,
  ...props
}: AlertProps) {
  // Determine the icon to show
  const showIcon = !hideIcon && (icon !== undefined || variant !== 'default');
  const IconComponent = variantIcons[variant as AlertVariant];
  const renderedIcon = icon ?? (IconComponent ? <IconComponent /> : null);

  // If title/description are provided, render the simple API
  if (title || description) {
    return (
      <div data-slot="alert" role="alert" className={alertVariants({ variant })} {...props}>
        {showIcon && renderedIcon}
        {title && <AlertTitle>{title}</AlertTitle>}
        {description && <AlertDescription>{description}</AlertDescription>}
        {children}
      </div>
    );
  }

  // Otherwise, render children (compound component pattern)
  return (
    <div data-slot="alert" role="alert" className={alertVariants({ variant })} {...props}>
      {showIcon && renderedIcon}
      {children}
    </div>
  );
}

function AlertTitle({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="alert-title"
      className="font-medium group-has-[>svg]/alert:col-start-2 [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3"
      {...props}
    />
  );
}

function AlertDescription({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="alert-description"
      className="text-sm text-balance md:text-pretty [&_p:not(:last-child)]:mb-4 [&_a]:hover:text-foreground [&_a]:underline [&_a]:underline-offset-3"
      {...props}
    />
  );
}

function AlertAction({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return <div data-slot="alert-action" className="absolute top-2.5 right-3" {...props} />;
}

export { Alert, AlertAction, AlertDescription, AlertTitle, alertVariants };
