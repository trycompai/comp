'use client';

import JsonView from '@uiw/react-json-view';
import { Check, Copy } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

interface EvidenceJsonViewerProps {
  /** Sanitized evidence payload (server-side sanitizer redacts sensitive keys). */
  evidence: unknown;
}

const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.length === 0;
  return Object.keys(value as Record<string, unknown>).length === 0;
};

/**
 * Read-only JSON viewer for cloud-test evidence. Sensitive keys are already
 * redacted server-side by evidence-sanitizer.ts before they reach this
 * component — this is render only.
 */
export function EvidenceJsonViewer({ evidence }: EvidenceJsonViewerProps) {
  const [copied, setCopied] = useState(false);

  const display = useMemo(() => {
    // `@uiw/react-json-view` expects an object/array at the root. Wrap primitives
    // so we never pass a plain string/number/null into the tree view.
    if (evidence === null || evidence === undefined) return null;
    if (typeof evidence === 'object') return evidence;
    return { value: evidence };
  }, [evidence]);

  const jsonString = useMemo(() => {
    if (display === null) return '';
    try {
      return JSON.stringify(display, null, 2);
    } catch {
      return '';
    }
  }, [display]);

  const handleCopy = useCallback(async () => {
    if (!jsonString) return;
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — silently no-op rather than throw.
    }
  }, [jsonString]);

  if (isEmpty(evidence)) {
    return (
      <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        No evidence collected for this finding.
      </div>
    );
  }

  return (
    <div className="group relative rounded-md border bg-muted/40 p-3">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/80 px-1.5 py-1 text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
        aria-label="Copy evidence JSON to clipboard"
      >
        {copied ? (
          <>
            <Check className="h-2.5 w-2.5" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-2.5 w-2.5" />
            Copy
          </>
        )}
      </button>
      <div className="overflow-auto">
        <JsonView
          value={display ?? {}}
          collapsed={2}
          displayDataTypes={false}
          enableClipboard={false}
          style={{
            backgroundColor: 'transparent',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '11px',
          }}
        />
      </div>
    </div>
  );
}
