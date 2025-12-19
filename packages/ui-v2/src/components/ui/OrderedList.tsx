'use client';

import type { ListRootProps } from '@chakra-ui/react';
import { List } from '@chakra-ui/react';
import * as React from 'react';

export type OrderedListTone = 'default' | 'muted';
export type OrderedListSize = 'sm' | 'md';
export type OrderedListDensity = 'default' | 'compact';

export type OrderedListProps = Omit<ListRootProps, 'as' | 'listStyleType'> & {
  /** Visual rhythm + padding for most page content. */
  density?: OrderedListDensity;
  /** Font sizing preset (matches common page text). */
  size?: OrderedListSize;
  /** Affects marker/text color using semantic tokens. */
  tone?: OrderedListTone;
};

const densityStyles: Record<OrderedListDensity, Pick<ListRootProps, 'gap' | 'ps'>> = {
  default: { gap: '3', ps: '4' },
  compact: { gap: '2', ps: '4' },
};

const sizeStyles: Record<OrderedListSize, Pick<ListRootProps, 'fontSize'>> = {
  sm: { fontSize: 'sm' },
  md: { fontSize: 'md' },
};

const toneStyles: Record<OrderedListTone, Pick<ListRootProps, 'color'>> = {
  default: { color: 'fg' },
  muted: { color: 'fg.muted' },
};

const OrderedListRoot = React.forwardRef<React.ElementRef<typeof List.Root>, OrderedListProps>(
  function OrderedListRoot(
    { density = 'default', size = 'sm', tone = 'default', css, ...props },
    ref,
  ) {
    return (
      <List.Root
        ref={ref}
        as="ol"
        listStyleType="decimal"
        display="flex"
        flexDirection="column"
        // Ensure ordered list numbers are always readable (some list recipes style markers as muted).
        css={{
          '& > li::marker': { color: 'fg' },
          ...(css ?? {}),
        }}
        {...toneStyles[tone]}
        {...sizeStyles[size]}
        {...densityStyles[density]}
        {...props}
      />
    );
  },
);

type OrderedListItemProps = React.ComponentPropsWithoutRef<typeof List.Item>;
const OrderedListItem = React.forwardRef<React.ElementRef<typeof List.Item>, OrderedListItemProps>(
  function OrderedListItem(props, ref) {
    return <List.Item ref={ref} {...props} />;
  },
);

export const OrderedList = Object.assign(OrderedListRoot, {
  Item: OrderedListItem,
});
