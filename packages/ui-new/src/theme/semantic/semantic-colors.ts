import { ref, token } from './helpers';
import { makeDarkPalette } from './palettes/dark-palette';
import { makeLightPalette } from './palettes/light-palette';
import { makeSecondaryPalette } from './palettes/secondary-palette';

// Semantic colors contract:
// - Recipes should use `colorPalette.solid|hover|active|subtle|muted|border|focusRing|contrast`
// - Light palettes (`yellow`, `sand`) intentionally use black text (contrast)
export const semanticColors = {
  bg: token({
    base: ref({ palette: 'secondary', shade: 50 }),
    dark: ref({ palette: 'secondary', shade: 950 }),
  }),
  fg: token({
    base: ref({ palette: 'secondary', shade: 950 }),
    dark: ref({ palette: 'secondary', shade: 50 }),
  }),
  border: token({
    base: ref({ palette: 'secondary', shade: 200 }),
    dark: ref({ palette: 'secondary', shade: 800 }),
  }),
  'border.muted': token({
    base: ref({ palette: 'secondary', shade: 100 }),
    dark: ref({ palette: 'secondary', shade: 900 }),
  }),

  primary: makeDarkPalette({ palette: 'primary', includeDefault: true }),
  secondary: makeSecondaryPalette(),
  blue: makeDarkPalette({ palette: 'blue' }),
  orange: makeDarkPalette({ palette: 'orange' }),
  rose: makeDarkPalette({ palette: 'rose' }),
  yellow: makeLightPalette({ palette: 'yellow', darkSolid: 400 }),
  sand: makeLightPalette({ palette: 'sand', darkSolid: 300, focusRingPalette: 'primary' }),
} as const;
