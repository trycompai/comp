import { extractContentFromFile } from './extract-content-from-file';
import ExcelJS from 'exceljs';
import { generateText } from 'ai';

// Mock external dependencies
jest.mock('@/vector-store/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn(() => 'claude-mock-model'),
}));

jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'openai-mock-model'),
}));

jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

jest.mock('mammoth', () => ({
  default: {
    extractRawText: jest.fn(),
    convertToHtml: jest.fn(),
  },
}));

const mockGenerateText = generateText as jest.MockedFunction<
  typeof generateText
>;

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

describe('extractContentFromFile - Excel handling', () => {
  const XLSX_MIME =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  it('should extract content from a single-sheet Excel file', async () => {
    const buffer = await createTestExcelBuffer([
      {
        name: 'Data',
        rows: [
          ['Name', 'Value'],
          ['Alice', 100],
          ['Bob', 200],
        ],
      },
    ]);

    const base64 = buffer.toString('base64');
    const result = await extractContentFromFile(base64, XLSX_MIME);

    expect(result).toContain('Sheet: Data');
    expect(result).toContain('Name');
    expect(result).toContain('Alice');
    expect(result).toContain('100');
    expect(result).toContain('Bob');
    expect(result).toContain('200');
  });

  it('should extract content from multiple sheets', async () => {
    const buffer = await createTestExcelBuffer([
      { name: 'Sheet1', rows: [['Hello', 'World']] },
      { name: 'Sheet2', rows: [['Foo', 'Bar']] },
    ]);

    const base64 = buffer.toString('base64');
    const result = await extractContentFromFile(base64, XLSX_MIME);

    expect(result).toContain('Sheet: Sheet1');
    expect(result).toContain('Hello');
    expect(result).toContain('Sheet: Sheet2');
    expect(result).toContain('Foo');
  });

  it('should skip empty rows', async () => {
    const buffer = await createTestExcelBuffer([
      {
        name: 'Sparse',
        rows: [
          ['Data1'],
          [], // empty row won't be added by ExcelJS addRow with empty array
          ['Data2'],
        ],
      },
    ]);

    const base64 = buffer.toString('base64');
    const result = await extractContentFromFile(base64, XLSX_MIME);

    expect(result).toContain('Data1');
    expect(result).toContain('Data2');
  });

  it('should handle XLS MIME type', async () => {
    const buffer = await createTestExcelBuffer([
      { name: 'Test', rows: [['Value']] },
    ]);

    const base64 = buffer.toString('base64');
    // application/vnd.ms-excel is also accepted
    const result = await extractContentFromFile(
      base64,
      'application/vnd.ms-excel',
    );

    expect(result).toContain('Value');
  });

  it('should throw on corrupt Excel data', async () => {
    const badData = Buffer.from('not an excel file').toString('base64');

    await expect(
      extractContentFromFile(badData, XLSX_MIME),
    ).rejects.toThrow('Failed to parse Excel file');
  });
});

describe('extractContentFromFile - non-Excel types', () => {
  it('should handle CSV files', async () => {
    const csv = 'col1,col2\nval1,val2\n';
    const base64 = Buffer.from(csv).toString('base64');

    const result = await extractContentFromFile(base64, 'text/csv');

    expect(result).toContain('col1,col2');
    expect(result).toContain('val1,val2');
  });

  it('should handle plain text files', async () => {
    const text = 'Hello, world!';
    const base64 = Buffer.from(text).toString('base64');

    const result = await extractContentFromFile(base64, 'text/plain');

    expect(result).toBe(text);
  });

  it('should throw for unsupported file types', async () => {
    const base64 = Buffer.from('data').toString('base64');

    await expect(
      extractContentFromFile(base64, 'application/octet-stream'),
    ).rejects.toThrow('Unsupported file type');
  });

  it('should throw for legacy .doc files', async () => {
    const base64 = Buffer.from('data').toString('base64');

    await expect(
      extractContentFromFile(base64, 'application/msword'),
    ).rejects.toThrow('Legacy Word documents');
  });
});

describe('extractContentFromFile - PDF extraction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use Claude for PDF files', async () => {
    const pdfContent = 'Extracted SOC 2 report content';
    mockGenerateText.mockResolvedValue({
      text: pdfContent,
    } as Awaited<ReturnType<typeof generateText>>);

    const base64 = Buffer.from('fake-pdf-data').toString('base64');
    const result = await extractContentFromFile(base64, 'application/pdf');

    expect(result).toBe(pdfContent);
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-mock-model',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({ type: 'text' }),
              expect.objectContaining({
                type: 'file',
                mediaType: 'application/pdf',
              }),
            ]),
          }),
        ]),
      }),
    );
  });

  it('should throw on PDF extraction failure', async () => {
    mockGenerateText.mockRejectedValue(new Error('API rate limit'));

    const base64 = Buffer.from('fake-pdf-data').toString('base64');

    await expect(
      extractContentFromFile(base64, 'application/pdf'),
    ).rejects.toThrow('Failed to extract PDF content: API rate limit');
  });
});

describe('extractContentFromFile - image extraction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use OpenAI vision for images', async () => {
    const imageContent = 'Text from image';
    mockGenerateText.mockResolvedValue({
      text: imageContent,
    } as Awaited<ReturnType<typeof generateText>>);

    const base64 = Buffer.from('fake-image-data').toString('base64');
    const result = await extractContentFromFile(base64, 'image/png');

    expect(result).toBe(imageContent);
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'openai-mock-model',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({ type: 'text' }),
              expect.objectContaining({ type: 'image' }),
            ]),
          }),
        ]),
      }),
    );
  });

  it('should throw on image extraction failure', async () => {
    mockGenerateText.mockRejectedValue(new Error('Vision API error'));

    const base64 = Buffer.from('fake-image-data').toString('base64');

    await expect(
      extractContentFromFile(base64, 'image/png'),
    ).rejects.toThrow('Failed to extract image content: Vision API error');
  });
});
