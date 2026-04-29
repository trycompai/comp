/**
 * Loading state for the pentests route. Mirrors the `SplitView` shell —
 * full-bleed (negative margins escape the app-shell's `p-4 md:p-6`), a
 * 340px sidebar, and a main pane — so a hard refresh on any pentest URL
 * (overview, detail, or create) doesn't briefly render the inherited
 * padded `[orgId]/loading.tsx` and visibly snap into the IDE-style
 * layout. The default `<PageLayout loading />` placeholder is a
 * centered card; pentest is edge-to-edge, so they don't overlap and the
 * jump shows up as a large CLS event on slower networks.
 */
export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 -m-4 md:-m-6">
      <aside className="flex h-full min-h-0 w-[340px] shrink-0 flex-col border-r border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-12 rounded bg-muted animate-pulse" />
            <div className="h-4 w-6 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-6 w-14 rounded border border-border bg-muted/50 animate-pulse" />
        </div>
        <ul className="flex-1 min-h-0 divide-y divide-border overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="flex flex-col gap-1.5 px-4 py-3"
              aria-hidden
            >
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
      <main className="flex flex-1 min-w-0 flex-col">
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto max-w-5xl space-y-6 px-8 py-8">
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
      </main>
    </div>
  );
}
