import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';

function Separator({
  orientation = 'horizontal',
  ...props
}: Omit<SeparatorPrimitive.Props, 'className'>) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className="bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch"
      {...props}
    />
  );
}

export { Separator };
