import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComplianceFramework } from './ComplianceFramework';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderRow(overrides: { disabled?: boolean } = {}) {
  const onFileUpload = vi.fn().mockResolvedValue(undefined);
  render(
    <ComplianceFramework
      title="SOC 2"
      description="Service Organization Control 2"
      isEnabled
      status="compliant"
      onStatusChange={vi.fn().mockResolvedValue(undefined)}
      onToggle={vi.fn().mockResolvedValue(undefined)}
      onFileUpload={onFileUpload}
      frameworkKey="soc2"
      orgId="org_1"
      {...overrides}
    />,
  );
  return { onFileUpload };
}

function dropPdf() {
  const dropZone = screen.getByText(/Drag & drop certificate/i);
  const file = new File(['%PDF-1.4'], 'cert.pdf', { type: 'application/pdf' });
  fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
}

describe('ComplianceFramework drag-and-drop permission gate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uploads a dropped certificate when editable', async () => {
    const { onFileUpload } = renderRow({ disabled: false });
    dropPdf();
    expect(onFileUpload).toHaveBeenCalledTimes(1);
  });

  it('does NOT upload a dropped certificate for read-only users (disabled)', () => {
    const { onFileUpload } = renderRow({ disabled: true });
    dropPdf();
    expect(onFileUpload).not.toHaveBeenCalled();
  });
});
