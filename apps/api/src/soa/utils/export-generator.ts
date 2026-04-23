import { jsPDF } from 'jspdf';

export type SOAExportFormat = 'pdf';

export interface SOAExportQuestion {
  id: string;
  text: string;
  columnMapping: {
    title: string | null;
    control_objective: string | null;
    isApplicable: boolean | null;
    justification: string | null;
  };
  answer: string | null;
}

export interface SOAExportResult {
  fileBuffer: Buffer;
  mimeType: string;
  filename: string;
}

export function generateSOAExportFile(
  questions: SOAExportQuestion[],
  frameworkName: string,
  version: number,
  format: SOAExportFormat = 'pdf',
): SOAExportResult {
  if (format !== 'pdf') {
    throw new Error(`Unsupported SOA export format: ${format}`);
  }

  return {
    fileBuffer: generateSOAPDF(questions, frameworkName, version),
    mimeType: 'application/pdf',
    filename: `statement-of-applicability-${sanitizeFrameworkName(frameworkName)}-v${version}.pdf`,
  };
}

function generateSOAPDF(
  questions: SOAExportQuestion[],
  frameworkName: string,
  version: number,
): Buffer {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 7;
  let y = margin;

  const ensureSpace = (requiredHeight: number) => {
    if (y + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('Statement of Applicability', margin, y);
  y += lineHeight * 1.8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Framework: ${frameworkName}`, margin, y);
  y += lineHeight;
  pdf.text(`Version: v${version}`, margin, y);
  y += lineHeight;
  pdf.text(`Exported: ${new Date().toLocaleDateString()}`, margin, y);
  y += lineHeight * 2;

  pdf.setFontSize(11);
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const mapped = question.columnMapping ?? {
      title: null,
      control_objective: null,
      isApplicable: null,
      justification: null,
    };

    const isApplicableLabel =
      mapped.isApplicable === true
        ? 'Yes'
        : mapped.isApplicable === false
          ? 'No'
          : 'N/A';

    const justification =
      typeof mapped.justification === 'string' && mapped.justification.trim()
        ? mapped.justification
        : question.answer || 'No justification provided';

    const title = `${i + 1}. ${mapped.title || question.text || 'Untitled Control'}`;
    const objective = mapped.control_objective
      ? `Objective: ${mapped.control_objective}`
      : null;
    const applicability = `Applicable: ${isApplicableLabel}`;
    const justificationText = `Justification: ${justification}`;

    const titleLines = pdf.splitTextToSize(title, contentWidth);
    const objectiveLines = objective
      ? pdf.splitTextToSize(objective, contentWidth)
      : [];
    const applicabilityLines = pdf.splitTextToSize(applicability, contentWidth);
    const justificationLines = pdf.splitTextToSize(
      justificationText,
      contentWidth,
    );
    const blockHeight =
      (titleLines.length +
        objectiveLines.length +
        applicabilityLines.length +
        justificationLines.length) *
        lineHeight +
      lineHeight * 1.5;

    ensureSpace(blockHeight);

    pdf.setFont('helvetica', 'bold');
    pdf.text(titleLines, margin, y);
    y += titleLines.length * lineHeight;

    pdf.setFont('helvetica', 'normal');
    if (objectiveLines.length > 0) {
      pdf.text(objectiveLines, margin, y);
      y += objectiveLines.length * lineHeight;
    }
    pdf.text(applicabilityLines, margin, y);
    y += applicabilityLines.length * lineHeight;
    pdf.text(justificationLines, margin, y);
    y += justificationLines.length * lineHeight + lineHeight * 0.5;
  }

  return Buffer.from(pdf.output('arraybuffer'));
}

function sanitizeFrameworkName(frameworkName: string): string {
  return (frameworkName || 'soa')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

