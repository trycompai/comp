### UI‑New Agent Guide

This package is our Chakra v3 design system (`@trycompai/ui-v2`). The goal is **one source of truth** for design decisions (colors, typography, radii, borders, focus rings) so changing a token updates the entire system.

### Golden rules

- **No hardcoded styling in recipes** if a token exists.
  - Use **tokens** (`radii`, `borders`, `shadows`, `fonts`, …) and **semantic tokens** (`colorPalette.*`, `bg/fg/border`) instead of raw values.
- **Never use `chakra('...')` factories** (example: `chakra('ol')`).
  - This creates ad-hoc components and bypasses our “single source of truth” approach.
  - Use one of these instead:
    - `Box`/`Text`/etc with `as="ol" | "ul" | ...` and Chakra props
    - Chakra components (e.g. `List` where applicable)
    - A small colocated component if the pattern is reused (e.g. `DeviceAgentOrderedList`)
- **Prefer pre-made components first (Chakra docs + our library)**
  - Before building custom markup, first check what Chakra already provides and its supported props/parts.
  - Use MCP/web docs to confirm the intended API surface (especially for v3 namespaces like `Menu.*`, `Select.*`, `Avatar.*`).
  - If Chakra doesn’t provide what we need, then look for existing custom components/wrappers in this library.
  - Only create new components/wrappers when there’s no clean existing option.
- **Semantic tokens define behavior**, recipes only consume behavior.
  - Example: recipes use `colorPalette.solid/hover/active/contrast` instead of `primary.700`.
- **DRY through factories + shared helpers**
  - Shared logic lives in `theme/semantic/` and `theme/recipes/shared/`.
- **Colocate config with the recipe**
  - Each component recipe gets its own folder under `theme/recipes/<component>/` once it needs multiple files.
- **Light palettes can use black contrast**
  - `yellow` and `sand` intentionally use `colorPalette.contrast = black` for readability.

### How to add a new color palette

- **1) Add raw palette**
  - Add the scale in `src/theme/colors/index.ts`
- **2) Add semantic behavior**
  - Add to `src/theme/semantic/semantic-colors.ts`
  - Choose the correct factory:
    - `makeDarkPalette({ palette: '...' })` for “dark” palettes (white text)
    - `makeLightPalette({ palette: 'yellow' | 'sand', ... })` for “light” palettes (black text)
- **3) Allow it in recipes**
  - Add it to `src/theme/recipes/shared/color-palettes.ts` (`SUPPORTED_COLOR_PALETTES`)
  - Recipes like button will automatically pick it up.

### How to add a new recipe (best practice)

- Create `src/theme/recipes/<component>/` once you have multiple concerns:
  - `defaults.ts`, `sizes.ts`, `variants.ts`, `recipe.ts`, `index.ts`
- Keep `recipe.ts` as composition:
  - base styles + `defaultVariants` + `variants` wired from the local folder + shared helpers.
- Prefer **semantic tokens**:
  - `bg: 'colorPalette.solid'`
  - `_hover: { bg: 'colorPalette.hover' }`
  - `color: 'colorPalette.contrast'`
  - `borderColor: 'colorPalette.border'`
  - focus ring: `boxShadow: 'focusRing'` (palette-aware)

### Typography rules (Geist Sans)

- Host apps must load fonts via `next/font` and apply `GeistSans.className` at the document root.
- `ui-new` defaults are enforced via:
  - `theme/tokens/typography.ts` for `fonts/*`, `lineHeights.brand`, `letterSpacings.brand`
  - `theme/global-css.ts` for document + headings + form controls

### Required checks (before shipping)

### Typegen (required after theme changes)

Chakra v3 relies on **generated TypeScript types** for tokens/recipes. When you change anything under `src/theme/` (tokens, semantic tokens, recipes, palettes), you **must** regenerate the types so consumers get correct prop types (e.g. new recipe props like `link`).

Run:

```bash
bun run -F @trycompai/ui-v2 typegen
```

Then run the normal checks:

Run these (scoped to this package):

```bash
bun run -F @trycompai/ui-v2 typecheck
bun run -F @trycompai/ui-v2 lint
```
