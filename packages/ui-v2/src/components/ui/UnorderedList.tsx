'use client';

import type { ListRootProps } from '@chakra-ui/react';
import { List } from '@chakra-ui/react';
import * as React from 'react';

export type UnorderedListTone = 'default' | 'muted';
export type UnorderedListSize = 'sm' | 'md';
export type UnorderedListDensity = 'default' | 'compact';

export type UnorderedListProps = Omit<ListRootProps, 'as' | 'listStyleType'> & {
  density?: UnorderedListDensity;
  size?: UnorderedListSize;
  tone?: UnorderedListTone;
};

const densityStyles: Record<UnorderedListDensity, Pick<ListRootProps, 'gap' | 'ps'>> = {
  default: { gap: '3', ps: '4' },
  compact: { gap: '2', ps: '4' },
};

const sizeStyles: Record<UnorderedListSize, Pick<ListRootProps, 'fontSize'>> = {
  sm: { fontSize: 'sm' },
  md: { fontSize: 'md' },
};

const toneStyles: Record<UnorderedListTone, Pick<ListRootProps, 'color'>> = {
  default: { color: 'fg' },
  muted: { color: 'fg.muted' },
};

const UnorderedListRoot = React.forwardRef<React.ElementRef<typeof List.Root>, UnorderedListProps>(
  function UnorderedListRoot(
    { density = 'default', size = 'sm', tone = 'default', ...props },
    ref,
  ) {
    return (
      <List.Root
        ref={ref}
        as="ul"
        listStyleType="disc"
        display="flex"
        flexDirection="column"
        {...toneStyles[tone]}
        {...sizeStyles[size]}
        {...densityStyles[density]}
        {...props}
      />
    );
  },
);

export const UnorderedList = Object.assign(UnorderedListRoot, {
  Item: List.Item,
});
