import AdmZip from 'adm-zip';
import ExcelJS from 'exceljs';
import { stripXlsxDataValidations } from './sanitize-xlsx';

// A whole-sheet validation range like the one the HECVAT Full template ships
// (~17 billion cells). Loading it un-stripped would block the event loop for
// minutes, so passing tests must go through the sanitized path.
const FULL_SHEET_VALIDATION =
  '<dataValidations count="1">' +
  '<dataValidation allowBlank="1" showInputMessage="1" showErrorMessage="1" ' +
  'prompt="Changes cannot be made in this sheet." ' +
  'sqref="F18:F1048576 N1:XFD1048576 A3:A1048576"/>' +
  '</dataValidations>';

async function buildWorkbook(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Questions');
  sheet.getCell('A1').value = 'Will your company sign a BAA?';
  sheet.getCell('B1').value = 'Yes';
  const data = await workbook.xlsx.writeBuffer();
  return Buffer.from(data as ArrayBuffer);
}

function injectValidation(xlsx: Buffer, block: string): Buffer {
  const zip = new AdmZip(xlsx);
  const entryName = 'xl/worksheets/sheet1.xml';
  const xml = zip.readAsText(entryName);
  zip.updateFile(
    entryName,
    Buffer.from(xml.replace('</worksheet>', `${block}</worksheet>`), 'utf8'),
  );
  return zip.toBuffer();
}

function readSheetXml(xlsx: Uint8Array): string {
  const zip = new AdmZip(Buffer.from(xlsx));
  return zip.readAsText('xl/worksheets/sheet1.xml');
}

describe('stripXlsxDataValidations', () => {
  it('removes dataValidations blocks from worksheet xml', async () => {
    const poisoned = injectValidation(
      await buildWorkbook(),
      FULL_SHEET_VALIDATION,
    );

    const sanitized = stripXlsxDataValidations(poisoned);

    expect(readSheetXml(poisoned)).toContain('<dataValidations');
    expect(readSheetXml(sanitized)).not.toContain('<dataValidations');
  });

  it('removes self-closing dataValidations elements', async () => {
    const poisoned = injectValidation(
      await buildWorkbook(),
      '<dataValidations count="0"/>',
    );

    const sanitized = stripXlsxDataValidations(poisoned);

    expect(readSheetXml(sanitized)).not.toContain('<dataValidations');
  });

  it('returns the input unchanged when there is nothing to strip', async () => {
    const clean = await buildWorkbook();

    expect(stripXlsxDataValidations(clean)).toBe(clean);
  });

  it('returns the input unchanged when the buffer is not a zip archive', () => {
    const garbage = Buffer.from('not an xlsx file');

    expect(stripXlsxDataValidations(garbage)).toBe(garbage);
  });

  it('keeps the workbook loadable with all cell text intact', async () => {
    const poisoned = injectValidation(
      await buildWorkbook(),
      FULL_SHEET_VALIDATION,
    );

    const sanitized = stripXlsxDataValidations(poisoned);

    const workbook = new ExcelJS.Workbook();
    type LoadFn = (data: Uint8Array) => Promise<ExcelJS.Workbook>;
    await (workbook.xlsx.load as unknown as LoadFn)(sanitized);
    const sheet = workbook.getWorksheet('Questions');

    expect(sheet?.getCell('A1').value).toBe('Will your company sign a BAA?');
    expect(sheet?.getCell('B1').value).toBe('Yes');
  });
});
