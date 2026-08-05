---
name: essentials
description: "Critical rules that must always be followed"
---

Source Cursor rule: `.cursor/rules/essentials.mdc`.
Original file scope: `**/*.{ts,tsx}`.
Original Cursor alwaysApply: `true`.

# Essentials

## Package Manager

Use `npm`, never bun/yarn/pnpm.

```bash
npm install          # Install deps
npm install <pkg>    # Add package
npm run <script>     # Run script
npx <cmd>            # Execute binary
```

## Components

**Use `@trycompai/design-system` first**, `@gideon-defender/ui` only as fallback.

```tsx
// ✅ Design system
import { Button, Card, Input, Select } from '@trycompai/design-system';
import { Add, Close } from '@trycompai/design-system/icons';

// ❌ Don't use when DS has the component
import { Button } from '@gideon-defender/ui/button';
import { Plus } from 'lucide-react';
```

**No `className` on DS components** - use variants and props only.

```tsx
// ✅ Use variants
<Button variant="destructive" size="sm">Delete</Button>

// ❌ No className overrides
<Button className="bg-red-500">Delete</Button>
```

## TypeScript

**No `any`. No unsafe type assertions.**

```tsx
// ✅ Validate external data with zod
const TaskSchema = z.object({ id: z.string(), title: z.string() });
const task = TaskSchema.parse(response.data);

// ❌ Never
const data: any = fetchData();
const task = response as Task;
```

## Data Fetching

**Get `organizationId` from URL params, not session.**

```tsx
// ✅ From params
export default async function Page({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
}

// ❌ Not from session
const session = await auth.api.getSession();
const orgId = session?.session?.activeOrganizationId;
```

**Server components fetch, pass to client with SWR `fallbackData`.**

```tsx
// Server page
const data = await fetchData(orgId);
return <ClientComponent initialData={data} />;

// Client component
const { data } = useSWR(key, fetcher, { fallbackData: initialData });
```

## State Management

**No `nuqs`** - use React `useState` for UI state, Next.js for URL state.

```tsx
// ✅ React state for UI
const [isOpen, setIsOpen] = useState(false);

// ❌ No nuqs
import { useQueryState } from 'nuqs';
```

## After Changes

**Always run checks after code changes:**

```bash
npm run typecheck
npm run lint
```

Fix all errors before committing.
