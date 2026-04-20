import { Skeleton } from '@trycompai/design-system';

/** Placeholder shown while `TeamMembers` (heavy RSC + DB queries) streams in. */
export function TeamMembersSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Skeleton style={{ height: 32, width: 300 }} />
        <Skeleton style={{ height: 32, width: 140 }} />
        <Skeleton style={{ height: 32, width: 140 }} />
      </div>
      <div className="rounded-lg border border-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
          >
            <Skeleton style={{ height: 32, width: 32, borderRadius: 9999 }} />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton style={{ height: 14, width: '40%' }} />
              <Skeleton style={{ height: 12, width: '25%' }} />
            </div>
            <Skeleton style={{ height: 20, width: 80 }} />
            <Skeleton style={{ height: 20, width: 60 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
