'use client';

import { cn } from '@trycompai/design-system/cn';
import type { PentestAgentEvent } from '@/lib/security/penetration-tests-client';

interface AgentActivityLogProps {
  events: PentestAgentEvent[];
  defaultOpen?: boolean;
}

/**
 * Drop events that reference our infrastructure provider in any string
 * field. Customers see Comp.ai end-to-end — exposing Maced-internal tool
 * names (`mcp__maced-helper__*`) or branded mentions in agent prose
 * leaks the supplier and looks like internal dev tooling. This is purely
 * a customer-facing UI filter; the events still exist in the API
 * response and our logs.
 *
 * Also drops `TodoWrite` rows — agent self-bookkeeping that has no
 * informational value for customers.
 */
function isCustomerVisible(event: PentestAgentEvent): boolean {
  if (event.tool === 'TodoWrite') return false;
  const fields: (string | null | undefined)[] = [
    event.agent,
    event.tool,
    event.summary,
    event.description,
    event.raw,
  ];
  for (const field of fields) {
    if (typeof field === 'string' && field.toLowerCase().includes('maced')) {
      return false;
    }
  }
  return true;
}

/**
 * Collapsible execution trace. Open by default — surfaces the agent
 * activity stream as proof-of-work without forcing a click. The section
 * is still wrapped in `<details>` so users can collapse it once they've
 * seen what they need.
 */
export function AgentActivityLog({
  events,
  defaultOpen = true,
}: AgentActivityLogProps) {
  const recent = [...events]
    .filter(isCustomerVisible)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 200);

  return (
    <details
      open={defaultOpen}
      className="overflow-hidden rounded-[var(--radius)] border border-border"
    >
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Execution trace
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {events.length}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {events.length === 0
            ? 'Waiting for events…'
            : `Showing latest ${recent.length}`}
        </span>
      </summary>
      {recent.length > 0 ? (
        <div className="max-h-96 overflow-y-auto border-t border-border bg-muted/30 font-mono text-xs">
          {recent.map((event) => (
            <ActivityRow key={event.id} event={event} />
          ))}
        </div>
      ) : null}
    </details>
  );
}

function ActivityRow({ event }: { event: PentestAgentEvent }) {
  const content = extractContent(event);
  const isCritical = event.emphasis === 'critical';
  const isToolUse = event.kind === 'tool_use';

  return (
    <div
      className={cn(
        'border-b border-border px-4 py-2 last:border-b-0',
        isCritical &&
          'bg-[var(--pt-sev-critical-bg)] text-[var(--pt-sev-critical-fg)]',
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="tabular-nums">
          {new Date(event.timestamp).toLocaleTimeString(undefined, {
            hour12: false,
          })}
        </span>
        <span className="font-semibold text-foreground">{event.agent}</span>
        {isToolUse && event.tool ? (
          <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
            {event.tool}
          </span>
        ) : null}
        {isCritical ? (
          <span className="rounded bg-[var(--pt-sev-critical-bar)]/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            critical
          </span>
        ) : null}
      </div>
      {content ? (
        <pre className="mt-1 whitespace-pre-wrap break-words">{content}</pre>
      ) : null}
    </div>
  );
}

function extractContent(event: PentestAgentEvent): string | null {
  if (event.summary && event.summary.trim().length > 0) {
    return truncate(event.summary, 4000);
  }
  if (event.description && event.description.trim().length > 0) {
    return truncate(event.description, 4000);
  }
  return null;
}

function truncate(s: string, max: number): string {
  return s.length > max
    ? `${s.slice(0, max)}\n… (${s.length - max} more chars)`
    : s;
}
