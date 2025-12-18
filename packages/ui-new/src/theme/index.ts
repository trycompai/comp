import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';
import { colors } from './colors';
import { globalCss } from './global-css';
import { alertSlotRecipe, buttonRecipe } from './recipes';
import { semanticColors } from './semantic-tokens';
import { borders, fonts, fontWeights, letterSpacings, lineHeights, radii, shadows } from './tokens';

const config = defineConfig({
  preflight: true,
  globalCss,
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
      alert: alertSlotRecipe,
    },
  },
});

const system = createSystem(defaultConfig, config);

export { system };
