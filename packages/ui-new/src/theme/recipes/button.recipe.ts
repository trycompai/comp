import { defineRecipe } from '@chakra-ui/react';

export const buttonRecipe = defineRecipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2',
    fontWeight: 'medium',
    transition: 'all 0.2s ease-in-out',
    cursor: 'pointer',
    borderRadius: 'input',
    border: 'none',
    outline: 'none',
    boxShadow: 'sm',
    _focusVisible: {
      borderColor: 'colorPalette.focusRing',
      boxShadow: 'focusRing',
      outline: 'none',
      border: 'none',
    },
  },
  defaultVariants: {
    variant: 'solid',
    size: 'sm',
    colorPalette: 'primary',
  },
  variants: {
    size: {
      xs: { padding: '2', fontSize: '10px' },
      sm: { padding: '4', fontSize: '12px' },
      md: { padding: '6', fontSize: '14px' },
      lg: { padding: '8', fontSize: '16px' },
      xl: { padding: '10', fontSize: '18px' },
      '2xl': { padding: '12', fontSize: '20px' },
      '3xl': { padding: '14', fontSize: '22px' },
      '4xl': { padding: '16', fontSize: '24px' },
      '5xl': { padding: '18', fontSize: '26px' },
      '6xl': { padding: '20', fontSize: '28px' },
      '7xl': { padding: '22', fontSize: '30px' },
    },
    variant: {
      solid: {
        bg: 'colorPalette.solid',
        color: 'colorPalette.contrast',
        _hover: { bg: 'colorPalette.hover' },
        _active: { bg: 'colorPalette.active' },
      },
      outline: {
        border: 'subtle',
        borderColor: 'colorPalette.border',
        color: 'colorPalette.fg',
        _hover: { bg: 'colorPalette.subtle' },
      },
    },
    colorPalette: {
      primary: { colorPalette: 'primary' },
      secondary: { colorPalette: 'secondary' },
      blue: { colorPalette: 'blue' },
      orange: { colorPalette: 'orange' },
      rose: { colorPalette: 'rose' },
      yellow: { colorPalette: 'yellow' },
      sand: { colorPalette: 'sand' },
    },
  },
});
