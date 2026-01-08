function Kbd({ ...props }: Omit<React.ComponentProps<'kbd'>, 'className'>) {
  return (
    <kbd
      data-slot="kbd"
      className="bg-muted text-muted-foreground [[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10 h-5 w-fit min-w-5 gap-1 rounded-sm px-1 font-sans text-xs font-medium [&_svg:not([class*='size-'])]:size-3 pointer-events-none inline-flex items-center justify-center select-none"
      {...props}
    />
  );
}

function KbdGroup({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <kbd
      data-slot="kbd-group"
      className="gap-1 inline-flex items-center"
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
