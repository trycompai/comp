'use client';

import type { ButtonProps as ChakraButtonProps, ConditionalValue } from '@chakra-ui/react';
import { Button as ChakraButton } from '@chakra-ui/react';
import * as React from 'react';

import type { SupportedColorPalette } from '../../theme/colors/palettes';

export type ButtonProps = Omit<ChakraButtonProps, 'colorPalette' | 'isLink'> & {
  /**
   * Restrict `colorPalette` to our design-system palettes so autocomplete is correct.
   */
  colorPalette?: ConditionalValue<SupportedColorPalette>;
  isLink?: ConditionalValue<boolean>;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  return <ChakraButton ref={ref} {...(props as ChakraButtonProps)} />;
});
