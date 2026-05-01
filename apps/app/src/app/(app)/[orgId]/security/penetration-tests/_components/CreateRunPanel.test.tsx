import type { PentestCreateRequest } from '@/lib/security/penetration-tests-client';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateRunPanel } from './CreateRunPanel';

const navigationMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigationMock.push }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

describe('CreateRunPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes users without allowance to billing even when required fields are empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => ({ id: 'run_1' }));

    render(<CreateRunPanel orgId="org_1" balance={0} planRequired onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /choose plan/i }));

    await waitFor(() => {
      expect(navigationMock.push).toHaveBeenCalledWith(
        '/org_1/settings/billing/add-ons/penetration-tests',
      );
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('defaults to Standard and submits Standard profile fields', async () => {
    const user = userEvent.setup();
    let submittedPayload: PentestCreateRequest | undefined;
    const onSubmit = vi.fn(async (payload: PentestCreateRequest) => {
      submittedPayload = payload;
      return { id: 'run_standard' };
    });

    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/target url/i), 'app.example.com');
    await user.click(screen.getByRole('button', { name: /start scan/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          targetUrl: 'https://app.example.com/',
          scanDepth: 'standard',
          evidenceLevel: 'safe_proof',
        }),
      );
    });
    expect(submittedPayload).toBeDefined();
    if (!submittedPayload) throw new Error('Expected submit payload');
    expect(submittedPayload.checks).toContain('discovery');
    expect(submittedPayload.checks).toContain('xss');
    expect(submittedPayload.checks).not.toContain('race_conditions');
    expect(submittedPayload.checks).not.toContain('business_logic');
  });

  it('shows Quick after clicking the Quick preset', async () => {
    const user = userEvent.setup();

    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={vi.fn()} />);

    expect(screen.getByText('Standard · 30-90 min')).toBeInTheDocument();

    await user.click(screen.getByText('Quick'));

    expect(screen.getByText('Quick · 5-15 min')).toBeInTheDocument();
  });

  it('shows Custom when advanced settings differ from the selected profile', async () => {
    const user = userEvent.setup();

    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={vi.fn()} />);

    await user.click(screen.getByText('Quick'));
    await user.click(screen.getByRole('button', { name: /customize scan/i }));
    await user.click(screen.getByLabelText(/^xss$/i));

    expect(screen.getByText('Custom · 11 min-25 min')).toBeInTheDocument();
    expect(screen.queryByText(/based on/i)).not.toBeInTheDocument();
  });

  it('resolves to Standard when manual settings match Standard defaults after starting from Quick', async () => {
    const user = userEvent.setup();
    let submittedPayload: PentestCreateRequest | undefined;
    const onSubmit = vi.fn(async (payload: PentestCreateRequest) => {
      submittedPayload = payload;
      return { id: 'run_standard' };
    });

    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={onSubmit} />);

    await user.click(screen.getByText('Quick'));
    await user.click(screen.getByRole('button', { name: /customize scan/i }));
    await user.click(validationLevel().getByLabelText(/safe proof/i));
    await user.click(screen.getByLabelText(/^xss$/i));
    await user.click(screen.getByLabelText(/^injection$/i));
    await user.click(screen.getByLabelText(/^authentication$/i));
    await user.click(screen.getByLabelText(/^authorization$/i));
    await user.click(screen.getByLabelText(/idor \/ bola/i));
    await user.click(screen.getByLabelText(/ssrf \/ xxe/i));
    await user.click(screen.getByLabelText(/^csrf$/i));

    expect(screen.getByText('Standard · 30-90 min')).toBeInTheDocument();
    expect(screen.queryByText(/based on/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/target url/i), 'app.example.com');
    await user.click(screen.getByRole('button', { name: /start scan/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    expect(submittedPayload?.scanDepth).toBe('standard');
    expect(submittedPayload?.evidenceLevel).toBe('safe_proof');
  });

  it('shows Deep when settings match Deep defaults', async () => {
    const user = userEvent.setup();

    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={vi.fn()} />);

    await user.click(screen.getByText('Deep'));

    expect(screen.getByText('Deep · 2-8+ hours')).toBeInTheDocument();
  });

  it('updates the custom runtime estimate when evidence changes', async () => {
    const user = userEvent.setup();

    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={vi.fn()} />);

    await user.click(screen.getByText('Quick'));
    await user.click(screen.getByRole('button', { name: /customize scan/i }));
    await user.click(screen.getByLabelText(/^xss$/i));

    expect(screen.getByText('Custom · 11 min-25 min')).toBeInTheDocument();

    await user.click(validationLevel().getByLabelText(/safe proof/i));

    expect(screen.getByText('Custom · 17 min-38 min')).toBeInTheDocument();
  });

  it('does not show an inverted runtime range when no checks are selected', async () => {
    const user = userEvent.setup();

    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={vi.fn()} />);

    await user.click(screen.getByText('Quick'));
    await user.click(screen.getByRole('button', { name: /customize scan/i }));
    await user.click(screen.getByLabelText(/secrets & info disclosure/i));
    await user.click(screen.getByLabelText(/technology config/i));
    await user.click(screen.getByLabelText(/^discovery$/i));

    expect(screen.getByText('Custom · 5 min-5 min')).toBeInTheDocument();
  });

  it('labels the optional repository field for assistive technology', () => {
    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/repository/i)).toBeInTheDocument();
  });

  it('uses design-system radio styling for evidence options', async () => {
    const user = userEvent.setup();
    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /customize scan/i }));

    expect(validationLevel().getByLabelText(/safe proof/i).closest('label')).toHaveClass(
      'has-[[data-checked]]:border-primary',
      'has-[[data-checked]]:bg-primary/5',
      'has-[[data-checked]]:text-primary',
    );
  });

  it('auto-enables Discovery when selecting a non-discovery check', async () => {
    const user = userEvent.setup();

    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={vi.fn()} />);

    await user.click(screen.getByText('Quick'));
    await user.click(screen.getByRole('button', { name: /customize scan/i }));
    await user.click(screen.getByLabelText(/secrets & info disclosure/i));
    await user.click(screen.getByLabelText(/technology config/i));
    await user.click(screen.getByLabelText(/^discovery$/i));
    await user.click(screen.getByLabelText(/^xss$/i));

    expect(screen.getByLabelText(/^discovery$/i)).toBeChecked();
  });

  it('shows report-only helper text', async () => {
    const user = userEvent.setup();

    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={vi.fn()} />);

    await user.click(screen.getByText('Quick'));
    await user.click(screen.getByRole('button', { name: /customize scan/i }));

    expect(
      screen.getByText(/fastest and lowest risk/i),
    ).toBeInTheDocument();
  });

  it('shows validation level choices and selected helper copy', async () => {
    const user = userEvent.setup();

    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={vi.fn()} />);

    expect(screen.getByText('Customize scan')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /customize scan/i }));

    expect(screen.getByText('Validation level')).toBeInTheDocument();
    expect(validationLevel().getByLabelText(/report only/i)).toBeInTheDocument();
    expect(validationLevel().getByLabelText(/safe proof/i)).toBeInTheDocument();
    expect(validationLevel().getByLabelText(/impact proof/i)).toBeInTheDocument();

    await user.click(validationLevel().getByLabelText(/report only/i));
    expect(screen.getByText(/fastest and lowest risk/i)).toBeInTheDocument();

    await user.click(validationLevel().getByLabelText(/safe proof/i));
    expect(screen.getByText(/balanced validation/i)).toBeInTheDocument();

    await user.click(validationLevel().getByLabelText(/impact proof/i));
    expect(screen.getByText(/highest confidence, longer runtime/i)).toBeInTheDocument();
  });

  it('keeps preset cards concise without validation metadata', () => {
    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={vi.fn()} />);

    expect(screen.queryByText('Report only · 3 checks')).not.toBeInTheDocument();
    expect(screen.queryByText('Safe proof · 10 checks')).not.toBeInTheDocument();
    expect(screen.queryByText('Impact proof · 12 checks')).not.toBeInTheDocument();
  });

  it('requires confirmation for Deep profile before submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => ({ id: 'run_deep' }));

    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/target url/i), 'app.example.com');
    await user.click(screen.getByText('Deep'));
    await user.click(screen.getByRole('button', { name: /start scan/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/confirm scan intensity/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /start scan/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          scanDepth: 'deep',
          evidenceLevel: 'impact_proof',
        }),
      );
    });
  });
});

function validationLevel() {
  return within(screen.getByRole('radiogroup', { name: /validation level/i }));
}
