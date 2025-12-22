import { ref, token } from '../helpers';
import type { PaletteSemantics } from '../types';

export const makeDarkPalette = ({
  palette,
  includeDefault,
}: {
  palette: string;
  includeDefault?: boolean;
}): PaletteSemantics => {
  const out: PaletteSemantics = {
    solid: token({ base: ref({ palette, shade: 700 }), dark: ref({ palette, shade: 400 }) }),
    emphasized: token({ base: ref({ palette, shade: 800 }), dark: ref({ palette, shade: 500 }) }),
    hover: token({ base: ref({ palette, shade: 800 }), dark: ref({ palette, shade: 500 }) }),
    active: token({ base: ref({ palette, shade: 900 }), dark: ref({ palette, shade: 600 }) }),
    subtle: token({ base: ref({ palette, shade: 50 }), dark: ref({ palette, shade: 900 }) }),
    muted: token({ base: ref({ palette, shade: 100 }), dark: ref({ palette, shade: 800 }) }),
    fg: token({ base: ref({ palette, shade: 700 }), dark: ref({ palette, shade: 300 }) }),
    contrast: token({ base: 'white', dark: 'black' }),
    border: token({ base: ref({ palette, shade: 300 }), dark: ref({ palette, shade: 700 }) }),
    focusRing: token({ base: ref({ palette, shade: 700 }), dark: ref({ palette, shade: 400 }) }),
  };

  if (includeDefault) {
    out.DEFAULT = token({ base: ref({ palette, shade: 700 }), dark: ref({ palette, shade: 400 }) });
  }

  return out;
};
