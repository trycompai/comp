export const ALERT_VARIANTS = {
  // Remap Chakra statuses to our design-system palettes.
  status: {
    info: {
      root: { colorPalette: 'blue' },
    },
    warning: {
      root: { colorPalette: 'yellow' },
    },
    success: {
      root: { colorPalette: 'primary' },
    },
    error: {
      root: { colorPalette: 'rose' },
    },
    neutral: {
      root: { colorPalette: 'secondary' },
    },
  },
  inline: {
    true: {
      content: {
        display: 'inline-flex',
        flexDirection: 'row',
        alignItems: 'center',
      },
    },
    false: {
      content: {
        display: 'flex',
        flexDirection: 'column',
      },
    },
  },
  variant: {
    subtle: {
      root: {
        bg: 'colorPalette.subtle',
        color: 'colorPalette.fg',
      },
    },
    surface: {
      root: {
        bg: 'colorPalette.subtle',
        color: 'colorPalette.fg',
        shadow: 'inset 0 0 0px 1px var(--shadow-color)',
        shadowColor: 'colorPalette.muted',
      },
      indicator: {
        color: 'colorPalette.fg',
      },
    },
    outline: {
      root: {
        color: 'colorPalette.fg',
        shadow: 'inset 0 0 0px 1px var(--shadow-color)',
        '--outline-shadow-legacy': 'colors.colorPalette.muted',
        '--outline-shadow': 'colors.colorPalette.border',
        shadowColor: 'var(--outline-shadow, var(--outline-shadow-legacy))',
      },
      indicator: {
        color: 'colorPalette.fg',
      },
    },
    solid: {
      root: {
        bg: 'colorPalette.solid',
        color: 'colorPalette.contrast',
      },
      indicator: {
        color: 'colorPalette.contrast',
      },
      description: {
        color: 'colorPalette.contrast',
      },
    },
  },
  size: {
    sm: {
      root: {
        gap: '2',
        px: '3',
        py: '3',
        textStyle: 'xs',
      },
      indicator: {
        textStyle: 'lg',
      },
    },
    md: {
      root: {
        gap: '3',
        px: '4',
        py: '4',
        textStyle: 'sm',
      },
      indicator: {
        textStyle: 'xl',
      },
    },
    lg: {
      root: {
        gap: '3',
        px: '4',
        py: '4',
        textStyle: 'md',
      },
      indicator: {
        textStyle: '2xl',
      },
    },
  },
} as const;
