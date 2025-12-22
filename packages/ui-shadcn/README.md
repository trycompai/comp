# @trycompai/ui-shadcn

Tailwind v4 + shadcn/ui component library for Comp AI.

This package was scaffolded from this shadcn preset:

`https://ui.shadcn.com/init?base=base&style=vega&baseColor=neutral&theme=emerald&iconLibrary=lucide&font=noto-sans&menuAccent=subtle&menuColor=default&radius=small&template=next`

## Usage (Next.js)

Import your app Tailwind entry CSS first, then the design system globals:

```ts
// app/layout.tsx
import '@/styles/globals.css';
import '@trycompai/ui-shadcn/globals.css';
```

This package **assumes Tailwind v4** in the consuming app (the generated class names use v4 syntax).

Use components from the package root:

```ts
import { Button } from '@trycompai/ui-shadcn';
```

## Adding components

Run shadcn against this package (it uses `components.json`):

```bash
cd packages/ui-shadcn
bunx --bun shadcn@latest add button
```

## Development

```bash
bun run -F @trycompai/ui-shadcn typecheck
bun run -F @trycompai/ui-shadcn lint
```
