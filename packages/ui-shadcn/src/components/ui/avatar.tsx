'use client';

import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import * as React from 'react';

type AvatarSize = 'xs' | 'sm' | 'default' | 'lg' | 'xl';

function Avatar({
  size = 'default',
  ...props
}: Omit<AvatarPrimitive.Root.Props, 'className'> & {
  size?: AvatarSize;
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className="size-8 rounded-full after:rounded-full data-[size=xs]:size-5 data-[size=sm]:size-6 data-[size=lg]:size-10 data-[size=xl]:size-14 after:border-border group/avatar relative flex shrink-0 select-none after:absolute after:inset-0 after:border after:mix-blend-darken dark:after:mix-blend-lighten"
      {...props}
    />
  );
}

function AvatarImage({ ...props }: Omit<AvatarPrimitive.Image.Props, 'className'>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className="rounded-full aspect-square size-full object-cover"
      {...props}
    />
  );
}

function AvatarFallback({ ...props }: Omit<AvatarPrimitive.Fallback.Props, 'className'>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className="bg-muted text-muted-foreground rounded-full flex size-full items-center justify-center text-xs group-data-[size=xs]/avatar:text-[8px] group-data-[size=sm]/avatar:text-[10px] group-data-[size=lg]/avatar:text-sm group-data-[size=xl]/avatar:text-base"
      {...props}
    />
  );
}

function AvatarBadge({ ...props }: Omit<React.ComponentProps<'span'>, 'className'>) {
  return (
    <span
      data-slot="avatar-badge"
      className="bg-primary text-primary-foreground ring-background absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-blend-color ring-2 select-none group-data-[size=xs]/avatar:size-1.5 group-data-[size=xs]/avatar:[&>svg]:hidden group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2 group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2 group-data-[size=xl]/avatar:size-3.5 group-data-[size=xl]/avatar:[&>svg]:size-2.5"
      {...props}
    />
  );
}

function AvatarGroup({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="avatar-group"
      className="*:data-[slot=avatar]:ring-background group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2"
      {...props}
    />
  );
}

function AvatarGroupCount({ ...props }: Omit<React.ComponentProps<'div'>, 'className'>) {
  return (
    <div
      data-slot="avatar-group-count"
      className="bg-muted text-muted-foreground size-8 rounded-full text-sm group-has-data-[size=xs]/avatar-group:size-5 group-has-data-[size=xs]/avatar-group:text-[10px] group-has-data-[size=sm]/avatar-group:size-6 group-has-data-[size=sm]/avatar-group:text-xs group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=lg]/avatar-group:text-base group-has-data-[size=xl]/avatar-group:size-14 group-has-data-[size=xl]/avatar-group:text-lg ring-background relative flex shrink-0 items-center justify-center ring-2"
      {...props}
    />
  );
}

export { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage };
