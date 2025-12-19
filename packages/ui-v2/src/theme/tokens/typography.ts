export const fonts = {
  // Geist Sans is the brand typeface. We rely on the host app to load it and set
  // `--font-geist-sans` via next/font (apps/portal and apps/app).
  heading: {
    value:
      "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  body: {
    value:
      "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  mono: {
    value:
      "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
} as const;

export const fontWeights = {
  // Guidelines:
  // - regular + medium for most UI
  // - semibold for emphasis / key callouts
  regular: { value: '400' },
  medium: { value: '500' },
  semibold: { value: '600' },
} as const;

export const lineHeights = {
  // 125% line height per guidelines
  brand: { value: '1.25' },
} as const;

export const letterSpacings = {
  // -1% letter spacing per guidelines
  brand: { value: '-0.01em' },
} as const;
