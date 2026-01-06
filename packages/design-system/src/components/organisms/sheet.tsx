import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import * as React from 'react';

import { XIcon } from 'lucide-react';
import { Button } from '../atoms/button';

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ ...props }: Omit<SheetPrimitive.Backdrop.Props, 'className'>) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className="data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/10 duration-100 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 z-50"
      {...props}
    />
  );
}

function SheetContent({
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: Omit<SheetPrimitive.Popup.Props, 'className'> & {
  side?: 'top' | 'right' | 'bottom' | 'left';
  showCloseButton?: boolean;
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className="bg-background data-open:animate-in data-closed:animate-out data-[side=right]:data-closed:slide-out-to-right-10 data-[side=right]:data-open:slide-in-from-right-10 data-[side=left]:data-closed:slide-out-to-left-10 data-[side=left]:data-open:slide-in-from-left-10 data-[side=top]:data-closed:slide-out-to-top-10 data-[side=top]:data-open:slide-in-from-top-10 data-closed:fade-out-0 data-open:fade-in-0 data-[side=bottom]:data-closed:slide-out-to-bottom-10 data-[side=bottom]:data-open:slide-in-from-bottom-10 fixed z-50 flex flex-col gap-4 px-4 bg-clip-padding text-sm shadow-lg transition duration-200 ease-in-out data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm"
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={<Button variant="ghost" size="icon-sm" />}
            className="absolute top-4 right-4"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return <div data-slot="sheet-header" className="gap-0.5 pt-4 flex flex-col" {...props} />;
}

function SheetFooter({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return <div data-slot="sheet-footer" className="gap-2 pb-4 mt-auto flex flex-col" {...props} />;
}

function SheetTitle({ ...props }: Omit<SheetPrimitive.Title.Props, 'className'>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className="text-foreground text-base font-medium"
      {...props}
    />
  );
}

function SheetDescription({ ...props }: Omit<SheetPrimitive.Description.Props, 'className'>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className="text-muted-foreground text-sm"
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
