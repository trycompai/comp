/**
 * Shared loading skeleton for pentest routes. Mirrors the SplitView shell
 * one-to-one (full-bleed, 340px sidebar + main pane on desktop) so a hard
 * refresh transitions into the live page without a CLS jump.
 *
 * On mobile (<md) only ONE pane is rendered, picked by `variant` to match
 * the route the user is hard-refreshing on:
 *   - 'list'   — only the sidebar shape
 *   - 'detail' — only the main pane shape
 *   - 'create' — only the main pane shape
 *
 * Desktop always shows both. Pure JSX, no hooks — safe to consume from
 * server-component `loading.tsx` files.
 */
type Variant = 'list' | 'detail' | 'create';

interface LoadingShellProps {
  variant: Variant;
  /** Right-pane skeleton — typed/lined to roughly match the resolving page. */
  mainPane: React.ReactNode;
}

export function LoadingShell({ variant, mainPane }: LoadingShellProps) {
  const showSidebarMobile = variant === 'list';
  const showMainMobile = !showSidebarMobile;

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 -m-4 md:-m-6">
      <aside
        className={[
          'flex h-full min-h-0 w-full md:w-[340px] md:shrink-0 flex-col border-r border-border bg-background',
          showSidebarMobile ? 'flex' : 'hidden md:flex',
        ].join(' ')}
        aria-hidden
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-12 rounded bg-muted animate-pulse" />
            <div className="h-4 w-6 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-6 w-14 rounded border border-border bg-muted/50 animate-pulse" />
        </div>
        <ul className="flex-1 min-h-0 divide-y divide-border overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex flex-col gap-1.5 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-4 w-20 rounded-full bg-muted animate-pulse" />
                <div className="h-3 w-14 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
            </li>
          ))}
        </ul>
        <div className="border-t border-border px-4 py-3">
          <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
        </div>
      </aside>
      <main
        className={[
          'min-w-0 flex-1 flex-col',
          showMainMobile ? 'flex' : 'hidden md:flex',
        ].join(' ')}
      >
        {mainPane}
      </main>
    </div>
  );
}

/** Overview-shape main-pane skeleton (header + hero card + 4-stat band). */
export function OverviewMainSkeleton() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        <div className="flex items-end justify-between gap-3 pb-3">
          <div className="space-y-2">
            <div className="h-7 w-40 rounded bg-muted animate-pulse" />
            <div className="h-3 w-72 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-9 w-28 rounded border border-border bg-muted/50 animate-pulse" />
        </div>
        <div className="rounded border border-border p-6 space-y-3">
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          <div className="h-9 w-1/2 rounded bg-muted animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-6 border-b-2 border-border pb-6 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={
                i > 0
                  ? 'space-y-3 md:border-l md:border-border md:pl-6'
                  : 'space-y-3'
              }
            >
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              <div className="h-10 w-16 rounded bg-muted animate-pulse" />
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Detail-shape main-pane skeleton (header + sev tally + agent grid + table). */
export function DetailMainSkeleton() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-32 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-7 w-2/3 rounded bg-muted animate-pulse" />
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <div className="h-3 w-40 rounded bg-muted animate-pulse" />
            <div className="h-3 w-44 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-11 gap-1.5">
            {Array.from({ length: 22 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded bg-muted animate-pulse"
              />
            ))}
          </div>
          <div className="h-3 w-32 rounded bg-muted animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded border border-border bg-muted/40 animate-pulse"
              />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          <div className="space-y-1 rounded border border-border p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-8 rounded bg-muted animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Create-form-shape main-pane skeleton. */
export function CreateMainSkeleton() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <div className="mx-auto w-full max-w-[680px] px-4 py-8 md:px-6 md:py-10">
        <div className="rounded-[var(--radius)] border border-border bg-card p-6 md:p-8 space-y-5">
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            <div className="h-6 w-2/3 rounded bg-muted animate-pulse" />
            <div className="h-3 w-full rounded bg-muted animate-pulse" />
          </div>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
              <div className="h-9 rounded border border-border bg-muted/40 animate-pulse" />
              <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
            </div>
          ))}
          <div className="rounded border border-border bg-muted/40 p-3.5 space-y-2">
            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-3 w-full rounded bg-muted animate-pulse" />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <div className="h-9 w-20 rounded border border-border bg-muted/40 animate-pulse" />
            <div className="h-9 w-28 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
