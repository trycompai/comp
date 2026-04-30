import { apiClient } from '@/lib/api-client';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomBackgroundCheckUpload } from './CustomBackgroundCheckUpload';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('CustomBackgroundCheckUpload', () => {
  const onUploaded = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onUploaded.mockResolvedValue(undefined);
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        id: 'bcr_custom',
        employeeName: 'Ada Lovelace',
        employeeEmail: 'ada@work.example',
        requesterNotes: null,
        candidateUrl: null,
        status: 'completed',
        identityStatus: null,
        employmentStatus: null,
        referenceStatus: null,
        rightToWorkStatus: null,
        adjudicationStatus: null,
        lastSyncedAt: '2026-04-29T12:00:00.000Z',
        reportSnapshot: null,
        reportSyncedAt: null,
      },
      status: 200,
    });
  });

  it('uploads a custom background check without requiring billing', async () => {
    const user = userEvent.setup();
    render(
      <CustomBackgroundCheckUpload
        canRequest
        employeeEmail="ada@work.example"
        employeeId="mem_1"
        employeeName="Ada Lovelace"
        organizationId="org_1"
        onUploaded={onUploaded}
      />,
    );

    await user.upload(
      screen.getByLabelText('Background check file'),
      new File(['custom report'], 'background-check.pdf', { type: 'application/pdf' }),
    );
    await user.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/v1/people/mem_1/background-check/custom',
        expect.objectContaining({
          employeeName: 'Ada Lovelace',
          employeeEmail: 'ada@work.example',
          fileName: 'background-check.pdf',
          fileType: 'application/pdf',
        }),
        'org_1',
      );
    });
    expect(apiClient.post).not.toHaveBeenCalledWith(
      '/v1/background-check-billing/setup-session',
      expect.anything(),
      'org_1',
    );
    expect(toast.success).toHaveBeenCalledWith('Custom background check attached');
    expect(onUploaded).toHaveBeenCalledWith(expect.objectContaining({ id: 'bcr_custom' }));
  });
});
