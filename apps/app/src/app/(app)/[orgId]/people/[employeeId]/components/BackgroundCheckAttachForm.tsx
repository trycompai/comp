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
    if (file.type && file.type !== 'application/pdf') {
      setFileError('Only PDF files are accepted.');
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
        accept="application/pdf"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Background check PDF"
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
              Drop the PDF here, or{' '}
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
          PDF · up to 25 MB · stored encrypted in your evidence vault
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
