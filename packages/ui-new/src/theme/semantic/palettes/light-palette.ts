import { ref, token } from '../helpers';
import type { PaletteSemantics, Shade } from '../types';

export const makeLightPalette = ({
  palette,
  darkSolid,
  focusRingPalette = palette,
}: {
  palette: 'yellow' | 'sand';
  // In dark mode, these palettes are still relatively light; pick a stable solid shade.
  darkSolid: Shade;
  focusRingPalette?: string;
}): PaletteSemantics => {
  return {
    solid: token({ base: ref({ palette, shade: 500 }), dark: ref({ palette, shade: darkSolid }) }),
    emphasized: token({
      base: ref({ palette, shade: 600 }),
      dark: ref({ palette, shade: (darkSolid + 100) as Shade }),
    }),
    hover: token({
      base: ref({ palette, shade: 600 }),
      dark: ref({ palette, shade: (darkSolid + 100) as Shade }),
    }),
    active: token({
      base: ref({ palette, shade: 700 }),
      dark: ref({ palette, shade: (darkSolid + 200) as Shade }),
    }),
    subtle: token({ base: ref({ palette, shade: 50 }), dark: ref({ palette, shade: 900 }) }),
    muted: token({ base: ref({ palette, shade: 100 }), dark: ref({ palette, shade: 800 }) }),
    fg: token({
      base: ref({ palette, shade: palette === 'yellow' ? 800 : 900 }),
      dark: ref({ palette, shade: palette === 'yellow' ? 300 : 100 }),
    }),
    // Light palettes use black text by design (contrast).
    contrast: token({ base: 'black', dark: 'black' }),
    border: token({ base: ref({ palette, shade: 300 }), dark: ref({ palette, shade: 700 }) }),
    focusRing: token({
      base: ref({ palette: focusRingPalette, shade: 700 }),
      dark: ref({ palette: focusRingPalette, shade: 400 }),
    }),
  };
};
