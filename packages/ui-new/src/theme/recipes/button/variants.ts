const SOLID_INTERACTIONS = {
  _hover: { bg: 'colorPalette.hover' },
  _active: { bg: 'colorPalette.active' },
} as const;

const OUTLINE_INTERACTIONS = {
  _hover: {
    bg: 'colorPalette.solid',
    color: 'colorPalette.contrast',
    borderColor: 'colorPalette.solid',
  },
  _active: {
    bg: 'colorPalette.hover',
    color: 'colorPalette.contrast',
    borderColor: 'colorPalette.hover',
  },
} as const;

const GHOST_INTERACTIONS = {
  _hover: { bg: 'colorPalette.solid', color: 'colorPalette.contrast' },
  _active: { bg: 'colorPalette.hover', color: 'colorPalette.contrast' },
} as const;

const PLAIN_INTERACTIONS = {
  _hover: { color: 'colorPalette.emphasized' },
  _active: { color: 'colorPalette.active' },
} as const;

const LINK_INTERACTIONS = {
  _hover: { color: 'colorPalette.emphasized', textDecoration: 'underline' },
  _active: { color: 'colorPalette.active', textDecoration: 'underline' },
} as const;

export const BUTTON_VARIANTS = {
  solid: {
    bg: 'colorPalette.solid',
    color: 'colorPalette.contrast',
    borderColor: 'transparent',
    ...SOLID_INTERACTIONS,
  },
  outline: {
    borderColor: 'colorPalette.fg',
    color: 'colorPalette.fg',
    bg: 'transparent',
    ...OUTLINE_INTERACTIONS,
  },
  ghost: {
    bg: 'transparent',
    borderColor: 'transparent',
    color: 'colorPalette.fg',
    boxShadow: 'none',
    ...GHOST_INTERACTIONS,
  },
  plain: {
    bg: 'transparent',
    borderColor: 'transparent',
    color: 'colorPalette.fg',
    boxShadow: 'none',
    ...PLAIN_INTERACTIONS,
  },
  link: {
    bg: 'transparent',
    borderColor: 'transparent',
    color: 'colorPalette.fg',
    boxShadow: 'none',
    px: '0',
    ...LINK_INTERACTIONS,
  },
} as const;
