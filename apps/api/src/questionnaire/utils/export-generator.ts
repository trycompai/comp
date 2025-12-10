import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import type { QuestionAnswer } from './question-parser';

export type ExportFormat = 'pdf' | 'csv' | 'xlsx';

export interface ExportResult {
  fileBuffer: Buffer;
  mimeType: string;
  filename: string;
}

/**
 * Generates an export file in the specified format
 */
export function generateExportFile(
  questionsAndAnswers: QuestionAnswer[],
  format: ExportFormat,
  vendorName: string,
): ExportResult {
  // Remove original extension if present and get base name
  const baseName = vendorName.replace(/\.[^/.]+$/, '');
  // Keep the original name but sanitize only dangerous characters for filenames
  const sanitizedBaseName = baseName.replace(/[<>:"/\\|?*]/g, '_');

  switch (format) {
    case 'xlsx':
      return {
        fileBuffer: generateXLSX(questionsAndAnswers),
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `${sanitizedBaseName}.xlsx`,
      };

    case 'csv':
      return {
        fileBuffer: Buffer.from(generateCSV(questionsAndAnswers), 'utf-8'),
        mimeType: 'text/csv',
        filename: `${sanitizedBaseName}.csv`,
      };

    case 'pdf':
    default:
      return {
        fileBuffer: generatePDF(questionsAndAnswers, baseName),
        mimeType: 'application/pdf',
        filename: `${sanitizedBaseName}.pdf`,
      };
  }
}

/**
 * Generates an XLSX file buffer from questions and answers
 */
export function generateXLSX(questionsAndAnswers: QuestionAnswer[]): Buffer {
  const workbook = XLSX.utils.book_new();
  const worksheetData = [
    ['#', 'Question', 'Answer'],
    ...questionsAndAnswers.map((qa, index) => [
      index + 1,
      qa.question,
      qa.answer || '',
    ]),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  worksheet['!cols'] = [{ wch: 5 }, { wch: 60 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Questionnaire');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Generates a CSV string from questions and answers
 */
export function generateCSV(questionsAndAnswers: QuestionAnswer[]): string {
  const rows = [
    ['#', 'Question', 'Answer'],
    ...questionsAndAnswers.map((qa, index) => [
      String(index + 1),
      qa.question.replace(/"/g, '""'),
      (qa.answer || '').replace(/"/g, '""'),
    ]),
  ];
  return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

/**
 * Generates a PDF buffer from questions and answers
 */
export function generatePDF(
  questionsAndAnswers: QuestionAnswer[],
  vendorName?: string,
): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;
  const lineHeight = 7;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const title = vendorName ? `Questionnaire: ${vendorName}` : 'Questionnaire';
  doc.text(title, margin, yPosition);
  yPosition += lineHeight * 2;

  // Generated date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
  yPosition += lineHeight * 2;

  // Questions and answers
  doc.setFontSize(11);
  questionsAndAnswers.forEach((qa, index) => {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    // Question
    doc.setFont('helvetica', 'bold');
    const questionText = `Q${index + 1}: ${qa.question}`;
    const questionLines = doc.splitTextToSize(questionText, contentWidth);
    doc.text(questionLines, margin, yPosition);
    yPosition += questionLines.length * lineHeight + 2;

    // Answer
    doc.setFont('helvetica', 'normal');
    const answerText = qa.answer || 'No answer provided';
    const answerLines = doc.splitTextToSize(
      `A${index + 1}: ${answerText}`,
      contentWidth,
    );
    doc.text(answerLines, margin, yPosition);
    yPosition += answerLines.length * lineHeight + 4;
  });

  return Buffer.from(doc.output('arraybuffer'));
}
