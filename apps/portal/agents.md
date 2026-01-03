# Portal Development Rules

## Design System

**All UI must use `@trycompai/ui-shadcn` components. No custom styling.**

**`className` is NOT a valid prop on design system components.**

### Imports

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
  PageLayout,
  Container,
  // ... etc
} from '@trycompai/ui-shadcn';
```

### ❌ NEVER Do This

```tsx
// Custom div layouts
<div className="flex flex-col gap-4 items-center">

// Raw HTML with Tailwind
<h1 className="text-2xl font-bold">Title</h1>
<p className="text-sm text-gray-500">Description</p>

// className is NOT a valid prop - TypeScript will error
<Button className="bg-red-500">Custom Button</Button>
<Card className="shadow-xl">Content</Card>
```

### ✅ ALWAYS Do This

```tsx
// Use Stack for layouts
<Stack gap="4" align="center">

// Use typography components
<Heading level={1}>Title</Heading>
<Text size="sm" variant="muted">Description</Text>

// Use component variants
<Button variant="destructive">Delete</Button>
<Card maxWidth="lg">Content</Card>
```

## Page Structure

```tsx
// Standard page layout
export default function MyPage() {
  return (
    <PageLayout variant="center">
      <Card maxWidth="lg">
        <CardHeader>
          <Stack align="center" gap="3">
            <Heading level={1}>Page Title</Heading>
            <Text variant="muted">Description</Text>
          </Stack>
        </CardHeader>
        <CardContent>
          <Stack gap="6">{/* content */}</Stack>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
```

## Component Quick Reference

| Need                       | Use                                               |
| -------------------------- | ------------------------------------------------- |
| Vertical/horizontal layout | `<Stack direction="column/row" gap="4">`          |
| Page wrapper               | `<PageLayout variant="center">`                   |
| Max-width container        | `<Container size="lg">` or `<Card maxWidth="lg">` |
| Page title                 | `<Heading level={1}>`                             |
| Body text                  | `<Text>` or `<Text variant="muted">`              |
| Buttons                    | `<Button variant="..." size="...">`               |
| Loading button             | `<Button loading>`                                |
| Button with icon           | `<Button iconLeft={<Icon />}>`                    |
| Status indicator           | `<Badge variant="...">`                           |

## Spacing

Use Stack's `gap` prop instead of margins:

```tsx
// ❌ BAD
<div className="mb-4">First</div>
<div className="mt-2">Second</div>

// ✅ GOOD
<Stack gap="4">
  <div>First</div>
  <div>Second</div>
</Stack>
```

## Layout Positioning

For layout concerns (width, grid positioning), use wrapper elements:

```tsx
// ✅ Wrapper div for width
<div className="w-full">
  <Button>Full Width</Button>
</div>

// ✅ Grid positioning with wrapper
<div className="col-span-2">
  <Card>Content</Card>
</div>
```

## When Something Is Missing

1. Check if a variant exists in the component
2. Add a variant to `@trycompai/ui-shadcn` if needed
3. **Never** work around with wrapper divs for styling that should be a variant
