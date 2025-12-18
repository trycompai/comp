const SOLID_INTERACTIONS = {
  _hover: { bg: 'colorPalette.hover' },
  _active: { bg: 'colorPalette.active' },
} as const;

const OUTLINE_INTERACTIONS = {
  _hover: { bg: 'colorPalette.subtle' },
} as const;

export const BUTTON_VARIANTS = {
  solid: {
    bg: 'colorPalette.solid',
    color: 'colorPalette.contrast',
    ...SOLID_INTERACTIONS,
  },
  outline: {
    border: 'subtle',
    borderColor: 'colorPalette.border',
    color: 'colorPalette.fg',
    ...OUTLINE_INTERACTIONS,
  },
} as const;
