export interface LinkedFinding {
  text: string;
  sourceUrl?: string | null;
  sourceLabel?: string | null;
  entityType?: string | null;
}

export interface SummarySource {
  label: string;
  url: string;
  entityType?: string | null;
  source?: string | null;
}

export interface ShareableSummary {
  overview: string;
  keyFindings: string[];
  linkedKeyFindings: LinkedFinding[];
  sources: SummarySource[];
  generationStatus: 'generated' | 'fallback' | 'skipped';
  flags: string[];
  limitations: string[];
  recommendedNextSteps: string[];
}

export function readShareableSummary(snapshot: unknown): ShareableSummary | null {
  const summary = firstRecord(snapshot, [
    ['shareableSummary'],
    ['report', 'shareableSummary'],
    ['report', 'report', 'shareableSummary'],
  ]);
  if (!summary) return null;

  const overview = readString(summary.overview);
  const keyFindings = readStringArray(summary.keyFindings);
  const linkedKeyFindings = readLinkedFindings(summary.linkedKeyFindings);
  if (!overview || (keyFindings.length === 0 && linkedKeyFindings.length === 0)) return null;

  return {
    overview,
    keyFindings,
    linkedKeyFindings,
    sources: readSources(summary.sources),
    generationStatus: readGenerationStatus(summary.generationStatus),
    flags: readStringArray(summary.flags),
    limitations: readStringArray(summary.limitations),
    recommendedNextSteps: readStringArray(summary.recommendedNextSteps),
  };
}

export function formatShareableSummaryText(summary: ShareableSummary): string {
  const findings =
    summary.linkedKeyFindings.length > 0
      ? summary.linkedKeyFindings.map((finding) =>
          finding.sourceUrl
            ? `${finding.text} (${finding.sourceLabel ?? 'Source'}: ${finding.sourceUrl})`
            : finding.text,
        )
      : summary.keyFindings;

  return [
    'SHAREABLE SUMMARY',
    summary.overview,
    formatSection('KEY FINDINGS', findings),
    formatSection('FLAGS', summary.flags),
    formatSection('LIMITATIONS', summary.limitations),
    formatSection('RECOMMENDED NEXT STEPS', summary.recommendedNextSteps),
    formatSection(
      'SOURCES',
      summary.sources.map((source) => `${source.label}: ${source.url}`),
    ),
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function formatLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSection(title: string, items: string[]): string | null {
  if (items.length === 0) return null;
  return [title, ...items.map((item) => `- ${item}`)].join('\n');
}

function readLinkedFindings(value: unknown): LinkedFinding[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = toRecord(item);
    const text = readString(record?.text);
    if (!record || !text) return [];
    return [
      {
        text,
        sourceUrl: readOptionalString(record.sourceUrl),
        sourceLabel: readOptionalString(record.sourceLabel),
        entityType: readOptionalString(record.entityType),
      },
    ];
  });
}

function readSources(value: unknown): SummarySource[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = toRecord(item);
    const label = readString(record?.label);
    const url = readString(record?.url);
    if (!record || !label || !url) return [];
    return [
      {
        label,
        url,
        entityType: readOptionalString(record.entityType),
        source: readOptionalString(record.source),
      },
    ];
  });
}

function readGenerationStatus(value: unknown): ShareableSummary['generationStatus'] {
  if (value === 'fallback' || value === 'skipped') return value;
  return 'generated';
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const text = readString(item);
    return text ? [text] : [];
  });
}

function firstRecord(root: unknown, paths: string[][]): Record<string, unknown> | null {
  for (const path of paths) {
    const record = toRecord(getPath(root, path));
    if (record) return record;
  }
  return null;
}

function getPath(root: unknown, path: string[]): unknown {
  let value = root;
  for (const key of path) {
    const record = toRecord(value);
    if (!record) return undefined;
    value = record[key];
  }
  return value;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}
