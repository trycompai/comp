import AdmZip from 'adm-zip';

const WORKSHEET_ENTRY_RE = /^xl\/worksheets\/[^/]+\.xml$/;

// Matches a whole <dataValidations>...</dataValidations> block or a
// self-closing <dataValidations/>. Validations cannot nest, so the
// non-greedy body match is safe.
const DATA_VALIDATIONS_BLOCK_RE =
  /<dataValidations(?:\s[^>]*)?\/>|<dataValidations(?:\s[^>]*)?>[\s\S]*?<\/dataValidations>/g;

/**
 * Removes <dataValidations> blocks from every worksheet inside an xlsx
 * archive before the workbook is handed to ExcelJS.
 *
 * ExcelJS registers each validation on every individual cell of its sqref
 * range, so a template with a whole-sheet range — e.g. HECVAT Full ships
 * "N1:XFD1048576" ≈ 17 billion cells — blocks the event loop until the
 * process is killed (incident 2026-07-16, api.trycomp.ai outage).
 * Validations only hold dropdown rules and prompts, never cell text, so
 * removing them cannot change extracted content.
 *
 * Best-effort: returns the original bytes untouched when there is nothing
 * to strip or when the archive cannot be rewritten.
 */
export function stripXlsxDataValidations(data: Uint8Array): Uint8Array {
  try {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const zip = new AdmZip(buffer);
    let changed = false;

    for (const entry of zip.getEntries()) {
      if (!WORKSHEET_ENTRY_RE.test(entry.entryName)) {
        continue;
      }

      const xml = entry.getData().toString('utf8');
      if (!xml.includes('<dataValidations')) {
        continue;
      }

      const cleaned = xml.replace(DATA_VALIDATIONS_BLOCK_RE, '');
      if (cleaned !== xml) {
        zip.updateFile(entry.entryName, Buffer.from(cleaned, 'utf8'));
        changed = true;
      }
    }

    return changed ? zip.toBuffer() : data;
  } catch {
    return data;
  }
}
