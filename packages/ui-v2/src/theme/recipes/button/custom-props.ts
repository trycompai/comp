export const BUTTON_CUSTOM_PROPS = {
  isLink: {
    true: {
      bg: 'transparent',
      borderColor: 'transparent',
      boxShadow: 'none',
      px: '0',
      color: 'colorPalette.fg',
      _hover: {
        color: 'colorPalette.emphasized',
        textDecoration: 'underline',
        bg: 'transparent',
      },
      _active: {
        color: 'colorPalette.active',
        textDecoration: 'underline',
        bg: 'transparent',
      },
    },
  },
} as const;
