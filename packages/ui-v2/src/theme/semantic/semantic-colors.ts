import { ref, token } from './helpers';
import { makeDarkPalette } from './palettes/dark-palette';
import { makeLightPalette } from './palettes/light-palette';
import { makeSecondaryPalette } from './palettes/secondary-palette';

// Semantic colors contract:
// - Recipes should use `colorPalette.solid|hover|active|subtle|muted|border|focusRing|contrast`
// - Light palettes (`yellow`, `sand`) intentionally use black text (contrast)
export const semanticColors = {
  // IMPORTANT:
  // Chakra's built-in component recipes commonly reference nested semantic tokens
  // like `bg.panel` and `fg.muted`. If we overwrite `bg`/`fg` with a single token,
  // those nested keys become undefined and components can appear "transparent".
  bg: {
    DEFAULT: token({
      base: ref({ palette: 'secondary', shade: 50 }),
      dark: ref({ palette: 'secondary', shade: 950 }),
    }),
    panel: token({
      base: ref({ palette: 'secondary', shade: 50 }),
      dark: ref({ palette: 'secondary', shade: 900 }),
    }),
    subtle: token({
      base: ref({ palette: 'secondary', shade: 100 }),
      dark: ref({ palette: 'secondary', shade: 900 }),
    }),
    muted: token({
      base: ref({ palette: 'secondary', shade: 200 }),
      dark: ref({ palette: 'secondary', shade: 800 }),
    }),
  },
  fg: {
    DEFAULT: token({
      base: ref({ palette: 'secondary', shade: 950 }),
      dark: ref({ palette: 'secondary', shade: 50 }),
    }),
    muted: token({
      base: ref({ palette: 'secondary', shade: 700 }),
      dark: ref({ palette: 'secondary', shade: 300 }),
    }),
  },
  border: {
    DEFAULT: token({
      base: ref({ palette: 'secondary', shade: 200 }),
      dark: ref({ palette: 'secondary', shade: 800 }),
    }),
    muted: token({
      base: ref({ palette: 'secondary', shade: 100 }),
      dark: ref({ palette: 'secondary', shade: 900 }),
    }),
  },

  primary: makeDarkPalette({ palette: 'primary', includeDefault: true }),
  secondary: makeSecondaryPalette(),
  blue: makeDarkPalette({ palette: 'blue' }),
  orange: makeDarkPalette({ palette: 'orange' }),
  rose: makeDarkPalette({ palette: 'rose' }),
  yellow: makeLightPalette({ palette: 'yellow', darkSolid: 400 }),
  sand: makeLightPalette({ palette: 'sand', darkSolid: 300, focusRingPalette: 'primary' }),
} as const;
