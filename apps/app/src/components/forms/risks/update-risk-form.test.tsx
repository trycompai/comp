import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPatch = vi.fn();

vi.mock('@/hooks/use-api', () => ({
  useApi: () => ({
    patch: mockPatch,
    organizationId: 'org_123',
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from 'sonner';
import { UpdateRiskForm } from './update-risk-form';

const makeRisk = (overrides = {}) => ({
  id: 'risk_1',
  title: 'Existing Risk',
  description: 'Risk description',
  category: 'operations',
  department: 'admin',
  status: 'open',
  assigneeId: null,
  likelihood: 'very_unlikely',
  impact: 'insignificant',
  residualLikelihood: 'very_unlikely',
  residualImpact: 'insignificant',
  organizationId: 'org_123',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('UpdateRiskForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with existing risk data', () => {
    render(<UpdateRiskForm risk={makeRisk() as any} />);
    expect(screen.getByDisplayValue('Existing Risk')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Risk description')).toBeInTheDocument();
  });

  it('calls api.patch on submit and shows success toast', async () => {
    mockPatch.mockResolvedValue({ data: {}, status: 200 });
    const onSuccess = vi.fn();

    render(<UpdateRiskForm risk={makeRisk() as any} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByDisplayValue('Existing Risk'), {
      target: { value: 'Updated Risk' },
    });

    // The form has a nested button structure - submit the form directly
    const form = screen.getByDisplayValue('Updated Risk').closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        '/v1/risks/risk_1',
        expect.objectContaining({
          title: 'Updated Risk',
        }),
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Risk updated successfully');
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows error toast on api failure', async () => {
    mockPatch.mockResolvedValue({ error: 'Forbidden', status: 403 });

    render(<UpdateRiskForm risk={makeRisk() as any} />);

    fireEvent.change(screen.getByDisplayValue('Existing Risk'), {
      target: { value: 'Updated Risk' },
    });

    const form = screen.getByDisplayValue('Updated Risk').closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update risk');
    });
  });
});
