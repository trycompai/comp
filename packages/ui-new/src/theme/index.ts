import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';
import { colors } from './colors';
import { globalCss } from './global-css';
import { buttonRecipe } from './recipes';
import { semanticColors } from './semantic-tokens';
import { borders, fonts, fontWeights, letterSpacings, lineHeights, radii, shadows } from './tokens';

const config = defineConfig({
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
  },
});

const system = createSystem(defaultConfig, config);

export { system };
