'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FamilyInfo } from './ManageFamiliesDialog';

const PREVIEW_LIMIT = 5;

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
    <div className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2">
      <p className="text-destructive text-sm font-medium">
        Remove &ldquo;{family.name}&rdquo; from {count} control
        {count !== 1 ? 's' : ''}?
      </p>
      {affectedFrameworks.length > 0 && (
        <p className="text-muted-foreground mt-0.5 text-xs">
          Across {affectedFrameworks.join(', ')}
        </p>
      )}
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground mt-1.5 flex items-center gap-1 text-xs"
        onClick={() => setShowDetails((prev) => !prev)}
      >
        {showDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {showDetails ? 'Hide' : 'Show'} affected controls
      </button>
      {showDetails && (
        <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto">
          {preview.map((c) => (
            <li key={c.id} className="text-xs">
              <span className="text-foreground">{c.name || 'Unnamed control'}</span>
              {c.frameworks.length > 0 && (
                <span className="text-muted-foreground ml-1">
                  ({c.frameworks.join(', ')})
                </span>
              )}
            </li>
          ))}
          {remaining > 0 && (
            <li className="text-muted-foreground text-xs italic">
              and {remaining} more...
            </li>
          )}
        </ul>
      )}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="bg-destructive text-destructive-foreground rounded px-2.5 py-1 text-xs transition-colors hover:opacity-90"
        >
          Remove
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground rounded px-2.5 py-1 text-xs transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
