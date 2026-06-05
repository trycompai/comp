import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Capture the options passed to useRealtimeRun so tests can invoke onComplete
// directly (simulating a Trigger.dev run reaching a terminal state).
const mockRealtime: {
  onComplete?: (
    run: {
      status?: string;
      output?: { downloadUrl?: string } | null;
      metadata?: Record<string, unknown>;
    },
    err?: Error,
  ) => void;
} = {};

vi.mock('@trigger.dev/react-hooks', () => ({
  useRealtimeRun: (
    _runId: string,
    options: { onComplete?: typeof mockRealtime.onComplete },
  ) => {
    mockRealtime.onComplete = options.onComplete;
    return { run: undefined };
  },
}));

const mockTriggerBulkEvidenceExport = vi.fn();
vi.mock('@/lib/evidence-download', () => ({
  triggerBulkEvidenceExport: (args: { includeJson?: boolean }) =>
    mockTriggerBulkEvidenceExport(args),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: (msg: string) => mockToastError(msg),
  },
}));

// Minimal design-system mocks so the component renders in jsdom.
vi.mock('@trycompai/design-system', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  HStack: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Stack: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
  Sheet: ({
    children,
    open,
    onOpenChange,
  }: {
    children: ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="sheet">
        {/* Stands in for the overlay / ESC / X close affordances, all of which
            route through onOpenChange. */}
        <button
          data-testid="sheet-request-close"
          onClick={() => onOpenChange(false)}
        />
        {children}
      </div>
    ) : null,
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  SheetBody: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  ArrowDown: () => <span data-testid="arrow-down" />,
}));

import { ExportEvidenceButton } from './ExportEvidenceButton';

async function startExport() {
  fireEvent.click(screen.getByRole('button', { name: 'Export All Evidence' }));
  fireEvent.click(screen.getByRole('button', { name: 'Export' }));
  // Wait for the trigger promise to resolve and the running UI to render.
  await waitFor(() =>
    expect(screen.getByText('Starting export...')).toBeInTheDocument(),
  );
}

describe('ExportEvidenceButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRealtime.onComplete = undefined;
    mockTriggerBulkEvidenceExport.mockResolvedValue({
      runId: 'run_1',
      publicAccessToken: 'tok_1',
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the export sheet when the trigger button is clicked', () => {
    render(<ExportEvidenceButton organizationName="Acme" />);

    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Export All Evidence' }),
    );
    expect(screen.getByTestId('sheet')).toBeInTheDocument();
    expect(screen.getByText('Include raw JSON files')).toBeInTheDocument();
  });

  it('can be dismissed while an export is running (does not trap the user)', async () => {
    render(<ExportEvidenceButton organizationName="Acme" />);
    await startExport();

    // The copy promises the export can be closed and continues in the
    // background — the sheet must honor a close request while running.
    fireEvent.click(screen.getByTestId('sheet-request-close'));

    await waitFor(() =>
      expect(screen.queryByTestId('sheet')).not.toBeInTheDocument(),
    );
  });

  it('auto-downloads and toasts success when the run completes with a download URL', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    render(<ExportEvidenceButton organizationName="Acme" />);
    await startExport();

    act(() => {
      mockRealtime.onComplete?.({
        status: 'COMPLETED',
        output: { downloadUrl: 'https://example.com/evidence.zip' },
      });
    });

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(mockToastSuccess).toHaveBeenCalledWith(
      'Evidence package downloaded successfully',
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('falls back to metadata.downloadUrl when output has none', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    render(<ExportEvidenceButton organizationName="Acme" />);
    await startExport();

    act(() => {
      mockRealtime.onComplete?.({
        status: 'COMPLETED',
        output: null,
        metadata: { downloadUrl: 'https://example.com/from-metadata.zip' },
      });
    });

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(mockToastSuccess).toHaveBeenCalledTimes(1);
  });

  it('toasts an error when the run completes without any download URL', async () => {
    render(<ExportEvidenceButton organizationName="Acme" />);
    await startExport();

    act(() => {
      mockRealtime.onComplete?.({ status: 'COMPLETED', output: null, metadata: {} });
    });

    expect(mockToastError).toHaveBeenCalledWith(
      'Export completed but download link was not available.',
    );
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('toasts a failure error when the run ends in a non-COMPLETED state', async () => {
    render(<ExportEvidenceButton organizationName="Acme" />);
    await startExport();

    act(() => {
      mockRealtime.onComplete?.({ status: 'FAILED' });
    });

    expect(mockToastError).toHaveBeenCalledWith(
      'Evidence export failed. Please try again.',
    );
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('toasts a failure error when onComplete reports an error', async () => {
    render(<ExportEvidenceButton organizationName="Acme" />);
    await startExport();

    act(() => {
      mockRealtime.onComplete?.(
        { status: 'COMPLETED', output: { downloadUrl: 'https://example.com/x.zip' } },
        new Error('subscription failed'),
      );
    });

    expect(mockToastError).toHaveBeenCalledWith(
      'Evidence export failed. Please try again.',
    );
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });
});
