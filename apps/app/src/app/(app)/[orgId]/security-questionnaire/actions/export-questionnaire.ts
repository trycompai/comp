'use server';

import { authActionClient } from '@/actions/safe-action';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { z } from 'zod';

const inputSchema = z.object({
  questionsAndAnswers: z.array(
    z.object({
      question: z.string(),
      answer: z.string().nullable(),
    }),
  ),
  format: z.enum(['xlsx', 'csv', 'pdf']),
});

interface QuestionAnswer {
  question: string;
  answer: string | null;
}

/**
 * Generates XLSX file from questions and answers
 */
function generateXLSX(questionsAndAnswers: QuestionAnswer[]): Buffer {
  const workbook = XLSX.utils.book_new();

  // Create worksheet data
  const worksheetData = [
    ['#', 'Question', 'Answer'], // Header row
    ...questionsAndAnswers.map((qa, index) => [index + 1, qa.question, qa.answer || '']),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 }, // #
    { wch: 60 }, // Question
    { wch: 60 }, // Answer
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Questionnaire');

  // Convert to buffer
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

/**
 * Generates CSV file from questions and answers
 */
function generateCSV(questionsAndAnswers: QuestionAnswer[]): string {
  const rows = [
    ['#', 'Question', 'Answer'], // Header row
    ...questionsAndAnswers.map((qa, index) => [
      String(index + 1),
      qa.question.replace(/"/g, '""'), // Escape quotes
      (qa.answer || '').replace(/"/g, '""'), // Escape quotes
    ]),
  ];

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

/**
 * Generates PDF file from questions and answers
 */
function generatePDF(questionsAndAnswers: QuestionAnswer[], vendorName?: string): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;
  const lineHeight = 7;

  // Add title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const title = vendorName ? `Questionnaire: ${vendorName}` : 'Questionnaire';
  doc.text(title, margin, yPosition);
  yPosition += lineHeight * 2;

  // Add date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
  yPosition += lineHeight * 2;

  // Process each question-answer pair
  doc.setFontSize(11);

  questionsAndAnswers.forEach((qa, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    // Question number and question
    doc.setFont('helvetica', 'bold');
    const questionText = `Q${index + 1}: ${qa.question}`;
    const questionLines = doc.splitTextToSize(questionText, contentWidth);
    doc.text(questionLines, margin, yPosition);
    yPosition += questionLines.length * lineHeight + 2;

    // Answer
    doc.setFont('helvetica', 'normal');
    const answerText = qa.answer || 'No answer provided';
    const answerLines = doc.splitTextToSize(`A${index + 1}: ${answerText}`, contentWidth);
    doc.text(answerLines, margin, yPosition);
    yPosition += answerLines.length * lineHeight + 4;
  });

  // Convert to buffer
  return Buffer.from(doc.output('arraybuffer'));
}

export const exportQuestionnaire = authActionClient
  .inputSchema(inputSchema)
  .metadata({
    name: 'export-questionnaire',
    track: {
      event: 'export-questionnaire',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { questionsAndAnswers, format } = parsedInput;
    const { session } = ctx;

    if (!session?.activeOrganizationId) {
      throw new Error('No active organization');
    }

    const organizationId = session.activeOrganizationId;

    try {
      const vendorName = 'security-questionnaire';
      const sanitizedVendorName = vendorName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const timestamp = new Date().toISOString().split('T')[0];

      let fileBuffer: Buffer;
      let mimeType: string;
      let fileExtension: string;
      let filename: string;

      // Generate file based on format
      switch (format) {
        case 'xlsx': {
          fileBuffer = generateXLSX(questionsAndAnswers);
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileExtension = 'xlsx';
          filename = `questionnaire-${sanitizedVendorName}-${timestamp}.xlsx`;
          break;
        }

        case 'csv': {
          const csvContent = generateCSV(questionsAndAnswers);
          fileBuffer = Buffer.from(csvContent, 'utf-8');
          mimeType = 'text/csv';
          fileExtension = 'csv';
          filename = `questionnaire-${sanitizedVendorName}-${timestamp}.csv`;
          break;
        }

        case 'pdf': {
          fileBuffer = generatePDF(questionsAndAnswers, vendorName);
          mimeType = 'application/pdf';
          fileExtension = 'pdf';
          filename = `questionnaire-${sanitizedVendorName}-${timestamp}.pdf`;
          break;
        }

        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Convert buffer to base64 data URL for direct download
      const base64Data = fileBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Data}`;

      return {
        success: true,
        data: {
          downloadUrl: dataUrl,
          filename,
        },
      };
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to export questionnaire');
    }
  });
