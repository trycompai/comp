import AdmZip from 'adm-zip';
import ExcelJS from 'exceljs';
import {
  assertXlsxDecompressionWithinLimit,
  loadXlsxWorkbook,
} from './load-xlsx';

const FULL_SHEET_VALIDATION =
  '<dataValidations count="1">' +
  '<dataValidation allowBlank="1" showInputMessage="1" ' +
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

describe('loadXlsxWorkbook', () => {
  it('loads a workbook poisoned with a whole-sheet data validation', async () => {
    const poisoned = injectValidation(
      await buildWorkbook(),
      FULL_SHEET_VALIDATION,
    );

    const workbook = await loadXlsxWorkbook(poisoned);
    const sheet = workbook.getWorksheet('Questions');

    expect(sheet?.getCell('A1').value).toBe('Will your company sign a BAA?');
    expect(sheet?.getCell('B1').value).toBe('Yes');
  });

  it('rejects buffers that are not xlsx archives', async () => {
    await expect(
      loadXlsxWorkbook(Buffer.from('not an xlsx file')),
    ).rejects.toThrow();
  });
});

describe('assertXlsxDecompressionWithinLimit', () => {
  it('accepts a normal workbook under the default limit', async () => {
    const clean = await buildWorkbook();

    expect(() => assertXlsxDecompressionWithinLimit(clean)).not.toThrow();
  });

  it('rejects archives whose declared uncompressed size exceeds the limit', async () => {
    const clean = await buildWorkbook();

    expect(() => assertXlsxDecompressionWithinLimit(clean, 10)).toThrow(
      /safety limit/,
    );
  });

  it('ignores buffers that are not zip archives', () => {
    expect(() =>
      assertXlsxDecompressionWithinLimit(Buffer.from('not a zip')),
    ).not.toThrow();
  });
});
