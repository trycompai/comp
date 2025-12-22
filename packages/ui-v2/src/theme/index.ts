import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';
import { colors } from './colors';
import { globalCss } from './global-css';
import { accordionSlotRecipe } from './recipes/accordion';
import { alertSlotRecipe } from './recipes/alert';
import { buttonRecipe } from './recipes/button';
import { semanticColors } from './semantic-tokens';
import { borders, fonts, fontWeights, letterSpacings, lineHeights, radii, shadows } from './tokens';

const config = defineConfig({
  globalCss,
  strictTokens: true,
  theme: {
    tokens: {
      colors,
      fonts,
      fontWeights,
      letterSpacings,
      lineHeights,
      radii,
      borders,
      shadows,
    },
    semanticTokens: {
      colors: semanticColors,
    },
    recipes: {
      button: buttonRecipe,
    },
    slotRecipes: {
      accordion: accordionSlotRecipe,
      alert: alertSlotRecipe,
    },
  },
});

const system = createSystem(defaultConfig, config);

export { system };
