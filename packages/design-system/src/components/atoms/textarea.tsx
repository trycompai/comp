import * as React from 'react';

function Textarea({
  size = 'default',
  ...props
}: Omit<React.ComponentProps<'textarea'>, 'className'> & {
  size?: 'sm' | 'default' | 'lg' | 'full';
}) {
  return (
    <textarea
      data-slot="textarea"
      data-size={size}
      className="border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 rounded-lg border bg-transparent px-2.5 py-2 text-base transition-colors focus-visible:ring-[3px] aria-invalid:ring-[3px] md:text-sm placeholder:text-muted-foreground flex field-sizing-content min-h-16 outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[size=sm]:w-xs data-[size=default]:w-md data-[size=lg]:w-xl data-[size=full]:w-full"
      {...props}
    />
  );
}

export { Textarea };
