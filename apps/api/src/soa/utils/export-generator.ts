import { jsPDF } from 'jspdf';

export type SOAExportFormat = 'pdf';

export interface SOAExportQuestion {
  id: string;
  text: string;
  columnMapping: {
    closure?: string | null;
    title: string | null;
    control_objective: string | null;
    isApplicable: boolean | null;
    justification: string | null;
  };
  answer: string | null;
}

export interface SOAExportMetadata {
  preparedBy: string | null;
  answeredQuestions: number;
  totalQuestions: number;
  approvedAt?: Date | string | null;
  declinedAt?: Date | string | null;
  status?: string | null;
  approverName?: string | null;
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
  metadata: SOAExportMetadata,
  format: SOAExportFormat = 'pdf',
): SOAExportResult {
  if (format !== 'pdf') {
    throw new Error(`Unsupported SOA export format: ${format}`);
  }

  return {
    fileBuffer: generateSOAPDF(questions, frameworkName, version, metadata),
    mimeType: 'application/pdf',
    filename: `statement-of-applicability-${sanitizeFrameworkName(frameworkName)}-v${version}.pdf`,
  };
}

function generateSOAPDF(
  questions: SOAExportQuestion[],
  frameworkName: string,
  version: number,
  metadata: SOAExportMetadata,
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
  const writeLines = (
    lines: string[],
    fontStyle: 'normal' | 'bold' = 'normal',
  ) => {
    if (lines.length === 0) return;
    pdf.setFont('helvetica', fontStyle);
    for (const line of lines) {
      ensureSpace(lineHeight);
      pdf.text(line, margin, y);
      y += lineHeight;
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
  const progressPercentage =
    metadata.totalQuestions > 0
      ? Math.round((metadata.answeredQuestions / metadata.totalQuestions) * 100)
      : 0;
  pdf.text(
    `Progress: ${metadata.answeredQuestions} / ${metadata.totalQuestions} (${progressPercentage}%)`,
    margin,
    y,
  );
  y += lineHeight;
  pdf.text(`Prepared by: ${metadata.preparedBy || 'Comp AI'}`, margin, y);
  y += lineHeight;
  const approvalStatusText = metadata.approvedAt
    ? `Approved on ${new Date(metadata.approvedAt).toLocaleDateString()}`
    : metadata.status === 'needs_review' && metadata.declinedAt
      ? `Declined on ${new Date(metadata.declinedAt).toLocaleDateString()}`
      : metadata.approverName
        ? 'Pending approval'
        : 'Not approved';
  pdf.text(`Approval status: ${approvalStatusText}`, margin, y);
  y += lineHeight;
  pdf.text(`Approved by: ${metadata.approverName || 'N/A'}`, margin, y);
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
    const closure = mapped.closure
      ? `Closure: ${mapped.closure}`
      : null;
    const objective = mapped.control_objective
      ? `Objective: ${mapped.control_objective}`
      : null;
    const applicability = `Applicable: ${isApplicableLabel}`;
    const justificationText = `Justification: ${justification}`;

    const titleLines = pdf.splitTextToSize(title, contentWidth);
    const closureLines = closure
      ? pdf.splitTextToSize(closure, contentWidth)
      : [];
    const objectiveLines = objective
      ? pdf.splitTextToSize(objective, contentWidth)
      : [];
    const applicabilityLines = pdf.splitTextToSize(applicability, contentWidth);
    const justificationLines = pdf.splitTextToSize(
      justificationText,
      contentWidth,
    );
    writeLines(titleLines, 'bold');
    writeLines(closureLines);
    writeLines(objectiveLines);
    writeLines(applicabilityLines);
    writeLines(justificationLines);
    ensureSpace(lineHeight * 0.5);
    y += lineHeight * 0.5;
  }

  return Buffer.from(pdf.output('arraybuffer'));
}

function sanitizeFrameworkName(frameworkName: string): string {
  return (frameworkName || 'soa')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

