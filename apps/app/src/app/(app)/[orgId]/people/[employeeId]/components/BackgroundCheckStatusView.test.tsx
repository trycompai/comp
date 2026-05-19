import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackgroundCheckStatusView } from './BackgroundCheckStatusView';
import type { BackgroundCheckRecord } from './backgroundCheckTypes';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const writeText = vi.fn();

function record(overrides: Partial<BackgroundCheckRecord> = {}): BackgroundCheckRecord {
  return {
    id: 'bcr_1',
    employeeName: 'Quinn Lee',
    employeeEmail: 'quinn@example.com',
    requesterNotes: null,
    candidateUrl: 'https://identity.trycomp.ai/cand_1',
    status: 'invited',
    identityStatus: 'passed',
    employmentStatus: 'verified',
    referenceStatus: 'partially_verified',
    rightToWorkStatus: 'extracted',
    adjudicationStatus: 'candidate_available',
    lastSyncedAt: '2026-04-29T13:06:31.000Z',
    reportSnapshot: null,
    reportSyncedAt: null,
    ...overrides,
  };
}

describe('BackgroundCheckStatusView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  it('copies the candidate link with a toast', async () => {
    render(<BackgroundCheckStatusView backgroundCheck={record()} />);

    fireEvent.click(screen.getByRole('button', { name: /copy candidate link/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('https://identity.trycomp.ai/cand_1');
      expect(toast.success).toHaveBeenCalledWith('Candidate link copied');
    });
    expect(screen.queryByRole('link', { name: /candidate link/i })).not.toBeInTheDocument();
  });

  it('shows a toast when copying the candidate link fails', async () => {
    writeText.mockRejectedValueOnce(new Error('blocked'));
    render(<BackgroundCheckStatusView backgroundCheck={record()} />);

    fireEvent.click(screen.getByRole('button', { name: /copy candidate link/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Could not copy candidate link');
    });
  });

  it('renders completed report sections from the stored snapshot', () => {
    render(
      <BackgroundCheckStatusView
        backgroundCheck={record({
          status: 'completed_with_flags',
          adjudicationStatus: 'draft',
          reportSnapshot: {
            identityVerification: { status: 'passed', summary: 'Identity matched' },
            rightToWork: { status: 'extracted' },
            employment: [{ employer: 'Analytical Engine Ltd' }],
            references: [{ name: 'Grace Hopper' }],
            backgroundResearchFindings: { status: 'not_found', summary: 'No adverse media found' },
            report: { adjudication: { status: 'draft', flags: ['Manual review required'] } },
            shareableSummary: {
              overview: 'The background check is completed with flags.',
              keyFindings: ['Identity passed', 'References verified'],
              linkedKeyFindings: [
                {
                  text: 'Public research supports the employment connection.',
                  sourceUrl: 'https://example.com/source',
                  sourceLabel: 'Company profile',
                  entityType: 'company',
                },
              ],
              sources: [
                {
                  label: 'Company profile',
                  url: 'https://example.com/source',
                  entityType: 'company',
                  source: 'linkedin',
                },
              ],
              flags: ['Name mismatch needs review'],
              limitations: ['Public source data can change.'],
              recommendedNextSteps: [],
            },
            auditEvents: [{ eventType: 'background_check.completed', createdAt: 1777464000000 }],
          },
          reportSyncedAt: '2026-04-29T13:08:31.000Z',
        })}
      />,
    );

    expect(screen.getByText('Complete with flags')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copy candidate link/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Adjudication: Draft/i)).not.toBeInTheDocument();
    expect(screen.getByText('Identity & liveness')).toBeInTheDocument();
    expect(screen.getByText('Shareable summary')).toBeInTheDocument();
    expect(screen.getByText('The background check is completed with flags.')).toBeInTheDocument();
    expect(
      screen.getByText('Public research supports the employment connection.'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Company profile' })).toHaveLength(2);
    expect(screen.getByText('Name mismatch needs review')).toBeInTheDocument();
    expect(screen.getByText('Public source data can change.')).toBeInTheDocument();
    expect(screen.getByText('Employment verification')).toBeInTheDocument();
    expect(screen.getByText('Public-source research')).toBeInTheDocument();
    expect(screen.queryByText(/Right-to-work/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Right to work/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Not Found')).not.toBeInTheDocument();
    expect(screen.queryByText('Adjudication and flags')).not.toBeInTheDocument();
    expect(screen.queryByText(/Manual review required/)).not.toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('falls back to the external markdown report for older snapshots', () => {
    render(
      <BackgroundCheckStatusView
        backgroundCheck={record({
          status: 'completed',
          reportSnapshot: {
            externalReport: {
              format: 'markdown',
              markdown: '## Candidate summary\n\n- Identity passed\n- References verified',
              generatedAt: 1777464000000,
              generatedBy: 'ai',
              model: 'gpt-test',
              generationStatus: 'generated',
            },
          },
          reportSyncedAt: '2026-04-29T13:08:31.000Z',
        })}
      />,
    );

    expect(screen.getByText('External report')).toBeInTheDocument();
    expect(screen.getByText('Candidate summary')).toBeInTheDocument();
    expect(screen.getByText('Generated')).toBeInTheDocument();
  });

  it('renders shareable summaries from nested identity report snapshots', () => {
    render(
      <BackgroundCheckStatusView
        backgroundCheck={record({
          status: 'completed_with_flags',
          reportSnapshot: {
            report: {
              report: {
                shareableSummary: {
                  overview: 'Nested summary is ready.',
                  keyFindings: ['Nested identity passed'],
                  linkedKeyFindings: [],
                  sources: [],
                  flags: [],
                  limitations: [],
                  recommendedNextSteps: [],
                },
              },
            },
          },
          reportSyncedAt: '2026-04-29T13:08:31.000Z',
        })}
      />,
    );

    expect(screen.getByText('Shareable summary')).toBeInTheDocument();
    expect(screen.getByText('Nested summary is ready.')).toBeInTheDocument();
    expect(screen.getByText('Nested identity passed')).toBeInTheDocument();
  });

  it('renders linked-only generated shareable summaries', () => {
    render(
      <BackgroundCheckStatusView
        backgroundCheck={record({
          status: 'completed_with_flags',
          reportSnapshot: {
            shareableSummary: {
              overview:
                'Background check completed. Identity and employment were verified, and two references were verified.',
              linkedKeyFindings: [
                {
                  text: 'Public research found Lewis Carhart associated with Comp AI as CEO and Co-Founder.',
                  sourceUrl: 'https://www.linkedin.com/in/lewiscarhart',
                  sourceLabel: 'LinkedIn - Lewis Carhart',
                  entityType: 'candidate',
                },
              ],
              sources: [
                {
                  label: 'LinkedIn - Lewis Carhart',
                  url: 'https://www.linkedin.com/in/lewiscarhart',
                  entityType: 'candidate',
                  source: 'firecrawl',
                },
              ],
              generationStatus: 'generated',
              flags: [],
              limitations: [],
              recommendedNextSteps: [],
            },
          },
          reportSyncedAt: '2026-04-29T13:08:31.000Z',
        })}
      />,
    );

    expect(screen.getByText('Shareable summary')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Background check completed. Identity and employment were verified, and two references were verified.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Public research found Lewis Carhart associated with Comp AI as CEO and Co-Founder.',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'LinkedIn - Lewis Carhart' })).toHaveLength(2);
    expect(screen.queryByText('Generated')).not.toBeInTheDocument();
  });

  it('copies the shareable summary as plain text', async () => {
    render(
      <BackgroundCheckStatusView
        backgroundCheck={record({
          status: 'completed_with_flags',
          reportSnapshot: {
            shareableSummary: {
              overview: 'Plain text summary.',
              keyFindings: ['Identity passed'],
              linkedKeyFindings: [
                {
                  text: 'Employment verified.',
                  sourceUrl: 'https://example.com/source',
                  sourceLabel: 'Company profile',
                  entityType: 'company',
                },
              ],
              sources: [{ label: 'Company profile', url: 'https://example.com/source' }],
              flags: ['Review name mismatch'],
              limitations: ['Public data can change.'],
              recommendedNextSteps: [],
            },
          },
          reportSyncedAt: '2026-04-29T13:08:31.000Z',
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining('SHAREABLE SUMMARY\n\nPlain text summary.'),
      );
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('KEY FINDINGS'));
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining('Employment verified. (Company profile: https://example.com/source)'),
      );
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining('SOURCES\n- Company profile: https://example.com/source'),
      );
      expect(toast.success).toHaveBeenCalledWith('Summary copied');
    });
  });

  it('renders a syncing state when a completed report snapshot is missing', () => {
    render(<BackgroundCheckStatusView backgroundCheck={record({ status: 'completed' })} />);

    expect(screen.getByText('Report is still syncing')).toBeInTheDocument();
  });

  it('does not show report sections for in-progress checks', () => {
    render(<BackgroundCheckStatusView backgroundCheck={record({ status: 'in_progress' })} />);

    expect(screen.queryByText('Report')).not.toBeInTheDocument();
    expect(screen.queryByText('Identity verification')).not.toBeInTheDocument();
  });
});
