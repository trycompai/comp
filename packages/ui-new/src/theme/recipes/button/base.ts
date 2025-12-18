export const BUTTON_BASE = {
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
} as const;
