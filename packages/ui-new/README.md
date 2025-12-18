# @trycompai/ui-new

Chakra UI component library for Comp AI.

## Setup

This package uses Chakra UI v3 with React 19. The package is configured with:

- TypeScript configuration extending shared `@trycompai/tsconfig`
- Build system using `tsup`
- Proper exports for components and utilities

## Usage

```tsx
import { Provider, Toaster, Tooltip } from '@trycompai/ui-new';

// Wrap your app with Provider
<Provider>
  <App />
  <Toaster />
</Provider>;
```

## Known Issues

There are TypeScript errors related to React 19 type compatibility with Chakra UI v3. These are type-checking issues only and don't affect runtime functionality. The components work correctly at runtime.

## Development

```bash
# Install dependencies
bun install

# Type check
bun run typecheck

# Build
bun run build

# Watch mode
bun run dev
```
