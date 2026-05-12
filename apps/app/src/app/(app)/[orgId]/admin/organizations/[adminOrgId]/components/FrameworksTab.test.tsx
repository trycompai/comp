import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { FrameworksTab } from './FrameworksTab';

const frameworkResponse = {
  frameworks: [
    {
      id: 'fi_soc2',
      framework: {
        id: 'fw_soc2',
        name: 'SOC 2',
        description: 'Security framework',
        version: '2024',
        visible: true,
      },
      customFramework: null,
    },
  ],
  availableFrameworks: [
    {
      id: 'fw_iso',
      name: 'ISO 27001',
      description: 'Security standard',
      version: '2022',
      visible: true,
    },
  ],
};

describe('FrameworksTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: frameworkResponse });
    mockPost.mockResolvedValue({ data: { success: true } });
    mockDelete.mockResolvedValue({ data: { success: true } });
  });

  it('loads admin frameworks endpoint', async () => {
    render(<FrameworksTab orgId="org_1" />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/v1/admin/organizations/org_1/frameworks');
    });
  });

  it('renders active and available frameworks', async () => {
    render(<FrameworksTab orgId="org_1" />);

    await waitFor(() => {
      expect(screen.getAllByText('SOC 2').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('ISO 27001').length).toBeGreaterThan(0);
    expect(screen.getByText(/active frameworks \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/available frameworks \(1\)/i)).toBeInTheDocument();
  });

  it('confirms before adding a framework', async () => {
    render(<FrameworksTab orgId="org_1" />);

    await waitFor(() => {
      expect(screen.getAllByText('ISO 27001').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole('button', { name: /^add$/i })[0]);

    const confirmButton = screen.getByRole('button', {
      name: /yes, add framework/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/v1/admin/organizations/org_1/frameworks', {
        frameworkIds: ['fw_iso'],
      });
    });
  });

  it('confirms before removing a framework', async () => {
    render(<FrameworksTab orgId="org_1" />);

    await waitFor(() => {
      expect(screen.getAllByText('SOC 2').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole('button', { name: /remove/i })[0]);

    const confirmButton = screen.getByRole('button', {
      name: /yes, remove framework/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('/v1/admin/organizations/org_1/frameworks/fi_soc2');
    });
  });
});
