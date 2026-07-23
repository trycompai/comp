import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RiskTreatmentTable, type RiskTreatmentTableRow } from './RiskTreatmentTable';

const row = (overrides: Partial<RiskTreatmentTableRow> = {}): RiskTreatmentTableRow => ({
  key: 'R-01',
  title: 'Unauthorized data sharing',
  category: 'Governance',
  inherentLevel: 'Medium',
  treatment: 'Mitigate',
  controls: 'DLP settings; awareness training.',
  ownerName: 'Jane Doe',
  residualLevel: 'Low',
  acceptance: 'Accepted 2026-04-15 (Jane Doe)',
  acceptanceState: 'accepted',
  status: 'Open',
  ...overrides,
});

describe('RiskTreatmentTable', () => {
  it('renders one row per risk with the acceptance detail', () => {
    render(
      <RiskTreatmentTable
        keyHeader="Ref"
        showTitle
        rows={[row()]}
        emptyText="No risks recorded."
      />,
    );

    expect(screen.getByText('R-01')).toBeInTheDocument();
    expect(screen.getByText('Unauthorized data sharing')).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Accepted 2026-04-15 (Jane Doe)')).toBeInTheDocument();
  });

  it('renders awaiting and stale acceptance badges', () => {
    render(
      <RiskTreatmentTable
        keyHeader="Vendor"
        showTitle={false}
        rows={[
          row({ key: 'AWS', acceptanceState: 'awaiting', acceptance: 'Awaiting acceptance' }),
          row({
            key: 'Google Workspace',
            acceptanceState: 'stale',
            acceptance: 'Stale — accepted 2026-04-15; residual has changed since',
          }),
        ]}
        emptyText="No vendors recorded."
      />,
    );

    expect(screen.getByText('Awaiting acceptance')).toBeInTheDocument();
    expect(screen.getByText('Stale')).toBeInTheDocument();
    // The stale row keeps the prior acceptance detail visible under the badge.
    expect(screen.getByText(/residual has changed since/)).toBeInTheDocument();
  });

  it('hides the description column when showTitle is false', () => {
    render(
      <RiskTreatmentTable
        keyHeader="Vendor"
        showTitle={false}
        rows={[row({ key: 'AWS' })]}
        emptyText="No vendors recorded."
      />,
    );

    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });

  it('renders the empty state when there are no rows', () => {
    render(
      <RiskTreatmentTable keyHeader="Ref" showTitle rows={[]} emptyText="No risks recorded." />,
    );

    expect(screen.getByText('No risks recorded.')).toBeInTheDocument();
  });
});
