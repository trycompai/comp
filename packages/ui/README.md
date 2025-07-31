# @trycompai/ui

A modern, accessible UI component library built with React, TypeScript, and Tailwind CSS. Based on shadcn/ui components with custom enhancements.

## Installation

```bash
# Using npm
npm install @trycompai/ui

# Using yarn
yarn add @trycompai/ui

# Using bun
bun add @trycompai/ui
```

## Setup

### 1. Import the CSS

Add the UI library's global CSS to your app's entry point:

```tsx
// In your app's root layout or _app.tsx
import '@trycompai/ui/globals.css';
```

### 2. Configure Tailwind

The UI library provides a Tailwind preset. Update your `tailwind.config.ts`:

```ts
import uiPreset from '@trycompai/ui/tailwind-preset';
import type { Config } from 'tailwindcss';

export default {
  presets: [uiPreset],
  content: [
    './src/**/*.{ts,tsx}',
    // Include the UI library in content paths
    './node_modules/@trycompai/ui/dist/**/*.js',
  ],
  // Your custom config...
} satisfies Config;
```

### 3. Add CSS Variables

Ensure your app includes the required CSS variables for theming. These should be in your global CSS:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 10% 3.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    /* ... add dark mode variables */
  }
}
```

## Usage

### Basic Import

```tsx
import { Button, Card, Input } from '@trycompai/ui';

export function MyComponent() {
  return (
    <Card>
      <Input placeholder="Enter your name" />
      <Button>Submit</Button>
    </Card>
  );
}
```

### Import Specific Components

For better tree-shaking, import components individually:

```tsx
import { Button } from '@trycompai/ui/button';
import { Card } from '@trycompai/ui/card';
```

### Using Hooks

```tsx
import { useMediaQuery } from '@trycompai/ui/hooks';

export function ResponsiveComponent() {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return isMobile ? <MobileView /> : <DesktopView />;
}
```

### Using Utilities

```tsx
import { cn } from '@trycompai/ui/utils';

export function Component({ className }: { className?: string }) {
  return <div className={cn('flex items-center', className)}>Content</div>;
}
```

## Available Components

- **Layout**: Card, Separator, ScrollArea, ResizablePanels
- **Forms**: Button, Input, Label, Textarea, Select, Checkbox, RadioGroup, Switch, Slider
- **Feedback**: Alert, Toast, Progress, Spinner, Skeleton
- **Overlay**: Dialog, Sheet, Popover, Tooltip, DropdownMenu, ContextMenu
- **Navigation**: Tabs, NavigationMenu, Breadcrumb
- **Data Display**: Table, Badge, Avatar
- **Typography**: Text components with built-in styles
- **Advanced**: Calendar, DatePicker, Command, Combobox, Editor

## TypeScript Support

This library is built with TypeScript and includes comprehensive type definitions. All components are fully typed with proper prop interfaces.

## Next.js Compatibility

All components are marked with `"use client"` where necessary and are fully compatible with Next.js App Router.

## License

MIT
