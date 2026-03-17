import { extractContentFromFile } from './content-extractor';
import ExcelJS from 'exceljs';

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

  it('should extract content from multiple sheets', async () => {
    const buffer = await createTestExcelBuffer([
      { name: 'General', rows: [['Info', 'Details'], ['Name', 'Acme Corp']] },
      { name: 'Security', rows: [['Control', 'Status'], ['MFA', 'Enabled']] },
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
