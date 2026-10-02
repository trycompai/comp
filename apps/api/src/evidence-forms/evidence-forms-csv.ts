import type { EvidenceFormFieldDefinition } from './evidence-forms.definitions';

// Treat formula-leading cells as text before escaping CSV quotes.
const FORMULA_PREFIX_PATTERN = /^[=+\-@\t\r\n\uFF1D\uFF0B\uFF0D\uFF20]/;

function neutralizeFormula(value: string): string {
  return FORMULA_PREFIX_PATTERN.test(value) ? `'${value}` : value;
}

export function toCsvRow(values: string[]): string {
  return values
    .map((value) => `"${neutralizeFormula(value).replace(/"/g, '""')}"`)
    .join(',');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function flattenValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    return value;
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return value.toString();
  }
  if (typeof value === 'symbol') {
    return value.description ?? '';
  }
  return '';
}

function flattenMatrixRows(params: {
  value: unknown;
  field: EvidenceFormFieldDefinition;
}): string {
  const { value, field } = params;
  if (!Array.isArray(value)) {
    return '';
  }

  const columns = Array.isArray(field.columns) ? field.columns : [];
  if (columns.length === 0) {
    return JSON.stringify(value);
  }

  return value
    .filter(isRecord)
    .map((row) =>
      columns
        .map((column) => {
          const cellValue = row[column.key];
          const normalizedValue =
            typeof cellValue === 'string' ? cellValue : '';
          return `${column.label}: ${normalizedValue}`;
        })
        .join(' | '),
    )
    .join(' || ');
}

/** File values must come from the organization-scoped URL refresh. */
export function getCsvFieldValue(params: {
  value: unknown;
  field: EvidenceFormFieldDefinition;
}): string {
  const { value, field } = params;
  if (field.type === 'file' || (isRecord(value) && 'fileKey' in value)) {
    if (
      !isRecord(value) ||
      typeof value.fileKey !== 'string' ||
      value.fileKey.trim().length === 0 ||
      typeof value.downloadUrl !== 'string'
    ) {
      return '';
    }
    return value.downloadUrl;
  }
  if (field.type === 'matrix') {
    return flattenMatrixRows({ value, field });
  }
  return flattenValue(value);
}
