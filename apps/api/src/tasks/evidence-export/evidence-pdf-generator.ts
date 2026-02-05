/**
 * Evidence PDF Generator
 * Generates PDF documents for automation evidence export
 */

import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { inspect } from 'node:util';
import stringify from 'safe-stable-stringify';
import { redactSensitiveData } from './evidence-redaction';
import type {
  NormalizedAutomation,
  TaskEvidenceSummary,
} from './evidence-export.types';

interface PDFConfig {
  doc: jsPDF;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
  lineHeight: number;
  defaultFontSize: number;
  yPosition: number;
}

/**
 * Clean text for safe PDF rendering
 */
function cleanTextForPDF(text: string): string {
  if (!text) return '';

  // Strip invisible/control unicode chars
  const stripped = text
    .replace(/\u00AD/g, '')
    .replace(/[\u200B-\u200F]/g, '')
    .replace(/[\u202A-\u202E]/g, '')
    .replace(/[\u2060-\u206F]/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/\uFFFD/g, '');

  // Replace problematic characters
  const replacements: Record<string, string> = {
    '\u2018': "'",
    '\u2019': "'",
    '\u201C': '"',
    '\u201D': '"',
    '\u2013': '-',
    '\u2014': '-',
    '\u2026': '...',
    '\u00A0': ' ',
    '\u2022': '*',
  };

  let cleaned = stripped;
  for (const [unicode, replacement] of Object.entries(replacements)) {
    cleaned = cleaned.replace(new RegExp(unicode, 'g'), replacement);
  }

  return cleaned;
}

/**
 * Check and handle page breaks
 */
function checkPageBreak(
  config: PDFConfig,
  requiredHeight: number = config.lineHeight,
): void {
  if (config.yPosition + requiredHeight > config.pageHeight - config.margin) {
    config.doc.addPage();
    config.yPosition = config.margin;
  }
}

/**
 * Add text with word wrapping
 */
function addText(
  config: PDFConfig,
  text: string,
  options: {
    fontSize?: number;
    bold?: boolean;
    color?: [number, number, number];
    indent?: number;
  } = {},
): void {
  const {
    fontSize = config.defaultFontSize,
    bold = false,
    color = [0, 0, 0],
    indent = 0,
  } = options;

  const cleanText = cleanTextForPDF(text);
  config.doc.setFontSize(fontSize);
  config.doc.setTextColor(color[0], color[1], color[2]);
  config.doc.setFont('helvetica', bold ? 'bold' : 'normal');

  const lines: string[] = config.doc.splitTextToSize(
    cleanText,
    config.contentWidth - indent,
  ) as string[];

  for (const line of lines) {
    checkPageBreak(config);
    config.doc.text(line, config.margin + indent, config.yPosition);
    config.yPosition += config.lineHeight;
  }
}

/**
 * Add a section header
 */
function addSectionHeader(config: PDFConfig, title: string): void {
  config.yPosition += config.lineHeight;
  checkPageBreak(config, config.lineHeight * 2);
  addText(config, title, { fontSize: 12, bold: true });
  config.yPosition += config.lineHeight * 0.5;
}

/**
 * Add a horizontal line separator
 */
function addSeparator(config: PDFConfig): void {
  checkPageBreak(config);
  config.doc.setDrawColor(200, 200, 200);
  config.doc.setLineWidth(0.3);
  config.doc.line(
    config.margin,
    config.yPosition,
    config.margin + config.contentWidth,
    config.yPosition,
  );
  config.yPosition += config.lineHeight;
}

/**
 * Format JSON for display in PDF
 */
const MAX_INSPECT_DEPTH = 4;

const safeStringify = stringify.configure({
  bigint: true,
  circularValue: '[Circular]',
});

