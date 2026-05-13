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

async function confirmAuthorization(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByText('I own this target or have written authorization to test it.'),
  );
}

function checkInput(label: RegExp) {
  return screen.getByLabelText(label, { selector: 'input' });
}

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
    await confirmAuthorization(user);
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
    await user.click(checkInput(/^xss$/i));

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
    await user.click(validationLevel().getByLabelText(/safe proof/i, { selector: 'input' }));
    await user.click(checkInput(/^xss$/i));
    await user.click(checkInput(/^injection$/i));
    await user.click(checkInput(/^authentication$/i));
    await user.click(checkInput(/^authorization$/i));
    await user.click(checkInput(/^idor \/ bola$/i));
    await user.click(checkInput(/^ssrf \/ xxe$/i));
    await user.click(checkInput(/^csrf$/i));

    expect(screen.getByText('Standard · 30-90 min')).toBeInTheDocument();
    expect(screen.queryByText(/based on/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/target url/i), 'app.example.com');
    await confirmAuthorization(user);
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
    await user.click(checkInput(/^xss$/i));

    expect(screen.getByText('Custom · 11 min-25 min')).toBeInTheDocument();

    await user.click(validationLevel().getByLabelText(/safe proof/i, { selector: 'input' }));

    expect(screen.getByText('Custom · 17 min-38 min')).toBeInTheDocument();
  });

  it('does not show an inverted runtime range when no checks are selected', async () => {
    const user = userEvent.setup();

    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={vi.fn()} />);

    await user.click(screen.getByText('Quick'));
    await user.click(checkInput(/^secrets & info disclosure$/i));
    await user.click(checkInput(/^technology config$/i));
    await user.click(checkInput(/^discovery$/i));

    expect(screen.getByText('Custom · 5 min-5 min')).toBeInTheDocument();
  });

  it('labels the optional repository field for assistive technology', () => {
    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/repository/i)).toBeInTheDocument();
  });

  it('uses design-system radio styling for evidence options', () => {
    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={vi.fn()} />);

    expect(validationLevel().getByLabelText(/safe proof/i, { selector: 'input' }).closest('label')).toHaveClass(
      'has-[[data-checked]]:border-primary',
      'has-[[data-checked]]:bg-primary/5',
      'has-[[data-checked]]:text-primary',
    );
  });

  it('auto-enables Discovery when selecting a non-discovery check', async () => {
    const user = userEvent.setup();

    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={vi.fn()} />);

    await user.click(screen.getByText('Quick'));
    await user.click(checkInput(/^secrets & info disclosure$/i));
    await user.click(checkInput(/^technology config$/i));
    await user.click(checkInput(/^discovery$/i));
    await user.click(checkInput(/^xss$/i));

    expect(checkInput(/^discovery$/i)).toBeChecked();
  });

  it('shows report-only helper text when report_only is selected', async () => {
    const user = userEvent.setup();

    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={vi.fn()} />);

    await user.click(screen.getByText('Quick'));

    expect(
      screen.getByText(/findings are reported without exploitation/i),
    ).toBeInTheDocument();
  });

  it('renders the Scan coverage panel open by default and exposes validation level options', async () => {
    const user = userEvent.setup();

    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={vi.fn()} />);

    expect(screen.getByText('Scan coverage')).toBeInTheDocument();
    expect(screen.getByText('Validation level')).toBeInTheDocument();
    expect(validationLevel().getByLabelText(/report only/i, { selector: 'input' })).toBeInTheDocument();
    expect(validationLevel().getByLabelText(/safe proof/i, { selector: 'input' })).toBeInTheDocument();
    expect(validationLevel().getByLabelText(/impact proof/i, { selector: 'input' })).toBeInTheDocument();

    await user.click(validationLevel().getByLabelText(/report only/i, { selector: 'input' }));
    expect(
      screen.getByText(/findings are reported without exploitation/i),
    ).toBeInTheDocument();

    await user.click(validationLevel().getByLabelText(/safe proof/i, { selector: 'input' }));
    expect(
      screen.getByText(/findings are validated with non-destructive proofs/i),
    ).toBeInTheDocument();

    await user.click(validationLevel().getByLabelText(/impact proof/i, { selector: 'input' }));
    expect(
      screen.getByText(/findings are validated with active exploitation/i),
    ).toBeInTheDocument();
  });

  it('keeps preset cards concise without validation metadata', () => {
    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={vi.fn()} />);

    expect(screen.queryByText('Report only · 3 checks')).not.toBeInTheDocument();
    expect(screen.queryByText('Safe proof · 10 checks')).not.toBeInTheDocument();
    expect(screen.queryByText('Impact proof · 12 checks')).not.toBeInTheDocument();
  });

  it('blocks submit when authorization is not confirmed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => ({ id: 'never' }));

    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/target url/i), 'app.example.com');
    await user.click(screen.getByRole('button', { name: /start scan/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/confirm you own or are authorized to test this target/i),
      ).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires confirmation for impact-proof validation before submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => ({ id: 'run_deep' }));

    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/target url/i), 'app.example.com');
    await user.click(screen.getByText('Deep'));
    await confirmAuthorization(user);
    await user.click(screen.getByRole('button', { name: /start scan/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/confirm impact-proof scan/i)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/actively exploits findings/i),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /run impact-proof scan/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          scanDepth: 'deep',
          evidenceLevel: 'impact_proof',
        }),
      );
    });
  });

  it('does not show the impact-proof modal for Standard profile', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => ({ id: 'run_standard' }));

    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/target url/i), 'app.example.com');
    await confirmAuthorization(user);
    await user.click(screen.getByRole('button', { name: /start scan/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('exposes a tooltip trigger for each vulnerability check', () => {
    render(<CreateRunPanel orgId="org_1" balance={1} onSubmit={vi.fn()} />);

    expect(screen.getByRole('button', { name: /about xss/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /about csrf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /about business logic/i })).toBeInTheDocument();
  });
});

function validationLevel() {
  return within(screen.getByRole('radiogroup', { name: /validation level/i }));
}
