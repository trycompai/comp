import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BackgroundCheckAttachForm, type AttachFormValues } from './BackgroundCheckAttachForm';

function renderForm(overrides: Partial<Parameters<typeof BackgroundCheckAttachForm>[0]> = {}) {
  const values: AttachFormValues = { vendor: 'other', reportDate: '2026-06-01', file: null };
  const props = {
    values,
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    submitting: false,
    canSubmit: true,
    ...overrides,
  };
  render(<BackgroundCheckAttachForm {...props} />);
  return props;
}

function fileInput() {
  return screen.getByLabelText(/background check report or identity document/i);
}

describe('BackgroundCheckAttachForm', () => {
  it('accepts a passport photo (the manual identity fallback)', () => {
    const onChange = vi.fn();
    renderForm({ onChange });

    const passport = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'passport.jpg', {
      type: 'image/jpeg',
    });
    fireEvent.change(fileInput(), { target: { files: [passport] } });

    expect(screen.queryByText(/only pdf files are accepted/i)).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ file: passport }));
  });

  it('lets the native picker offer images, not just PDFs', () => {
    renderForm();

    const accept = fileInput().getAttribute('accept') ?? '';
    expect(accept).toContain('application/pdf');
    expect(accept).toMatch(/image\/png/);
    expect(accept).toMatch(/image\/jpeg/);
    expect(accept).toMatch(/image\/webp/);
    // HEIC/HEIF intentionally excluded — the API can't validate/store them and
    // most browsers can't display them; offering them would fail server-side.
    expect(accept).not.toMatch(/image\/heic/);
  });

  it('still accepts a PDF report', () => {
    const onChange = vi.fn();
    renderForm({ onChange });

    const pdf = new File(['%PDF-1.7'], 'report.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput(), { target: { files: [pdf] } });

    expect(screen.queryByText(/upload a pdf or image/i)).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ file: pdf }));
  });

  it('rejects unsupported types and oversized files', () => {
    const onChange = vi.fn();
    renderForm({ onChange });

    const exe = new File([new Uint8Array([0x4d, 0x5a])], 'malware.exe', {
      type: 'application/x-msdownload',
    });
    fireEvent.change(fileInput(), { target: { files: [exe] } });
    expect(screen.getByText(/upload a pdf or image/i)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    const huge = new File(['x'], 'huge.png', { type: 'image/png' });
    Object.defineProperty(huge, 'size', { value: 26 * 1024 * 1024 });
    fireEvent.change(fileInput(), { target: { files: [huge] } });
    expect(screen.getByText(/exceeds 25 mb limit/i)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