function safeJsonStringify(data: unknown): string | null {
  try {
    return (
      safeStringify(
        data,
        (_key, value) => {
          if (value instanceof Date) {
            return value.toISOString();
          }
          if (value instanceof Error) {
            return {
              name: value.name,
              message: value.message,
              stack: value.stack,
            };
          }
          if (value instanceof Map) {
            return { type: 'Map', entries: Array.from(value.entries()) };
          }
          if (value instanceof Set) {
            return { type: 'Set', values: Array.from(value.values()) };
          }
          if (typeof value === 'function') {
            return `[Function ${value.name || 'anonymous'}]`;
          }
          if (typeof value === 'symbol') {
            return value.toString();
          }
          return value;
        },
        2,
      ) ?? null
    );
  } catch {
    return null;
  }
}

function formatJsonForPDF(data: unknown): string {
  const redacted = redactSensitiveData(data);

  if (redacted === null || redacted === undefined) return 'N/A';

  if (typeof redacted === 'string') {
    return redacted;
  }

  if (typeof redacted === 'number' || typeof redacted === 'boolean') {
    return String(redacted);
  }

  if (typeof redacted === 'bigint') {
    return redacted.toString();
  }

  const json = safeJsonStringify(redacted);
  if (json !== null && json !== undefined) {
    return json;
  }

  const inspected = inspect(redacted, {
    depth: MAX_INSPECT_DEPTH,
    breakLength: 80,
    maxArrayLength: 50,
  });

  return inspected;
}

/**
 * Add page numbers to all pages
 */
function addPageNumbers(config: PDFConfig): void {
  const totalPages = config.doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    config.doc.setPage(i);
    config.doc.setFontSize(8);
    config.doc.setFont('helvetica', 'normal');
    config.doc.setTextColor(128, 128, 128);
    config.doc.text(
      `Page ${i} of ${totalPages}`,
      config.pageWidth - config.margin - 25,
      config.pageHeight - 10,
    );
  }
}

/**
 * Generate PDF for a single automation
 */
