# Project Rules

## API Architecture: Server Actions Migration

We are migrating away from Next.js server actions toward calling the NestJS API directly. The API enforces RBAC via `@RequirePermission` decorators, so all business logic should flow through it.

### Simple CRUD operations
Call the NestJS API directly from the client using custom hooks with useSWR for data fetching and useSWRMutation (or similar) for mutations. Delete the server action entirely.

- Client component calls the API via a hook
- No server action wrapper needed
- The NestJS API handles auth, validation, RBAC, and audit logging

### Multi-step orchestration
When an operation requires assembling multiple API calls (e.g., S3 upload + PATCH, read version + update policy), create a Next.js API route (`apps/app/src/app/api/...`) that orchestrates the calls. Delete the server action.

- Client component calls the Next.js API route
- Next.js API route calls the NestJS API endpoint(s) as needed
- Keeps orchestration server-side without exposing intermediate steps to the client

### What NOT to do
- Do NOT keep server actions as wrappers around API calls
- Do NOT use server actions for new features
- Do NOT add direct database (`@db`) access in the Next.js app for mutations — always go through the API

### API Client
- Server-side (Next.js API routes): use `apps/app/src/lib/api-server.ts` (`serverApi`)
- Client-side (hooks): call the NestJS API directly via fetch or a client-side API utility

### Tracking
Migration progress is tracked in Linear ticket ENG-165.
