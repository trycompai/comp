'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FamilyInfo } from './ManageFamiliesDialog';

const PREVIEW_LIMIT = 10;

export function DeleteFamilyConfirmation({
  family,
  onConfirm,
  onCancel,
}: {
  family: FamilyInfo;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [confirmedOnce, setConfirmedOnce] = useState(false);
  const count = family.controls.length;

  const affectedFrameworks = useMemo(() => {
    const fws = new Set<string>();
    for (const c of family.controls) {
      for (const fw of c.frameworks) fws.add(fw);
    }
    return [...fws].sort();
  }, [family.controls]);

  const preview = family.controls.slice(0, PREVIEW_LIMIT);
  const remaining = count - PREVIEW_LIMIT;

  return (
    <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
      <div>
        <p className="text-destructive text-sm font-medium">
          Remove &ldquo;{family.name}&rdquo;?
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          This will ungroup {count} control{count !== 1 ? 's' : ''}.
          {affectedFrameworks.length > 0 && (
            <> Affects {affectedFrameworks.join(', ')}.</>
          )}
        </p>
      </div>

      {count > 0 && (
        <div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
            onClick={() => setShowDetails((prev) => !prev)}
          >
            {showDetails ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {count} affected control{count !== 1 ? 's' : ''}
          </button>
          {showDetails && (
            <ul className="mt-1.5 max-h-36 space-y-px overflow-y-auto rounded border border-border bg-background px-3 py-2">
              {preview.map((c) => (
                <li key={c.id} className="text-muted-foreground truncate text-xs">
                  {c.name || 'Unnamed control'}
                </li>
              ))}
              {remaining > 0 && (
                <li className="text-muted-foreground/60 mt-0.5 text-xs">
                  + {remaining} more
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {confirmedOnce ? (
          <>
            <span className="text-destructive text-xs font-medium">Are you sure?</span>
            <button
              type="button"
              onClick={onConfirm}
              className="bg-destructive text-destructive-foreground rounded px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90"
            >
              Yes, remove
            </button>
            <button
              type="button"
              onClick={() => setConfirmedOnce(false)}
              className="text-muted-foreground hover:text-foreground rounded px-3 py-1.5 text-xs transition-colors"
            >
              No
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setConfirmedOnce(true)}
              className="bg-destructive text-destructive-foreground rounded px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90"
            >
              Remove family
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground rounded px-3 py-1.5 text-xs transition-colors"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
