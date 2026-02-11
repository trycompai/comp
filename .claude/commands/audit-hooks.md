# Audit & Fix Hooks / API Usage

Audit the specified files or directories for proper hook and API usage patterns. **Fix every issue found immediately.**

## Forbidden Patterns (fix on sight)

1. **`useAction` from `next-safe-action`** — Replace with a custom SWR hook or `useOrganizationMutations`/`usePolicyMutations`/etc. that calls `apiClient` directly
2. **Server actions that mutate via `@db`** — Delete the server action and ensure the component uses an API hook instead. Read-only server actions are OK temporarily.
3. **Direct `@db` access in client components** — Replace with `apiClient` call via a hook
4. **Direct `@db` access in Next.js pages for mutations** — Replace with `serverApi` call
5. **Raw `fetch()` without `credentials: 'include'`** — Replace with `apiClient`
6. **`apiClient` with third argument** (e.g., `apiClient.post(url, body, orgId)`) — Remove the third arg. Org context comes from session cookies.

## Required Patterns (add if missing)

1. **Data fetching in client components**: Must use `useSWR` with `apiClient` or a custom hook (e.g., `useTask`, `usePolicy`)
2. **Mutations in client components**: Must use custom hooks wrapping `apiClient` (e.g., `useOrganizationMutations`, `useRiskActions`)
3. **Data fetching in server components**: Must use `serverApi` from `apps/app/src/lib/api-server.ts`
4. **SWR hooks**: Use `fallbackData` for SSR initial data, `revalidateOnMount: !initialData`
5. **API response handling**: Lists = `response.data.data`, single resources = `response.data`
6. **`useSWR` `mutate()` safety**: Guard against undefined in optimistic updaters
7. **`Array.isArray()` checks**: When consuming data from SWR that could be stale

## Process

1. Read every file in the target path
2. Search for forbidden patterns (`useAction`, `@db` imports in client code, raw `fetch`, server action imports)
3. **Fix each issue immediately**:
   - If `useAction` → create or use an existing API hook, remove server action import
   - If raw `apiClient` in component → move to a hook if it's a repeated pattern
   - If `@db` in client/page mutation → replace with `serverApi` or `apiClient` hook
4. After all fixes, run `bun run --filter '@comp/app' build` to verify
5. Report a summary of what was fixed

## Target

$ARGUMENTS
