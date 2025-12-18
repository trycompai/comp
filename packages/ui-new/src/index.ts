// Provider and theme
export {
  ColorModeButton,
  ColorModeIcon,
  ColorModeProvider,
  DarkMode,
  LightMode,
  useColorMode,
  useColorModeValue,
  type ColorMode,
  type ColorModeProviderProps,
  type UseColorModeReturn,
} from './components/ui/color-mode';
export { Provider } from './components/ui/provider';
export { system } from './theme';

// Components
export { Button, type ButtonProps } from './components/ui/button';
export { Toaster, toaster } from './components/ui/toaster';
export { Tooltip, type TooltipProps } from './components/ui/tooltip';
export { SUPPORTED_COLOR_PALETTES, type SupportedColorPalette } from './theme/colors/palettes';

// Re-export Chakra UI components for convenience
export * from '@chakra-ui/react';
