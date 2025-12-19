'use client';

import type {
  HeadingProps as ChakraHeadingProps,
  TextProps as ChakraTextProps,
} from '@chakra-ui/react';
import { Heading as ChakraHeading, Text as ChakraText } from '@chakra-ui/react';
import * as React from 'react';

type TextTone = 'default' | 'muted' | 'secondary';

const toneToColor: Record<TextTone, ChakraTextProps['color']> = {
  default: 'fg',
  muted: 'fg.muted',
  secondary: 'fg.muted',
};

type BaseTextProps = Omit<ChakraTextProps, 'color'> & {
  tone?: TextTone;
};

export type BodyTextProps = BaseTextProps;
type ChakraTextRef = React.ElementRef<typeof ChakraText>;
type ChakraHeadingRef = React.ElementRef<typeof ChakraHeading>;

export const BodyText = React.forwardRef<ChakraTextRef, BodyTextProps>(function BodyText(
  { tone = 'default', ...props },
  ref,
) {
  return <ChakraText ref={ref} color={toneToColor[tone]} {...props} />;
});

export type InlineTextProps = BaseTextProps;
export const InlineText = React.forwardRef<ChakraTextRef, InlineTextProps>(function InlineText(
  { tone = 'default', ...props },
  ref,
) {
  return <ChakraText ref={ref} as="span" color={toneToColor[tone]} {...props} />;
});

export type CaptionTextProps = BaseTextProps;
export const CaptionText = React.forwardRef<ChakraTextRef, CaptionTextProps>(function CaptionText(
  { tone = 'muted', ...props },
  ref,
) {
  return <ChakraText ref={ref} fontSize="xs" color={toneToColor[tone]} {...props} />;
});

export type LabelTextProps = BaseTextProps;
export const LabelText = React.forwardRef<ChakraTextRef, LabelTextProps>(function LabelText(
  { tone = 'default', ...props },
  ref,
) {
  return (
    <ChakraText ref={ref} fontSize="sm" fontWeight="medium" color={toneToColor[tone]} {...props} />
  );
});

export type H1Props = Omit<ChakraHeadingProps, 'as' | 'size'>;
export const H1 = React.forwardRef<ChakraHeadingRef, H1Props>(function H1(props, ref) {
  return <ChakraHeading ref={ref} as="h1" size="xl" {...props} />;
});

export type H2Props = Omit<ChakraHeadingProps, 'as' | 'size'>;
export const H2 = React.forwardRef<ChakraHeadingRef, H2Props>(function H2(props, ref) {
  return <ChakraHeading ref={ref} as="h2" size="lg" {...props} />;
});

export type H3Props = Omit<ChakraHeadingProps, 'as' | 'size'>;
export const H3 = React.forwardRef<ChakraHeadingRef, H3Props>(function H3(props, ref) {
  return <ChakraHeading ref={ref} as="h3" size="md" {...props} />;
});

export type H4Props = Omit<ChakraHeadingProps, 'as' | 'size'>;
export const H4 = React.forwardRef<ChakraHeadingRef, H4Props>(function H4(props, ref) {
  return <ChakraHeading ref={ref} as="h4" size="sm" {...props} />;
});

export type H5Props = Omit<ChakraHeadingProps, 'as' | 'size'>;
export const H5 = React.forwardRef<ChakraHeadingRef, H5Props>(function H5(props, ref) {
  return <ChakraHeading ref={ref} as="h5" size="xs" {...props} />;
});

export type H6Props = Omit<ChakraHeadingProps, 'as' | 'size'>;
export const H6 = React.forwardRef<ChakraHeadingRef, H6Props>(function H6(props, ref) {
  return <ChakraHeading ref={ref} as="h6" size="xs" {...props} />;
});
