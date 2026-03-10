---
name: audit-hooks
description: Audit & fix hooks and API usage patterns — eliminate server actions, raw fetch, and stale patterns
---

Audit the specified files for hook and API usage compliance. **Fix every issue found immediately.**

## Forbidden Patterns (fix immediately)

1. **`useAction` from `next-safe-action`** → replace with SWR hook or custom mutation hook
2. **Server actions mutating via `@db`** → delete and use API hook instead
3. **Direct `@db` in client components** → replace with `apiClient` via hook
4. **Direct `@db` in Next.js pages for mutations** → replace with `serverApi`
5. **Raw `fetch()` without `credentials: 'include'`** → use `apiClient`
6. **`window.location.reload()` after mutations** → use SWR `mutate()`
7. **`router.refresh()` after mutations** → use SWR `mutate()`
8. **`useEffect` + `apiClient.get` for data fetching** → replace with `useSWR`
9. **Callback props for data refresh** (`onXxxAdded`, `onSuccess`) → remove, rely on SWR cache sharing

## Required Patterns

- **Client data fetching**: `useSWR` with `apiClient` or custom hook
- **Client mutations**: custom hooks wrapping `apiClient` with `mutate()` for cache invalidation
- **Server components**: `serverApi` from `apps/app/src/lib/api-server.ts`
- **SWR**: `fallbackData` for SSR data, `revalidateOnMount: !initialData`
- **API response**: lists = `response.data.data`, single = `response.data`
- **`mutate()` safety**: guard against `undefined` in optimistic update functions
- **`Array.isArray()` checks**: when consuming SWR data that could be stale

## Process
1. Read files specified in `$ARGUMENTS`
2. Find forbidden patterns and fix them
3. Ensure all data fetching uses SWR hooks
4. Run typecheck to verify: `npx turbo run typecheck --filter=@comp/app`
