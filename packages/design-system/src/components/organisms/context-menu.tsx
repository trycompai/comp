import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu';

import { CheckIcon, ChevronRightIcon } from 'lucide-react';

function ContextMenu({ ...props }: ContextMenuPrimitive.Root.Props) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />;
}

function ContextMenuPortal({ ...props }: ContextMenuPrimitive.Portal.Props) {
  return <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />;
}

function ContextMenuTrigger({ ...props }: Omit<ContextMenuPrimitive.Trigger.Props, 'className'>) {
  return (
    <ContextMenuPrimitive.Trigger
      data-slot="context-menu-trigger"
      className="select-none"
      {...props}
    />
  );
}

function ContextMenuContent({
  align = 'start',
  alignOffset = 4,
  side = 'right',
  sideOffset = 0,
  ...props
}: Omit<ContextMenuPrimitive.Popup.Props, 'className'> &
  Pick<ContextMenuPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <ContextMenuPrimitive.Popup
          data-slot="context-menu-content"
          className="data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-36 rounded-md p-1 shadow-md ring-1 duration-100 z-50 max-h-(--available-height) origin-(--transform-origin) overflow-x-hidden overflow-y-auto outline-none"
          {...props}
        />
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  );
}

function ContextMenuGroup({ ...props }: ContextMenuPrimitive.Group.Props) {
  return <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />;
}

function ContextMenuLabel({
  inset,
  ...props
}: Omit<ContextMenuPrimitive.GroupLabel.Props, 'className'> & {
  inset?: boolean;
}) {
  return (
    <ContextMenuPrimitive.GroupLabel
      data-slot="context-menu-label"
      data-inset={inset}
      className="text-muted-foreground px-2 py-1.5 text-xs font-medium data-[inset]:pl-8"
      {...props}
    />
  );
}

function ContextMenuItem({
  inset,
  variant = 'default',
  ...props
}: Omit<ContextMenuPrimitive.Item.Props, 'className'> & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      className="focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:text-destructive focus:*:[svg]:text-accent-foreground gap-2 rounded-sm px-2 py-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 group/context-menu-item relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0"
      {...props}
    />
  );
}

function ContextMenuSub({ ...props }: ContextMenuPrimitive.SubmenuRoot.Props) {
  return <ContextMenuPrimitive.SubmenuRoot data-slot="context-menu-sub" {...props} />;
}

function ContextMenuSubTrigger({
  inset,
  children,
  ...props
}: Omit<ContextMenuPrimitive.SubmenuTrigger.Props, 'className'> & {
  inset?: boolean;
}) {
  return (
    <ContextMenuPrimitive.SubmenuTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset}
      className="focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground rounded-sm px-2 py-1.5 text-sm [&_svg:not([class*='size-'])]:size-4 flex cursor-default items-center outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0"
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </ContextMenuPrimitive.SubmenuTrigger>
  );
}

function ContextMenuSubContent({ ...props }: Omit<React.ComponentProps<typeof ContextMenuContent>, 'className'>) {
  return (
    <ContextMenuContent
      data-slot="context-menu-sub-content"
      side="right"
      {...props}
    />
  );
}

function ContextMenuCheckboxItem({
  children,
  checked,
  ...props
}: Omit<ContextMenuPrimitive.CheckboxItem.Props, 'className'>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      className="focus:bg-accent focus:text-accent-foreground gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0"
      checked={checked}
      {...props}
    >
      <span className="absolute right-2 pointer-events-none">
        <ContextMenuPrimitive.CheckboxItemIndicator>
          <CheckIcon />
        </ContextMenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

function ContextMenuRadioGroup({ ...props }: ContextMenuPrimitive.RadioGroup.Props) {
  return <ContextMenuPrimitive.RadioGroup data-slot="context-menu-radio-group" {...props} />;
}

function ContextMenuRadioItem({
  children,
  ...props
}: Omit<ContextMenuPrimitive.RadioItem.Props, 'className'>) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      className="focus:bg-accent focus:text-accent-foreground gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0"
      {...props}
    >
      <span className="absolute right-2 pointer-events-none">
        <ContextMenuPrimitive.RadioItemIndicator>
          <CheckIcon />
        </ContextMenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}

function ContextMenuSeparator({ ...props }: Omit<ContextMenuPrimitive.Separator.Props, 'className'>) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className="bg-border -mx-1 my-1 h-px"
      {...props}
    />
  );
}

function ContextMenuShortcut({ ...props }: Omit<React.ComponentProps<'span'>, 'className'>) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className="text-muted-foreground group-focus/context-menu-item:text-accent-foreground ml-auto text-xs tracking-widest"
      {...props}
    />
  );
}

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
};
