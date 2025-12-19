import { SUPPORTED_COLOR_PALETTES, type SupportedColorPalette } from '../../colors/palettes';

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
