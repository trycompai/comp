// Chakra global styles should be low-specificity and token-driven.
// `:where(...)` keeps specificity near-zero so product code can still override when needed.

const BRAND_TYPOGRAPHY = {
  lineHeight: 'brand',
  letterSpacing: 'brand',
} as const;

export const globalCss = {
  // IMPORTANT: Scope Chakra's global styles so we can migrate incrementally in apps that still
  // rely on Tailwind/shadcn global styles. Wrap migrated islands with `.chakra-scope`.
  ':where(.chakra-scope)': {
    fontFamily: 'body',
    ...BRAND_TYPOGRAPHY,
  },

  ':where(.chakra-scope h1, .chakra-scope h2, .chakra-scope h3, .chakra-scope h4, .chakra-scope h5, .chakra-scope h6)':
    {
      fontFamily: 'heading',
      ...BRAND_TYPOGRAPHY,
    },

  // Form controls don't always inherit font styles consistently across browsers.
  ':where(.chakra-scope button, .chakra-scope input, .chakra-scope textarea, .chakra-scope select)':
    {
      fontFamily: 'body',
      ...BRAND_TYPOGRAPHY,
    },
} as const;
