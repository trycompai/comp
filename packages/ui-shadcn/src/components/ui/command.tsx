'use client';

import { Command as CommandPrimitive } from 'cmdk';
import * as React from 'react';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { CheckIcon, SearchIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

const commandVariants = cva(
  'bg-popover text-popover-foreground rounded-xl p-1 flex size-full flex-col overflow-hidden',
  {
    variants: {
      width: {
        auto: '',
        sm: 'w-sm',
        md: 'w-md',
        lg: 'w-lg',
      },
    },
    defaultVariants: {
      width: 'auto',
    },
  },
);

interface CommandProps
  extends Omit<React.ComponentProps<typeof CommandPrimitive>, 'className'>,
    VariantProps<typeof commandVariants> {}

function Command({ width, ...props }: CommandProps) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={commandVariants({ width })}
      {...props}
    />
  );
}

function CommandDialog({
  title = 'Command Palette',
  description = 'Search for a command to run...',
  children,
  ...props
}: Omit<DialogPrimitive.Root.Props, 'children'> & {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root data-slot="dialog" {...props}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          data-slot="dialog-overlay"
          className="data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 isolate z-50"
        />
        <DialogPrimitive.Popup
          data-slot="command-dialog-content"
          className="data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 bg-background ring-foreground/10 rounded-xl p-0 ring-1 duration-100 sm:max-w-lg group/dialog-content fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden outline-none"
        >
          <div
            data-slot="dialog-header"
            className="sr-only flex flex-col gap-1.5 text-center sm:text-left"
          >
            <DialogPrimitive.Title data-slot="dialog-title" className="text-lg font-medium">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description
              data-slot="dialog-description"
              className="text-muted-foreground text-sm text-balance md:text-pretty"
            >
              {description}
            </DialogPrimitive.Description>
          </div>
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function CommandInput({
  ...props
}: Omit<React.ComponentProps<typeof CommandPrimitive.Input>, 'className'>) {
  return (
    <div data-slot="command-input-wrapper" className="p-1 pb-0">
      <div
        data-slot="input-group"
        role="group"
        className="border-input/30 bg-input/30 h-8 rounded-lg border shadow-none transition-[color,box-shadow] has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot=input-group-control]:focus-visible]:ring-[3px] group/input-group relative flex w-full min-w-0 items-center outline-none"
      >
        <CommandPrimitive.Input
          data-slot="command-input"
          className="w-full flex-1 bg-transparent px-2.5 py-1 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />
        <div
          data-slot="input-group-addon"
          data-align="inline-end"
          className="text-muted-foreground flex h-auto cursor-text items-center justify-center gap-2 pr-2 text-sm font-medium select-none"
        >
          <SearchIcon className="size-4 shrink-0 opacity-50" />
        </div>
      </div>
    </div>
  );
}

function CommandList({
  ...props
}: Omit<React.ComponentProps<typeof CommandPrimitive.List>, 'className'>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className="no-scrollbar max-h-72 scroll-py-1 outline-none overflow-x-hidden overflow-y-auto"
      {...props}
    />
  );
}

function CommandEmpty({
  ...props
}: Omit<React.ComponentProps<typeof CommandPrimitive.Empty>, 'className'>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="py-6 text-center text-sm"
      {...props}
    />
  );
}

function CommandGroup({
  ...props
}: Omit<React.ComponentProps<typeof CommandPrimitive.Group>, 'className'>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className="text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium"
      {...props}
    />
  );
}

function CommandSeparator({
  ...props
}: Omit<React.ComponentProps<typeof CommandPrimitive.Separator>, 'className'>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className="bg-border -mx-1 h-px w-auto"
      {...props}
    />
  );
}

function CommandItem({
  children,
  ...props
}: Omit<React.ComponentProps<typeof CommandPrimitive.Item>, 'className'>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className="data-[selected=true]:bg-muted data-[selected=true]:text-foreground data-[selected=true]:**:[svg]:text-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none [&_svg:not([class*='size-'])]:size-4 [[data-slot=dialog-content]_&]:rounded-lg group/command-item data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0"
      {...props}
    >
      {children}
      <CheckIcon className="ml-auto opacity-0 group-has-[[data-slot=command-shortcut]]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
    </CommandPrimitive.Item>
  );
}

function CommandShortcut({ ...props }: Omit<React.ComponentProps<'span'>, 'className'>) {
  return (
    <span
      data-slot="command-shortcut"
      className="text-muted-foreground group-data-[selected=true]/command-item:text-foreground ml-auto text-xs tracking-widest"
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};
