export const BUTTON_BASE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2',
  fontWeight: 'medium',
  transition: 'all 0.2s ease-in-out',
  cursor: 'pointer',
  borderRadius: 'input',
  // Always reserve border space to avoid layout shift between variants/focus.
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'transparent',
  outline: 'none',
  boxShadow: 'sm',
  _focusVisible: {
    borderColor: 'colorPalette.focusRing',
    boxShadow: 'focusRing',
    outline: 'none',
  },
} as const;
