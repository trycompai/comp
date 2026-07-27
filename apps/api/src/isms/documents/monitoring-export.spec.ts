import { buildExportSections } from './registry';
import { generateIsmsExportFile } from '../utils/export-generator';
import { buildExportMetadata } from '../utils/export-metadata';
import { SEED_METRIC_DEFINITIONS } from './monitoring-defaults';
import type { DocumentExportInput, MetricExportRow } from './types';

/**
 * End-to-end render check for the Monitoring document (9.1): the section
 * builder + both real renderers (jsPDF, docx) must produce non-empty files —
 * including the widest table in the ISMS set (7 columns). Guards the whole
 * export pipeline for the new type without needing a live org.
 */
function metricRow(index: number): MetricExportRow {
  const seed = SEED_METRIC_DEFINITIONS[index];
  return {
    metricKey: seed.metricKey,
    name: seed.name,
    whatIsMeasured: seed.whatIsMeasured,
    method: seed.method,
    cadence: seed.cadence === 'monthly' ? 'Monthly' : 'Quarterly',
    monitorName: 'Security & Privacy Owner (Alex Petrisor)',
    analyzeName: 'Security & Privacy Owner (Alex Petrisor)',
    target: seed.target,
    currentValue: index % 2 === 0 ? '99.95% (July 2026)' : '—',
  };
}

const INPUT: DocumentExportInput = {
  contextIssues: [],
  interestedParties: [],
  requirements: [],
  objectives: [],
  narrative: null,
  // All nine seeded metrics: the realistic full-width worst case.
  metrics: SEED_METRIC_DEFINITIONS.map((_, index) => metricRow(index)),
};

function metadata() {
  return buildExportMetadata({
    type: 'monitoring',
    title: 'Monitoring, Measurement, Analysis and Evaluation',
    frameworkName: 'ISO 27001',
    version: 1,
    status: 'approved',
    preparedBy: 'Comp AI',
    owner: null,
    approverName: 'Raoul Plickat',
    approvedAt: new Date('2026-05-26T00:00:00.000Z'),
    declinedAt: null,
    organizationName: 'Pressmaster AI Inc.',
    primaryColor: '#004D3D',
  });
}

describe('Monitoring document export', () => {
  const sections = buildExportSections({ type: 'monitoring', input: INPUT });

  it('renders a non-empty PDF with the full nine-metric table', async () => {
    const result = await generateIsmsExportFile({
      sections,
      metadata: metadata(),
      format: 'pdf',
    });
    expect(result.fileBuffer.length).toBeGreaterThan(0);
    expect(result.mimeType).toBe('application/pdf');
  });

  it('renders a non-empty DOCX', async () => {
    const result = await generateIsmsExportFile({
      sections,
      metadata: metadata(),
      format: 'docx',
    });
    expect(result.fileBuffer.length).toBeGreaterThan(0);
  });
});