export function generateAutomationPDF(
  automation: NormalizedAutomation,
  context: {
    organizationName: string;
    taskTitle: string;
  },
): Buffer {
  const doc = new jsPDF();
  const config: PDFConfig = {
    doc,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    margin: 20,
    contentWidth: doc.internal.pageSize.getWidth() - 40,
    lineHeight: 6,
    defaultFontSize: 10,
    yPosition: 20,
  };

  // Header
  addText(config, context.organizationName, { fontSize: 14, bold: true });
  config.yPosition += config.lineHeight * 0.5;
  addText(config, `Task: ${context.taskTitle}`, { fontSize: 11 });
  config.yPosition += config.lineHeight;

  // Automation title
  const typeLabel =
    automation.type === 'app_automation'
      ? 'App Automation'
      : 'Custom Automation';
  addText(config, `${typeLabel}: ${automation.name}`, {
    fontSize: 13,
    bold: true,
  });

  if (automation.integrationName) {
    addText(config, `Integration: ${automation.integrationName}`, {
      fontSize: 10,
      color: [100, 100, 100],
    });
  }

  config.yPosition += config.lineHeight;

  // Export timestamp
  addText(config, `Exported: ${format(new Date(), 'PPpp')}`, {
    fontSize: 9,
    color: [128, 128, 128],
  });

  addSeparator(config);

  // Summary section
  addSectionHeader(config, 'Summary');
  addText(config, `Total Runs: ${automation.totalRuns}`);
  addText(config, `Successful: ${automation.successfulRuns}`);
  addText(config, `Failed: ${automation.failedRuns}`);

  if (automation.latestRunAt) {
    addText(config, `Latest Run: ${format(automation.latestRunAt, 'PPpp')}`);
  }

  addSeparator(config);

  // Runs section
  addSectionHeader(config, 'Run History');

  for (const run of automation.runs) {
    checkPageBreak(config, config.lineHeight * 8);

    // Run header
    const statusColor = getStatusColor(run.status, run.failedCount > 0);
    addText(config, `Run: ${format(run.createdAt, 'PPpp')}`, {
      fontSize: 10,
      bold: true,
    });
    addText(config, `Status: ${run.status.toUpperCase()}`, {
      fontSize: 9,
      color: statusColor,
    });

    if (run.durationMs) {
      addText(config, `Duration: ${run.durationMs}ms`, { fontSize: 9 });
    }

    // Metrics
    if (run.type === 'app_automation') {
      addText(
        config,
        `Checked: ${run.totalChecked} | Passed: ${run.passedCount} | Failed: ${run.failedCount}`,
        { fontSize: 9 },
      );
    } else if (run.evaluationStatus) {
      addText(config, `Evaluation: ${run.evaluationStatus.toUpperCase()}`, {
        fontSize: 9,
        color: run.evaluationStatus === 'pass' ? [0, 128, 0] : [200, 0, 0],
      });
      if (run.evaluationReason) {
        addText(config, `Reason: ${run.evaluationReason}`, {
          fontSize: 9,
          indent: 10,
        });
      }
    }

    // Error
    if (run.error) {
      config.yPosition += config.lineHeight * 0.5;
      addText(config, 'Error:', {
        fontSize: 9,
        bold: true,
        color: [200, 0, 0],
      });
      addText(config, run.error, {
        fontSize: 8,
        color: [150, 0, 0],
        indent: 10,
      });
    }

    // Output (for custom automations)
    if (run.output) {
      config.yPosition += config.lineHeight * 0.5;
      addText(config, 'Output:', { fontSize: 9, bold: true });
      const outputText = formatJsonForPDF(run.output);
      addMonospaceText(config, outputText);
    }

    // Logs
    if (run.logs) {
      config.yPosition += config.lineHeight * 0.5;
      addText(config, 'Logs:', { fontSize: 9, bold: true });
      const logsText = formatJsonForPDF(run.logs);
      addMonospaceText(config, logsText);
    }

    // Results (for app automations)
    if (run.results.length > 0) {
      config.yPosition += config.lineHeight * 0.5;
      addText(config, `Results (${run.results.length}):`, {
        fontSize: 9,
        bold: true,
      });

      for (const result of run.results) {
        checkPageBreak(config, config.lineHeight * 5);

        const resultIcon = result.passed ? '[PASS]' : '[FAIL]';
        const resultColor: [number, number, number] = result.passed
          ? [0, 100, 0]
          : [180, 0, 0];

        addText(config, `${resultIcon} ${result.title}`, {
          fontSize: 9,
          bold: true,
          color: resultColor,
          indent: 10,
        });

        addText(
          config,
          `Resource: ${result.resourceType}/${result.resourceId}`,
          {
            fontSize: 8,
            indent: 15,
          },
        );

        if (result.description) {
          addText(config, result.description, { fontSize: 8, indent: 15 });
        }

        if (result.severity) {
          addText(config, `Severity: ${result.severity}`, {
            fontSize: 8,
            indent: 15,
          });
        }

        if (result.remediation) {
          addText(config, `Remediation: ${result.remediation}`, {
            fontSize: 8,
            indent: 15,
          });
        }

        if (result.evidence) {
          addText(config, 'Evidence:', { fontSize: 8, bold: true, indent: 15 });
          const evidenceText = formatJsonForPDF(result.evidence);
          addMonospaceText(config, evidenceText, 20);
        }

        config.yPosition += config.lineHeight * 0.5;
      }
    }

    config.yPosition += config.lineHeight;
    addSeparator(config);
  }

  addPageNumbers(config);

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Add monospace text block for JSON/logs
 */
function addMonospaceText(
  config: PDFConfig,
  text: string,
  indent: number = 10,
): void {
  const monospaceLineHeight = 4;
  const textWidth = config.contentWidth - indent - 4;

  config.doc.setFontSize(7);
  config.doc.setFont('courier', 'normal');
  config.doc.setTextColor(60, 60, 60);

  const lines = text.split('\n');

  for (const line of lines) {
    const wrappedLines = config.doc.splitTextToSize(
      line,
      textWidth,
    ) as string[];

    for (const wrappedLine of wrappedLines) {
      checkPageBreak(config, monospaceLineHeight + 2);
      config.doc.setFillColor(245, 245, 245);
      config.doc.rect(
        config.margin + indent,
        config.yPosition - 2,
        textWidth + 2,
        monospaceLineHeight + 2,
        'F',
      );
      config.doc.text(
        cleanTextForPDF(wrappedLine),
        config.margin + indent + 2,
        config.yPosition + 2,
      );
      config.yPosition += monospaceLineHeight;
    }
  }

  config.yPosition += config.lineHeight * 0.5;

  // Reset font
  config.doc.setFont('helvetica', 'normal');
  config.doc.setFontSize(config.defaultFontSize);
}

/**
 * Get color for status display
 */
function getStatusColor(
  status: string,
  hasFailed: boolean,
): [number, number, number] {
  if (status === 'failed' || hasFailed) {
    return [180, 0, 0];
  }
  if (status === 'success') {
    return [0, 100, 0];
  }
  if (status === 'running') {
    return [0, 100, 180];
  }
  return [100, 100, 100];
}

/**
 * Generate a summary PDF for a task with all automations
 */
export function generateTaskSummaryPDF(summary: TaskEvidenceSummary): Buffer {
  const doc = new jsPDF();
  const config: PDFConfig = {
    doc,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    margin: 20,
    contentWidth: doc.internal.pageSize.getWidth() - 40,
    lineHeight: 6,
    defaultFontSize: 10,
    yPosition: 20,
  };

  // Header
  addText(config, summary.organizationName, { fontSize: 16, bold: true });
  config.yPosition += config.lineHeight;
  addText(config, 'Evidence Export Summary', { fontSize: 14 });
  config.yPosition += config.lineHeight;
  addText(config, `Task: ${summary.taskTitle}`, { fontSize: 12 });
  config.yPosition += config.lineHeight * 0.5;
  addText(config, `Exported: ${format(summary.exportedAt, 'PPpp')}`, {
    fontSize: 9,
    color: [128, 128, 128],
  });

  addSeparator(config);

  // Automations overview
  addSectionHeader(config, 'Automations Overview');

  const appAutomations = summary.automations.filter(
    (a) => a.type === 'app_automation',
  );
  const customAutomations = summary.automations.filter(
    (a) => a.type === 'custom_automation',
  );

  addText(config, `Total Automations: ${summary.automations.length}`);
  addText(config, `App Automations: ${appAutomations.length}`);
  addText(config, `Custom Automations: ${customAutomations.length}`);

  config.yPosition += config.lineHeight;

  // List each automation with summary
  for (const automation of summary.automations) {
    checkPageBreak(config, config.lineHeight * 4);

    const typeLabel =
      automation.type === 'app_automation' ? '[APP]' : '[CUSTOM]';

    addText(config, `${typeLabel} ${automation.name}`, {
      fontSize: 10,
      bold: true,
    });
    addText(
      config,
      `  Runs: ${automation.totalRuns} | Passed: ${automation.successfulRuns} | Failed: ${automation.failedRuns}`,
      { fontSize: 9 },
    );

    if (automation.latestRunAt) {
      addText(config, `  Last Run: ${format(automation.latestRunAt, 'PPpp')}`, {
        fontSize: 9,
        color: [100, 100, 100],
      });
    }

    config.yPosition += config.lineHeight * 0.5;
  }

  addPageNumbers(config);

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Sanitize filename for safe file system usage
 * Falls back to 'export' if name contains only non-ASCII characters
 */
export function sanitizeFilename(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  // Fallback for names with only non-ASCII characters (e.g., Japanese, Arabic)
  return sanitized || 'export';
}
