---
name: audit-design-system
description: Audit & fix design system usage — migrate @comp/ui and lucide-react to @trycompai/design-system
---

Audit the specified files for design system compliance. **Fix every issue found immediately.**

## Rules

1. **`@trycompai/design-system`** is the primary component library. `@comp/ui` is legacy — only use as last resort when no DS equivalent exists.
2. **Always check DS exports first** before reaching for `@comp/ui`. Run `node -e "console.log(Object.keys(require('@trycompai/design-system')))"` to check.
3. **Icons**: Use `@trycompai/design-system/icons` (Carbon icons), NOT `lucide-react`. Check with `node -e "const i = require('@trycompai/design-system/icons'); console.log(Object.keys(i).filter(k => k.match(/YourSearch/i)))"`.
4. **DS components that do NOT accept `className`**: `Text`, `Stack`, `HStack`, `Badge`, `Button` — wrap in `<div>` for custom styling.
5. **Button**: Use DS `Button` with `loading`, `iconLeft`, `iconRight` props instead of manually rendering spinners/icons.
6. **Layout**: Use `PageLayout`, `PageHeader`, `Stack`, `HStack`, `Section`, `SettingGroup`.
7. **Patterns**: Sheet (`Sheet > SheetContent > SheetHeader + SheetBody`), Drawer, Collapsible.

## Process
1. Read files specified in `$ARGUMENTS`
2. Find `@comp/ui` imports — check if DS equivalent exists
3. Find `lucide-react` imports — find matching Carbon icons
4. Migrate components and icons
5. Run build to verify: `npx turbo run typecheck --filter=@comp/app`
