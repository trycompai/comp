import { extractContentFromFile } from './content-extractor';
import ExcelJS from 'exceljs';
import { PDFDocument } from 'pdf-lib';
import { generateText } from 'ai';

// Mock AI dependencies
jest.mock('@ai-sdk/openai', () => ({ openai: jest.fn() }));
jest.mock('@ai-sdk/anthropic', () => ({ anthropic: jest.fn() }));
jest.mock('@ai-sdk/groq', () => ({ createGroq: jest.fn(() => jest.fn()) }));
jest.mock('ai', () => ({
  generateText: jest.fn(),
  generateObject: jest.fn(),
  jsonSchema: jest.fn((s) => s),
}));

async function createTestExcelBuffer(
  sheets: { name: string; rows: (string | number)[][] }[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name);
    for (const row of sheet.rows) {
      ws.addRow(row);
    }
  }
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe('content-extractor: extractContentFromFile', () => {
  const XLSX_MIME =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  it('should extract content from an Excel file with headers', async () => {
    const buffer = await createTestExcelBuffer([
      {
        name: 'Survey',
        rows: [
          ['Question', 'Response', 'Comment'],
          ['Do you agree?', 'Yes', 'Fully agree'],
          ['Rating?', '5', ''],
        ],
      },
    ]);

    const base64 = buffer.toString('base64');
    const result = await extractContentFromFile(base64, XLSX_MIME);

    expect(result).toContain('Question');
    expect(result).toContain('Do you agree?');
    expect(result).toContain('Yes');
    expect(result).toContain('Rating?');
  });

  it('should ignore scoring columns and placeholders in BPCE-style sheets', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Risk assessment SSI');
    worksheet.getCell('B10').value =
      'Le prestataire effectue-t-il des revues régulières des comptes à privilèges ?';
    worksheet.getCell('F10').value = {
      formula: 'IF(E10="NON",3,0)',
      result: 0,
    };
    worksheet.getCell('K10').value = '(Oui : 0, Non : 3)';
    worksheet.getCell('M10').value = 'A remplir';
    worksheet.getCell('O10').value =
      "La gestion des comptes à privilèges consiste à contrôler l'accès aux comptes.";

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const result = await extractContentFromFile(base64, XLSX_MIME);

    expect(result).toContain('[B10 Question]');
    expect(result).toContain('revues régulières des comptes à privilèges');
    expect(result).not.toContain('(Oui : 0, Non : 3)');
    expect(result).not.toContain('A remplir');
    expect(result).not.toContain('[F10');
  });

  it('should extract content from multiple sheets', async () => {
    const buffer = await createTestExcelBuffer([
      {
        name: 'General',
        rows: [
          ['Info', 'Details'],
          ['Name', 'Acme Corp'],
        ],
      },
      {
        name: 'Security',
        rows: [
          ['Control', 'Status'],
          ['MFA', 'Enabled'],
        ],
      },
    ]);

    const base64 = buffer.toString('base64');
    const result = await extractContentFromFile(base64, XLSX_MIME);

    expect(result).toContain('Acme Corp');
    expect(result).toContain('MFA');
  });

  it('should handle CSV files', async () => {
    const csv = 'question,answer\nWhat is 2+2?,4\n';
    const base64 = Buffer.from(csv).toString('base64');

    const result = await extractContentFromFile(base64, 'text/csv');

    expect(result).toContain('question,answer');
    expect(result).toContain('What is 2+2?,4');
  });

  it('should fall back to OpenAI when Claude PDF extraction is overloaded', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const bytes = await pdf.save();
    const mockGenerateText = generateText as jest.Mock;
    mockGenerateText
      .mockRejectedValueOnce(new Error('Overloaded'))
      .mockResolvedValueOnce({ text: 'Extracted PDF text' });

    const result = await extractContentFromFile(
      Buffer.from(bytes).toString('base64'),
      'application/pdf',
    );

    expect(result).toBe('Extracted PDF text');
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
  });

  it('should reject legacy XLS files with a clear message', async () => {
    const base64 = Buffer.from('legacy-binary-xls').toString('base64');

    await expect(
      extractContentFromFile(base64, 'application/vnd.ms-excel'),
    ).rejects.toThrow('Legacy Excel files');
  });

  it('should handle plain text files', async () => {
    const text = 'Some compliance document content';
    const base64 = Buffer.from(text).toString('base64');

    const result = await extractContentFromFile(base64, 'text/plain');

    expect(result).toBe(text);
  });

  it('should throw for Word documents', async () => {
    const base64 = Buffer.from('fake').toString('base64');

    await expect(
      extractContentFromFile(base64, 'application/msword'),
    ).rejects.toThrow('Word documents');
  });

  it('should throw for unsupported types', async () => {
    const base64 = Buffer.from('data').toString('base64');

    await expect(
      extractContentFromFile(base64, 'application/octet-stream'),
    ).rejects.toThrow('Unsupported file type');
  });
});
