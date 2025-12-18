export const radii = {
  // Single source of truth for rounding across the entire design system.
  // Change these values once and all components update.
  xs: { value: '2px' },
  sm: { value: '4px' },
  md: { value: '8px' },
  lg: { value: '12px' },
  xl: { value: '16px' },
  full: { value: '9999px' },

  // Semantic radii: use these in recipes/components instead of raw size keys.
  // This is how we ensure future components stay consistent.
  input: { value: '{radii.md}' }, // buttons, inputs, selects, etc.
  card: { value: '{radii.lg}' }, // cards, panels, popovers, etc.
} as const;
