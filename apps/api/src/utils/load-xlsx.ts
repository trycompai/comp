import AdmZip from 'adm-zip';
import ExcelJS from 'exceljs';
import { stripXlsxDataValidations } from './sanitize-xlsx';

// Generous for questionnaires (HECVAT Full inflates to ~6 MB) while still
// rejecting zip bombs that expand to multiple GB.
export const MAX_XLSX_UNCOMPRESSED_BYTES = 512 * 1024 * 1024;

/**
 * Rejects xlsx archives whose declared uncompressed size exceeds the limit,
 * using only the zip central directory — nothing is inflated. Call this
 * before any code path that decompresses worksheet XML (ExcelJS or AdmZip),
 * so a zip bomb is refused before it can exhaust memory.
 */
export function assertXlsxDecompressionWithinLimit(
  data: Uint8Array,
  limitBytes: number = MAX_XLSX_UNCOMPRESSED_BYTES,
): void {
  let entries: AdmZip.IZipEntry[];
  try {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    entries = new AdmZip(buffer).getEntries();
  } catch {
    // Not a readable archive — let the workbook loader report its own error.
    return;
  }

  let totalBytes = 0;
  for (const entry of entries) {
    totalBytes += entry.header.size;
  }

  if (totalBytes > limitBytes) {
    const totalMB = Math.round(totalBytes / (1024 * 1024));
    const limitMB = Math.round(limitBytes / (1024 * 1024));
    throw new Error(
      `Excel file expands to ${totalMB} MB uncompressed, exceeding the ${limitMB} MB safety limit.`,
    );
  }
}

/**
 * The only supported way to open an xlsx with ExcelJS in this codebase:
 * enforces the decompression limit and strips whole-sheet dataValidations
 * (see stripXlsxDataValidations) before parsing. There is deliberately no
 * fallback to the original bytes — if the sanitized archive fails to load,
 * re-parsing the unsanitized one could reintroduce the event-loop hang the
 * sanitizer exists to prevent (2026-07-16 outage).
 */
export async function loadXlsxWorkbook(
  data: Uint8Array,
): Promise<ExcelJS.Workbook> {
  assertXlsxDecompressionWithinLimit(data);

  const workbook = new ExcelJS.Workbook();
  // ExcelJS type declarations are incompatible with Node 22+ / TS 5.8+
  // Buffer types, so we use a typed wrapper to avoid the mismatch.
  type LoadFn = (data: Uint8Array) => Promise<ExcelJS.Workbook>;
  await (workbook.xlsx.load as unknown as LoadFn)(
    stripXlsxDataValidations(data),
  );
  return workbook;
}
