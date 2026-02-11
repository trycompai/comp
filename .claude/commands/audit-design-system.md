# Audit & Fix Design System Usage

Audit the specified files or directories for proper design system usage. **Fix every issue found immediately.**

## Key Concept

The design system is **`@trycompai/design-system`** — an external npm package. It is the **single source of truth** for all UI components.

**`@comp/ui` is the OLD component library** being phased out. It should ONLY be used as a last resort when there is absolutely no equivalent in `@trycompai/design-system`.

## Rules

### 1. Always check `@trycompai/design-system` first

For every `@comp/ui` import you find:
1. Check if the component exists in `@trycompai/design-system` by looking at the package exports
2. If it exists → **migrate immediately**
3. Only if there is absolutely NO equivalent in the design system should `@comp/ui` remain

Do NOT maintain a hardcoded list — **always check the actual DS package exports** to see what's available. The DS is actively growing and may have new components.

### 2. Use DS primitives for layout, text, and spacing

- **Pages**: Use `PageLayout` and `PageHeader` — not custom `<div>` wrappers
- **Spacing/Layout**: Use `Stack` (vertical), `HStack` (horizontal), `Grid` — not `<div className="flex flex-col gap-4">`
- **Text**: Use `Text` with `size`, `weight`, `variant` props — not raw `<p>`, `<span>`, or `<div>` with Tailwind text classes
- **Sections**: Use `Section` with `title`/`description` — not custom card/header combos
- **Settings**: Use `SettingGroup` and `SettingRow` for settings pages
- **Empty states**: Use `Empty`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription`
- **Tables**: Use DS `Table` with `variant="bordered"` for data tables
- **Icons**: Use `@trycompai/design-system/icons` — not `lucide-react` or `@carbon/icons-react`

### 3. DS component constraints

These `@trycompai/design-system` components do **NOT** accept `className`:
- `Text` — wrap in `<div className="...">` if custom styling needed
- `Stack`, `HStack` — wrap in `<div className="...">` if custom styling needed
- `Badge` — wrap in `<div className="...">` if custom styling needed
- `Button` — use `variant`/`size` props; wrap in `<div>` for positioning

If you see `className` passed to any of these, **fix it by wrapping in a div**.

### 4. Component patterns

- **Sheet**: `Sheet > SheetContent > SheetHeader + SheetBody`
- **Drawer**: `Drawer > DrawerContent > DrawerHeader > DrawerTitle`
- **Collapsible**: `Collapsible > CollapsibleTrigger + CollapsibleContent`

## Process

1. Read every file in the target path
2. For every `@comp/ui` import, check the `@trycompai/design-system` package to see if an equivalent exists
3. **If yes**: Change the import and update any incompatible props
4. Look for raw HTML layout patterns (`<div className="flex ...">`, `<p className="text-sm ...">`) that should use DS primitives (`Stack`, `Text`, etc.)
5. Check for `className` on DS components that don't support it — **wrap in div**
6. After all fixes, run `bun run --filter '@comp/app' build` to verify
7. Report a summary of what was migrated/fixed

## Target

$ARGUMENTS
