'use client';

import JsonView from '@uiw/react-json-view';
import { Download } from 'lucide-react';
import { useCallback, useMemo } from 'react';

interface EvidenceJsonViewProps {
  evidence: Record<string, unknown>;
  organizationName?: string;
  automationName?: string;
}

/**
 * Sanitizes a value for safe JSON serialization.
 * Handles edge cases: functions, symbols, circular refs, undefined, etc.
 */
const sanitizeForJson = (obj: unknown, seen = new WeakSet()): unknown => {
  // Handle primitives
  if (obj === null) return null;
  if (obj === undefined) return null;
  if (typeof obj === 'function') return '[Function]';
  if (typeof obj === 'symbol') return obj.toString();
  if (typeof obj === 'bigint') return obj.toString();

  // Handle Date objects
  if (obj instanceof Date) {
    return isNaN(obj.getTime()) ? null : obj.toISOString();
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForJson(item, seen));
  }

  // Handle objects
  if (typeof obj === 'object') {
    // Detect circular reference
    if (seen.has(obj)) {
      return '[Circular Reference]';
    }
    seen.add(obj);

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeForJson(value, seen);
    }
    return result;
  }

  return obj;
};

/**
 * Formats a string to be safe for filenames
 */
const toSafeFilename = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
};

/**
 * Gets a short date string for the filename (YYYY-MM-DD)
 */
const getShortDate = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

export function EvidenceJsonView({
  evidence,
  organizationName = 'organization',
  automationName = 'automation',
}: EvidenceJsonViewProps) {
  // Sanitize evidence for safe rendering and download
  const sanitizedEvidence = useMemo(() => {
    try {
      return sanitizeForJson(evidence) as Record<string, unknown>;
    } catch {
      return { error: 'Failed to process evidence data' };
    }
  }, [evidence]);

  // Generate filename: {orgName}_evidence_{automationName}_{date}.json
  const generateFilename = useCallback(() => {
    const orgPart = toSafeFilename(organizationName);
    const automationPart = toSafeFilename(automationName);
    const datePart = getShortDate();
    return `${orgPart}_evidence_${automationPart}_${datePart}.json`;
  }, [organizationName, automationName]);

  const handleDownload = useCallback(() => {
    try {
      const jsonString = JSON.stringify(sanitizedEvidence, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = generateFilename();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      console.error('Failed to download evidence JSON');
    }
  }, [sanitizedEvidence, generateFilename]);

  // Check if evidence is empty or invalid
  const hasValidEvidence = useMemo(() => {
    return (
      sanitizedEvidence &&
      typeof sanitizedEvidence === 'object' &&
      Object.keys(sanitizedEvidence).length > 0
    );
  }, [sanitizedEvidence]);

  if (!hasValidEvidence) {
    return (
      <div className="mt-2 rounded bg-muted p-2 text-xs text-muted-foreground">
        No evidence data available
      </div>
    );
  }

  return (
    <div className="mt-2 rounded bg-muted p-2 text-xs relative group">
      <button
        onClick={handleDownload}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Download evidence as JSON"
        type="button"
      >
        <Download className="h-3 w-3 text-muted-foreground" />
      </button>
      <div className="overflow-auto">
        <JsonView
          value={sanitizedEvidence}
          collapsed={false}
          displayDataTypes={false}
          enableClipboard={false}
          style={{
            backgroundColor: 'transparent',
            fontFamily: 'ui-monospace, monospace',
            fontSize: '11px',
          }}
        />
      </div>
    </div>
  );
}


