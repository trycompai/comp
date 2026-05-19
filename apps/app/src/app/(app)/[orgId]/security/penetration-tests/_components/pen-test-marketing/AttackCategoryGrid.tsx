import { ATTACK_CATEGORIES } from './attack-categories';

export function AttackCategoryGrid() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {ATTACK_CATEGORIES.map((c) => (
        <div
          key={c.code}
          className="flex items-start gap-3 rounded-sm border border-border bg-background px-3.5 py-3"
        >
          <div className="w-9 shrink-0 pt-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-primary">
            {c.code}
          </div>
          <div className="min-w-0 flex-1">
            <div className="break-words text-[13px] leading-snug">{c.name}</div>
            <div className="break-words text-[11px] leading-[1.45] text-muted-foreground">
              {c.description}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
