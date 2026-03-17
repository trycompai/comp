import {
  generateExportFile,
  generateXLSX,
  generateCSV,
  generatePDF,
} from './export-generator';
import ExcelJS from 'exceljs';
import type { QuestionAnswer } from './question-parser';

const sampleQAs: QuestionAnswer[] = [
  { question: 'Do you have MFA?', answer: 'Yes' },
  { question: 'Describe your backup strategy', answer: null },
  { question: 'SOC 2 compliant?', answer: 'In progress' },
];

describe('generateXLSX', () => {
  it('should produce a valid XLSX buffer', async () => {
    const buffer = await generateXLSX(sampleQAs);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);

    // Verify by reading back with ExcelJS
    const workbook = new ExcelJS.Workbook();
    type LoadFn = (data: Uint8Array) => Promise<ExcelJS.Workbook>;
    await (workbook.xlsx.load as unknown as LoadFn)(buffer);

    expect(workbook.worksheets.length).toBe(1);
    const ws = workbook.worksheets[0];
    expect(ws.name).toBe('Questionnaire');

    // Header row + 3 data rows = 4 rows
    expect(ws.rowCount).toBe(4);

    // Check header
    const headerRow = ws.getRow(1);
    expect(headerRow.getCell(1).value).toBe('#');
    expect(headerRow.getCell(2).value).toBe('Question');
    expect(headerRow.getCell(3).value).toBe('Answer');

    // Check first data row
    const dataRow = ws.getRow(2);
    expect(dataRow.getCell(1).value).toBe(1);
    expect(dataRow.getCell(2).value).toBe('Do you have MFA?');
    expect(dataRow.getCell(3).value).toBe('Yes');

    // Check null answer becomes empty string
    const nullAnswerRow = ws.getRow(3);
    expect(nullAnswerRow.getCell(3).value).toBe('');
  });

  it('should handle empty input', async () => {
    const buffer = await generateXLSX([]);

    const workbook = new ExcelJS.Workbook();
    type LoadFn = (data: Uint8Array) => Promise<ExcelJS.Workbook>;
    await (workbook.xlsx.load as unknown as LoadFn)(buffer);
    const ws = workbook.worksheets[0];

    // Only header row
    expect(ws.rowCount).toBe(1);
  });
});

describe('generateCSV', () => {
  it('should produce valid CSV with headers', () => {
    const csv = generateCSV(sampleQAs);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('"#","Question","Answer"');
    expect(lines[1]).toBe('"1","Do you have MFA?","Yes"');
    expect(lines[2]).toBe('"2","Describe your backup strategy",""');
    expect(lines[3]).toBe('"3","SOC 2 compliant?","In progress"');
  });

  it('should escape double quotes in CSV', () => {
    const qas: QuestionAnswer[] = [
      { question: 'Is "security" important?', answer: 'Yes, "very"' },
    ];
    const csv = generateCSV(qas);

    expect(csv).toContain('""security""');
    expect(csv).toContain('""very""');
  });
});

describe('generatePDF', () => {
  it('should produce a valid PDF buffer', () => {
    const buffer = generatePDF(sampleQAs, 'TestVendor');

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    // PDF files start with %PDF
    expect(buffer.toString('utf-8', 0, 4)).toBe('%PDF');
  });

  it('should handle empty QAs', () => {
    const buffer = generatePDF([], 'Empty');

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.toString('utf-8', 0, 4)).toBe('%PDF');
  });
});

describe('generateExportFile', () => {
  it('should generate XLSX export with correct metadata', async () => {
    const result = await generateExportFile(sampleQAs, 'xlsx', 'vendor-test.pdf');

    expect(result.mimeType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(result.filename).toBe('vendor-test.xlsx');
    expect(Buffer.isBuffer(result.fileBuffer)).toBe(true);
  });

  it('should generate CSV export with correct metadata', async () => {
    const result = await generateExportFile(sampleQAs, 'csv', 'vendor-test.xlsx');

    expect(result.mimeType).toBe('text/csv');
    expect(result.filename).toBe('vendor-test.csv');
  });

  it('should generate PDF export with correct metadata', async () => {
    const result = await generateExportFile(sampleQAs, 'pdf', 'vendor-test');

    expect(result.mimeType).toBe('application/pdf');
    expect(result.filename).toBe('vendor-test.pdf');
  });

  it('should sanitize dangerous filename characters', async () => {
    const result = await generateExportFile(
      sampleQAs,
      'csv',
      'test<file>:name.xlsx',
    );

    expect(result.filename).toBe('test_file__name.csv');
  });
});
