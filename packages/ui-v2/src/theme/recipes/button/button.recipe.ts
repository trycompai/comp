import { defineRecipe } from '@chakra-ui/react';

import {
  BUTTON_BASE,
  BUTTON_CUSTOM_PROPS,
  BUTTON_DEFAULT_VARIANTS,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
} from '.';
import { createColorPaletteVariants } from '../shared/color-palettes';

const COLOR_PALETTE_VARIANTS = createColorPaletteVariants();

export const buttonRecipe = defineRecipe({
  base: BUTTON_BASE,
  defaultVariants: BUTTON_DEFAULT_VARIANTS,
  variants: {
    size: BUTTON_SIZES,
    variant: BUTTON_VARIANTS,
    colorPalette: COLOR_PALETTE_VARIANTS,
    ...BUTTON_CUSTOM_PROPS,
  },
});
