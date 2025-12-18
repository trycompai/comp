export const SUPPORTED_COLOR_PALETTES = [
  'primary',
  'secondary',
  'blue',
  'orange',
  'rose',
  'yellow',
  'sand',
] as const;

export type SupportedColorPalette = (typeof SUPPORTED_COLOR_PALETTES)[number];
