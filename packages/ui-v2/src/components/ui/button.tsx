'use client';

import type { ButtonProps as ChakraButtonProps, ConditionalValue } from '@chakra-ui/react';
import { Button as ChakraButton } from '@chakra-ui/react';
import * as React from 'react';

export type ButtonProps = Omit<ChakraButtonProps, 'isLink'> & {
  isLink?: ConditionalValue<boolean>;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  return <ChakraButton ref={ref} {...(props as ChakraButtonProps)} />;
});
