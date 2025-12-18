// Chakra global styles should be low-specificity and token-driven.
// `:where(...)` keeps specificity near-zero so product code can still override when needed.

const BRAND_TYPOGRAPHY = {
  lineHeight: 'brand',
  letterSpacing: 'brand',
} as const;

export const globalCss = {
  // Ensure Geist Sans is the default everywhere (Chakra components inherit from document).
  ':where(html, body)': {
    fontFamily: 'body',
    ...BRAND_TYPOGRAPHY,
  },

  // Headings should use the heading face (still Geist Sans, but separate token for future).
  ':where(h1, h2, h3, h4, h5, h6)': {
    fontFamily: 'heading',
    ...BRAND_TYPOGRAPHY,
  },

  // Form controls don't always inherit font styles consistently across browsers.
  ':where(button, input, textarea, select)': {
    fontFamily: 'body',
    ...BRAND_TYPOGRAPHY,
  },
} as const;
