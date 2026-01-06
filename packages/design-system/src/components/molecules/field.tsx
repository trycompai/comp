'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { useMemo } from 'react';

import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';

function FieldSet({ ...props }: Omit<React.ComponentProps<'fieldset'>, 'className'>) {
  return (
    <fieldset
      data-slot="field-set"
      className="gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3 flex flex-col"
      {...props}
    />
  );
}

function FieldLegend({
  variant = 'legend',
  ...props
}: Omit<React.ComponentProps<'legend'>, 'className'> & { variant?: 'legend' | 'label' }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className="mb-1.5 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base"
      {...props}
    />
  );
}

function FieldGroup({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="field-group"
      className="gap-5 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4 group/field-group @container/field-group flex w-full flex-col"
      {...props}
    />
  );
}

const fieldVariants = cva('data-[invalid=true]:text-destructive gap-2 group/field flex w-full', {
  variants: {
    orientation: {
      vertical: 'flex-col [&>*]:w-full [&>.sr-only]:w-auto',
      horizontal:
        'flex-row items-center [&>[data-slot=field-label]]:flex-auto has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
      responsive:
        'flex-col [&>*]:w-full [&>.sr-only]:w-auto @md/field-group:flex-row @md/field-group:items-center @md/field-group:[&>*]:w-auto @md/field-group:[&>[data-slot=field-label]]:flex-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
    },
  },
  defaultVariants: {
    orientation: 'vertical',
  },
});

function Field({
  orientation = 'vertical',
  ...props
}: Omit<React.ComponentProps<'div'>, 'className'> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={fieldVariants({ orientation })}
      {...props}
    />
  );
}

function FieldContent({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="field-content"
      className="gap-0.5 group/field-content flex flex-1 flex-col leading-snug"
      {...props}
    />
  );
}

function FieldLabel({ ...props }: Omit<React.ComponentProps<'label'>, 'className'>) {
  return (
    <label
      data-slot="field-label"
      className="gap-2 text-sm leading-none font-medium group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50 flex items-center select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed has-data-checked:bg-primary/5 has-data-checked:border-primary dark:has-data-checked:bg-primary/10 group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-2.5 group/field-label peer/field-label w-fit leading-snug has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col"
      {...props}
    />
  );
}

function FieldTitle({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="field-label"
      className="gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50 flex w-fit items-center leading-snug"
      {...props}
    />
  );
}

function FieldDescription({ ...props }: Omit<React.ComponentProps<'p'>, 'className'>) {
  return (
    <p
      data-slot="field-description"
      className="text-muted-foreground text-left text-sm [[data-variant=legend]+&]:-mt-1.5 leading-normal font-normal group-has-[[data-orientation=horizontal]]/field:text-balance last:mt-0 nth-last-2:-mt-1 [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4"
      {...props}
    />
  );
}

function FieldSeparator({
  children,
  ...props
}: Omit<React.ComponentProps<'div'>, 'className'> & {
  children?: React.ReactNode;
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className="-my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2 relative"
      {...props}
    >
      <SeparatorPrimitive className="bg-border shrink-0 h-px w-full absolute inset-0 top-1/2" />
      {children && (
        <span
          className="text-muted-foreground px-2 bg-background relative mx-auto block w-fit"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  );
}

function FieldError({
  children,
  errors,
  ...props
}: Omit<React.ComponentProps<'div'>, 'className'> & {
  errors?: Array<{ message?: string } | undefined>;
}) {
  const content = useMemo(() => {
    if (children) {
      return children;
    }

    if (!errors?.length) {
      return null;
    }

    const uniqueErrors = [...new Map(errors.map((error) => [error?.message, error])).values()];

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message;
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map((error, index) => error?.message && <li key={index}>{error.message}</li>)}
      </ul>
    );
  }, [children, errors]);

  if (!content) {
    return null;
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className="text-destructive text-sm font-normal"
      {...props}
    >
      {content}
    </div>
  );
}

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
};
