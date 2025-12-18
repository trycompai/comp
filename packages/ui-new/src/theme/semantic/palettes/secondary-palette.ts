import { ref, token } from '../helpers';
import type { PaletteSemantics } from '../types';

export const makeSecondaryPalette = (): PaletteSemantics => {
  // Neutral palette behavior tuned for UI surfaces.
  return {
    DEFAULT: token({
      base: ref({ palette: 'secondary', shade: 100 }),
      dark: ref({ palette: 'secondary', shade: 800 }),
    }),
    solid: token({
      base: ref({ palette: 'secondary', shade: 800 }),
      dark: ref({ palette: 'secondary', shade: 200 }),
    }),
    emphasized: token({
      base: ref({ palette: 'secondary', shade: 900 }),
      dark: ref({ palette: 'secondary', shade: 300 }),
    }),
    hover: token({
      base: ref({ palette: 'secondary', shade: 900 }),
      dark: ref({ palette: 'secondary', shade: 300 }),
    }),
    active: token({
      base: ref({ palette: 'secondary', shade: 950 }),
      dark: ref({ palette: 'secondary', shade: 400 }),
    }),
    subtle: token({
      base: ref({ palette: 'secondary', shade: 50 }),
      dark: ref({ palette: 'secondary', shade: 900 }),
    }),
    muted: token({
      base: ref({ palette: 'secondary', shade: 100 }),
      dark: ref({ palette: 'secondary', shade: 800 }),
    }),
    fg: token({
      base: ref({ palette: 'secondary', shade: 900 }),
      dark: ref({ palette: 'secondary', shade: 100 }),
    }),
    contrast: token({ base: 'white', dark: 'black' }),
    border: token({
      base: ref({ palette: 'secondary', shade: 300 }),
      dark: ref({ palette: 'secondary', shade: 700 }),
    }),
    // Use primary for focus ring for consistent product affordance.
    focusRing: token({
      base: ref({ palette: 'primary', shade: 700 }),
      dark: ref({ palette: 'primary', shade: 400 }),
    }),
  };
};
