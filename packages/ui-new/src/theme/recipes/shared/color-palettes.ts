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

export const createColorPaletteVariants = (): Record<
  SupportedColorPalette,
  { colorPalette: SupportedColorPalette }
> => {
  return SUPPORTED_COLOR_PALETTES.reduce(
    (acc, palette) => {
      acc[palette] = { colorPalette: palette };
      return acc;
    },
    {} as Record<SupportedColorPalette, { colorPalette: SupportedColorPalette }>,
  );
};
