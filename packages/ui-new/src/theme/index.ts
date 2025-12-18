import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';
import { colors } from './colors';
import { buttonRecipe } from './recipes';
import { semanticColors } from './semantic-tokens';
import { borders, radii, shadows } from './tokens';

const config = defineConfig({
  theme: {
    tokens: {
      colors,
      radii,
      borders,
      shadows,
    },
    semanticTokens: {
      colors: {
        ...semanticColors,
      },
    },
    recipes: {
      button: buttonRecipe,
    },
  },
});

const system = createSystem(defaultConfig, config);

export { system };
