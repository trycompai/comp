# UI Component Usage Rules (Design System)

## Core Principle

**Components do NOT accept `className`. Use variants and props only.**

This design system enforces strict styling through `class-variance-authority` (cva).
The `className` prop has been removed from all components to prevent style overrides.

## ❌ These Will NOT Compile

```tsx
// className is not a valid prop - TypeScript will error
<Button className="bg-red-500">Delete</Button>
<Card className="shadow-xl">Content</Card>
<Badge className="uppercase">Status</Badge>
<Stack className="mt-4">Content</Stack>
```

## ✅ ALWAYS Do This

```tsx
// Use component variants
<Button variant="destructive">Delete</Button>
<Button variant="outline" size="lg">Large Outline</Button>
<Badge variant="secondary">Status</Badge>

// Use component props
<Card maxWidth="lg">Content</Card>
<Text size="lg" weight="bold" variant="primary">Title</Text>
<Heading level={2}>Section Title</Heading>
<Stack gap="4" align="center">Content</Stack>
```

## Layout & Positioning

For layout concerns (width, grid positioning, margins), use wrapper elements:

```tsx
// ✅ Wrapper div for layout
<div className="w-full">
  <Button>Full Width</Button>
</div>

// ✅ Grid/flex positioning with wrapper
<div className="col-span-2">
  <Card>Spanning Card</Card>
</div>

// ✅ Use Stack/Grid for spacing
<Stack gap="4">
  <Button>First</Button>
  <Button>Second</Button>
</Stack>
```

## Available Components & Their APIs

### Layout Primitives

```tsx
// Stack - flex layout
<Stack direction="row" gap="4" align="center" justify="between">
  {children}
</Stack>

// Grid - responsive grid
<Grid cols={3} gap="4">
  {children}
</Grid>

// Container - max-width wrapper
<Container size="lg" padding="default">
  {children}
</Container>

// PageLayout - full page structure
<PageLayout variant="center" padding="default">
  {children}
</PageLayout>
```

### Typography

```tsx
// Heading - h1-h6 with consistent styles
<Heading level={1}>Page Title</Heading>
<Heading level={2} variant="muted">Subtitle</Heading>

// Text - body text
<Text size="sm" variant="muted">Description</Text>
<Text weight="semibold">Important text</Text>
```

### Interactive

```tsx
// Button variants: default, outline, secondary, ghost, destructive, link
// Button sizes: default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg
<Button variant="outline" size="sm" loading={isLoading}>
  Save
</Button>
<Button iconLeft={<PlusIcon />}>Add Item</Button>
<Button iconRight={<ArrowRightIcon />}>Continue</Button>

// Badge variants: default, secondary, destructive, outline
<Badge variant="outline">Active</Badge>
```

### Layout Components

```tsx
// Card with maxWidth control
<Card maxWidth="lg">Content</Card>

// Section with title/description
<Section>
  <SectionHeader>
    <SectionTitle>Settings</SectionTitle>
    <SectionDescription>Manage your preferences</SectionDescription>
  </SectionHeader>
  <SectionContent>{children}</SectionContent>
</Section>
```

## If a Variant Doesn't Exist

1. **Check the component file** - it might exist and you missed it
2. **Add a new variant** to the component's `cva` definition
3. **Create a new component** if it's a genuinely new pattern

```tsx
// Example: Adding a variant to button.tsx
const buttonVariants = cva('...base classes...', {
  variants: {
    variant: {
      // existing variants...
      newVariant: 'bg-teal-500 text-white hover:bg-teal-600', // ADD HERE
    },
  },
});
```

**NEVER use wrapper divs to apply styles that should be component variants.**

## Import Pattern

```tsx
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Stack,
  Heading,
  Text,
  Badge,
  // ... etc
} from '@trycompai/design-system';
```

