import { NavigationMenu as NavigationMenuPrimitive } from '@base-ui/react/navigation-menu';
import { cva } from 'class-variance-authority';

import { ChevronDownIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';

function NavigationMenu({
  children,
  ...props
}: Omit<NavigationMenuPrimitive.Root.Props, 'className'>) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      className="max-w-max group/navigation-menu relative flex max-w-max flex-1 items-center justify-center"
      {...props}
    >
      {children}
      <NavigationMenuPositioner />
    </NavigationMenuPrimitive.Root>
  );
}

function NavigationMenuList({ ...props }: Omit<NavigationMenuPrimitive.List.Props, 'className'>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className="gap-0 group flex flex-1 list-none items-center justify-center"
      {...props}
    />
  );
}

function NavigationMenuItem({ ...props }: Omit<NavigationMenuPrimitive.Item.Props, 'className'>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className="relative"
      {...props}
    />
  );
}

const navigationMenuTriggerStyle = cva(
  'bg-background hover:bg-muted focus:bg-muted data-open:hover:bg-muted data-open:focus:bg-muted data-open:bg-muted/50 focus-visible:ring-ring/50 data-popup-open:bg-muted/50 data-popup-open:hover:bg-muted rounded-md px-4 py-2 text-sm font-medium transition-all focus-visible:ring-[3px] focus-visible:outline-1 disabled:opacity-50 group/navigation-menu-trigger inline-flex h-9 w-max items-center justify-center disabled:pointer-events-none outline-none',
);

function NavigationMenuTrigger({
  children,
  ...props
}: Omit<NavigationMenuPrimitive.Trigger.Props, 'className'>) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), 'group')}
      {...props}
    >
      {children}{' '}
      <ChevronDownIcon
        className="relative top-[1px] ml-1 size-3 transition duration-300 group-data-open/navigation-menu-trigger:rotate-180 group-data-popup-open/navigation-menu-trigger:rotate-180"
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  );
}

function NavigationMenuContent({
  ...props
}: Omit<NavigationMenuPrimitive.Content.Props, 'className'>) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className="data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:data-open:animate-in group-data-[viewport=false]/navigation-menu:data-closed:animate-out group-data-[viewport=false]/navigation-menu:data-closed:zoom-out-95 group-data-[viewport=false]/navigation-menu:data-open:zoom-in-95 group-data-[viewport=false]/navigation-menu:data-open:fade-in-0 group-data-[viewport=false]/navigation-menu:data-closed:fade-out-0 group-data-[viewport=false]/navigation-menu:ring-foreground/10 p-2 pr-2.5 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[viewport=false]/navigation-menu:rounded-md group-data-[viewport=false]/navigation-menu:shadow group-data-[viewport=false]/navigation-menu:ring-1 group-data-[viewport=false]/navigation-menu:duration-300 h-full w-auto **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none"
      {...props}
    />
  );
}

function NavigationMenuPositioner({
  side = 'bottom',
  sideOffset = 8,
  align = 'start',
  alignOffset = 0,
  ...props
}: Omit<NavigationMenuPrimitive.Positioner.Props, 'className'>) {
  return (
    <NavigationMenuPrimitive.Portal>
      <NavigationMenuPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className="transition-[top,left,right,bottom] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[side=bottom]:before:top-[-10px] data-[side=bottom]:before:right-0 data-[side=bottom]:before:left-0 isolate z-50 h-[var(--positioner-height)] w-[var(--positioner-width)] max-w-[var(--available-width)] data-[instant]:transition-none"
        {...props}
      >
        <NavigationMenuPrimitive.Popup className="bg-popover text-popover-foreground ring-foreground/10 rounded-lg shadow ring-1 transition-all ease-[cubic-bezier(0.22,1,0.36,1)] outline-none data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[ending-style]:duration-150 data-[starting-style]:scale-90 data-[starting-style]:opacity-0 xs:w-(--popup-width) relative h-(--popup-height) w-(--popup-width) origin-(--transform-origin)">
          <NavigationMenuPrimitive.Viewport className="relative size-full overflow-hidden" />
        </NavigationMenuPrimitive.Popup>
      </NavigationMenuPrimitive.Positioner>
    </NavigationMenuPrimitive.Portal>
  );
}

function NavigationMenuLink({ ...props }: Omit<NavigationMenuPrimitive.Link.Props, 'className'>) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className="data-[active=true]:focus:bg-muted data-[active=true]:hover:bg-muted data-[active=true]:bg-muted/50 focus-visible:ring-ring/50 hover:bg-muted focus:bg-muted flex items-center gap-1.5 rounded-sm p-2 text-sm transition-all outline-none focus-visible:ring-[3px] focus-visible:outline-1 [&_svg:not([class*='size-'])]:size-4"
      {...props}
    />
  );
}

function NavigationMenuIndicator({
  ...props
}: Omit<NavigationMenuPrimitive.Icon.Props, 'className'>) {
  return (
    <NavigationMenuPrimitive.Icon
      data-slot="navigation-menu-indicator"
      className="data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden"
      {...props}
    >
      <div className="bg-border rounded-tl-sm shadow-md relative top-[60%] h-2 w-2 rotate-45" />
    </NavigationMenuPrimitive.Icon>
  );
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPositioner,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
};
