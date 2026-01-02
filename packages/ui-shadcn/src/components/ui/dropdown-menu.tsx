import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react';

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

const dropdownMenuTriggerVariants = cva('', {
  variants: {
    variant: {
      default: '', // Uses render prop for custom trigger styling
      menubar:
        'hover:bg-muted aria-expanded:bg-muted rounded-sm px-2 py-1 text-sm font-medium flex items-center outline-hidden select-none',
      ellipsis:
        'size-5 [&>svg]:size-4 flex items-center justify-center cursor-pointer hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

function DropdownMenuTrigger({
  variant = 'default',
  ...props
}: Omit<MenuPrimitive.Trigger.Props, 'className'> &
  VariantProps<typeof dropdownMenuTriggerVariants>) {
  return (
    <MenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      className={dropdownMenuTriggerVariants({ variant })}
      {...props}
    />
  );
}

function DropdownMenuContent({
  align = 'start',
  alignOffset = 0,
  side = 'bottom',
  sideOffset = 4,
  ...props
}: Omit<MenuPrimitive.Popup.Props, 'className'> &
  Pick<MenuPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className="data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-48 rounded-md p-1 shadow-md ring-1 duration-100 z-50 max-h-(--available-height) origin-(--transform-origin) overflow-x-hidden overflow-y-auto outline-none data-closed:overflow-hidden"
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuLabel({
  inset,
  ...props
}: Omit<MenuPrimitive.GroupLabel.Props, 'className'> & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className="text-muted-foreground px-2 py-1.5 text-xs font-medium data-[inset]:pl-8"
      {...props}
    />
  );
}

function DropdownMenuItem({
  inset,
  variant = 'default',
  ...props
}: Omit<MenuPrimitive.Item.Props, 'className'> & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className="focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:text-destructive not-data-[variant=destructive]:focus:**:text-accent-foreground gap-2 rounded-sm px-2 py-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 group/dropdown-menu-item relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0"
      {...props}
    />
  );
}

function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  inset,
  children,
  ...props
}: Omit<MenuPrimitive.SubmenuTrigger.Props, 'className'> & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className="focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-2 rounded-sm px-2 py-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 flex cursor-default items-center outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0"
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </MenuPrimitive.SubmenuTrigger>
  );
}

function DropdownMenuSubContent({
  align = 'start',
  alignOffset = -3,
  side = 'right',
  sideOffset = 0,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  children,
  checked,
  ...props
}: Omit<MenuPrimitive.CheckboxItem.Props, 'className'>) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className="focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 group/checkbox"
      checked={checked}
      {...props}
    >
      <span
        className="pointer-events-none absolute left-2 flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input shadow-xs transition-shadow data-[checked=true]:bg-primary data-[checked=true]:text-primary-foreground data-[checked=true]:border-primary dark:bg-input/30 dark:data-[checked=true]:bg-primary group-data-[checked=true]/checkbox:bg-primary group-data-[checked=true]/checkbox:text-primary-foreground group-data-[checked=true]/checkbox:border-primary"
        data-slot="dropdown-menu-checkbox-item-indicator"
        data-checked={checked}
      >
        <MenuPrimitive.CheckboxItemIndicator className="grid place-content-center">
          <CheckIcon className="size-3.5" />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
  children,
  ...props
}: Omit<MenuPrimitive.RadioItem.Props, 'className'>) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className="focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 group/radio"
      {...props}
    >
      <span
        className="pointer-events-none absolute left-2 flex size-4 shrink-0 items-center justify-center rounded-full border border-input shadow-xs transition-shadow dark:bg-input/30 group-data-[checked=true]/radio:border-primary"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <MenuPrimitive.RadioItemIndicator className="grid place-content-center">
          <CircleIcon className="size-2 fill-primary text-primary" />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

function DropdownMenuSeparator({ ...props }: Omit<MenuPrimitive.Separator.Props, 'className'>) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className="bg-border -mx-1 my-1 h-px"
      {...props}
    />
  );
}

function DropdownMenuShortcut({ ...props }: Omit<React.ComponentProps<'span'>, 'className'>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className="text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground ml-auto text-xs tracking-widest"
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  dropdownMenuTriggerVariants,
};
