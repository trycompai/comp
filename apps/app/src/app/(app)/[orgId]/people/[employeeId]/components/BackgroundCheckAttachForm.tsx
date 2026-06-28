'use client';

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
} from '@trycompai/design-system';
import { Upload } from '@trycompai/design-system/icons';
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  FormFooterInfo,
  FormFooterRow,
  LabelRow,
} from './BackgroundCheckFormHelpers';

export const VENDOR_OPTIONS = [
  { value: 'checkr', label: 'Checkr' },
  { value: 'sterling', label: 'Sterling' },
  { value: 'hireright', label: 'HireRight' },
  { value: 'goodhire', label: 'Goodhire' },
  { value: 'other', label: 'Other' },
] as const;

export interface AttachFormValues {
  vendor: string;
  reportDate: string;
  file: File | null;
}

interface AttachFormProps {
  values: AttachFormValues;
  onChange: (next: AttachFormValues) => void;
  onSubmit: () => void;
  onBack?: () => void;
  submitting: boolean;
  canSubmit: boolean;
}

const MAX_FILE_BYTES = 25 * 1024 * 1024;

// Reports are usually PDFs, but the manual identity fallback is a passport
// photo (JPEG/PNG/WEBP). Keep this in lock-step with what the API actually
// accepts — validateFileContent in apps/api/src/utils/file-type-validation.ts.
// HEIC/HEIF are intentionally excluded: the API can't validate/store them and
// most browsers can't display them, so they'd fail server-side or store
// unviewable evidence. (Candidates' own uploads convert HEIC->JPEG in the
// browser via apps/web normalizeIdImage; this admin attach form does not.)
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
];

const FILE_ACCEPT_ATTR =
  'application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp';

export function BackgroundCheckAttachForm({
  values,
  onChange,
  onSubmit,
  onBack,
  submitting,
  canSubmit,
}: AttachFormProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const setField = <K extends keyof AttachFormValues>(key: K, value: AttachFormValues[K]) => {
    onChange({ ...values, [key]: value });
  };

  const acceptFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError('File exceeds 25 MB limit.');
      return;
    }
    if (file.type && !ACCEPTED_MIME_TYPES.includes(file.type)) {
      setFileError('Upload a PDF or image file (PDF, PNG, JPG, WEBP).');
      return;
    }
    setFileError(null);
    setField('file', file);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    acceptFile(event.target.files?.[0]);
  };

  const handleBrowse = () => inputRef.current?.click();

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    acceptFile(event.dataTransfer.files?.[0]);
  };

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()}>
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <div>
          <LabelRow htmlFor="bg-attach-vendor" required>
            Vendor
          </LabelRow>
          <Select
            value={values.vendor}
            onValueChange={(next) => setField('vendor', next ?? '')}
          >
            <SelectTrigger id="bg-attach-vendor">
              <SelectValue placeholder="Select a vendor" />
            </SelectTrigger>
            <SelectContent>
              {VENDOR_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <LabelRow htmlFor="bg-attach-date" hint="As shown on the report">
            Report date
          </LabelRow>
          <div className="font-mono">
            <Input
              id="bg-attach-date"
              type="date"
              value={values.reportDate}
              onChange={(event) => setField('reportDate', event.target.value)}
            />
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={FILE_ACCEPT_ATTR}
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Background check report or identity document"
      />
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`mb-4 rounded-[var(--radius)] border-[1.5px] border-dashed px-4 py-7 text-center transition-colors ${
          dragOver
            ? 'border-primary bg-[oklch(0.985_0.012_167)]'
            : 'border-border bg-muted'
        }`}
      >
        <div className="mb-1.5 flex justify-center text-muted-foreground">
          <Upload size={20} />
        </div>
        <Text size="sm">
          {values.file ? (
            <>Selected: {values.file.name}</>
          ) : (
            <>
              Drop the file here, or{' '}
              <button
                type="button"
                onClick={handleBrowse}
                className="text-primary underline underline-offset-2 hover:opacity-80"
              >
                browse files
              </button>
            </>
          )}
        </Text>
        <Text size="xs" variant="muted">
          PDF or image (PNG, JPG, WEBP) · up to 25 MB · stored encrypted in your evidence vault
        </Text>
        {fileError && (
          <p className="mt-2 text-xs text-destructive">{fileError}</p>
        )}
      </div>
      <FormFooterRow
        info={
          <FormFooterInfo>
            We extract status and key fields automatically. You&apos;ll get to confirm before
            saving.
          </FormFooterInfo>
        }
      >
        {onBack && (
          <Button type="button" variant="outline" size="lg" onClick={onBack} disabled={submitting}>
            Back
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          loading={submitting}
          disabled={!canSubmit || submitting}
          onClick={onSubmit}
        >
          Attach report
        </Button>
      </FormFooterRow>
    </form>
  );
}
