'use client';

import {
  evidenceFormDefinitions,
  evidenceFormSubmissionSchemaMap,
  type EvidenceFormFieldDefinition,
  type EvidenceFormFile,
  type EvidenceFormType,
} from '@/app/(app)/[orgId]/company/forms';
import { FileUploader } from '@/components/file-uploader';
import { api } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
  Textarea,
} from '@trycompai/design-system';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

type Step = 1 | 2 | 3;

async function fileToBase64(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderSubmissionValue(value: unknown, field?: EvidenceFormFieldDefinition) {
  if (!value) return '—';

  if (
    typeof value === 'object' &&
    'downloadUrl' in value &&
    typeof value.downloadUrl === 'string'
  ) {
    const fileValue = value as EvidenceFormFile;
    return (
      <a
        href={fileValue.downloadUrl}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline"
      >
        {fileValue.fileName}
      </a>
    );
  }

  if (field?.type === 'select' && field.options && typeof value === 'string') {
    const matched = field.options.find((opt) => opt.value === value);
    if (matched) return matched.label;
  }

  if (typeof value === 'string' && value.length > 0) return value;
  return '—';
}

function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

type MatrixRowValue = Record<string, string>;
type MatrixColumnDefinition = {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  description?: string;
};

function isMatrixField(field: EvidenceFormFieldDefinition): field is EvidenceFormFieldDefinition & {
  type: 'matrix';
  columns: ReadonlyArray<MatrixColumnDefinition>;
} {
  return field.type === 'matrix' && Array.isArray(field.columns) && field.columns.length > 0;
}

function createEmptyMatrixRow(columns: ReadonlyArray<MatrixColumnDefinition>): MatrixRowValue {
  return Object.fromEntries(columns.map((column) => [column.key, '']));
}

function normalizeMatrixRows(value: unknown): MatrixRowValue[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    if (!row || typeof row !== 'object') return {};
    return Object.fromEntries(
      Object.entries(row).map(([key, rawValue]) => [key, typeof rawValue === 'string' ? rawValue : '']),
    );
  });
}

export function CompanySubmissionWizard({
  organizationId,
  formType,
}: {
  organizationId: string;
  formType: EvidenceFormType;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const formDefinition = evidenceFormDefinitions[formType];
  const formSchema = evidenceFormSubmissionSchemaMap[formType];
  const visibleFields = formDefinition.fields.filter((field) => field.key !== 'submissionDate');
  const matrixFields = useMemo(
    () => visibleFields.filter(isMatrixField),
    [visibleFields],
  );

  const compactFields = useMemo(() => {
    const compact = visibleFields.filter(
      (f) => f.type === 'text' || f.type === 'date' || f.type === 'select',
    );
    const dateFields = compact.filter((f) => f.type === 'date');
    const nonDateFields = compact.filter((f) => f.type !== 'date');
    return [...dateFields, ...nonDateFields];
  }, [visibleFields]);
  const extendedFields = useMemo(
    () => visibleFields.filter((f) => f.type === 'textarea' || f.type === 'file'),
    [visibleFields],
  );

  const defaultValues = useMemo(() => {
    const defaults: Record<string, unknown> = {
      submissionDate:
        formDefinition.submissionDateMode === 'custom'
          ? new Date().toISOString().slice(0, 10)
          : new Date().toISOString(),
    };

    for (const matrixField of matrixFields) {
      defaults[matrixField.key] = [createEmptyMatrixRow(matrixField.columns)];
    }

    return defaults;
  }, [formDefinition.submissionDateMode, matrixFields]);

  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(formSchema as never),
    mode: 'onChange',
    defaultValues,
  });

  const values = watch();

  const handleFileUpload = async (fieldKey: string, file: File) => {
    setUploadingField(fieldKey);
    try {
      const fileData = await fileToBase64(file);
      const response = await api.post<EvidenceFormFile>(
        '/v1/evidence-forms/uploads',
        {
          formType,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileData,
        },
        organizationId,
      );

      if (response.error || !response.data) {
        throw new Error(response.error ?? 'Upload failed');
      }

      setValue(fieldKey as never, response.data as never, {
        shouldDirty: true,
        shouldValidate: true,
      });
      toast.success('File uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'File upload failed');
    } finally {
      setUploadingField(null);
    }
  };

  const addMatrixRow = (field: EvidenceFormFieldDefinition & {
    type: 'matrix';
    columns: ReadonlyArray<MatrixColumnDefinition>;
  }) => {
    const rows = normalizeMatrixRows(getValues(field.key as never));
    setValue(field.key as never, [...rows, createEmptyMatrixRow(field.columns)] as never, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const removeMatrixRow = (
    field: EvidenceFormFieldDefinition & {
      type: 'matrix';
      columns: ReadonlyArray<MatrixColumnDefinition>;
    },
    rowIndex: number,
  ) => {
    const rows = normalizeMatrixRows(getValues(field.key as never));
    const nextRows = rows.filter((_, index) => index !== rowIndex);
    setValue(field.key as never, nextRows as never, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const updateMatrixCell = (
    field: EvidenceFormFieldDefinition & {
      type: 'matrix';
      columns: ReadonlyArray<MatrixColumnDefinition>;
    },
    rowIndex: number,
    columnKey: string,
    nextValue: string,
  ) => {
    const rows = normalizeMatrixRows(getValues(field.key as never));
    const safeRows = rows.length > 0 ? rows : [createEmptyMatrixRow(field.columns)];
    const currentRow = safeRows[rowIndex] ?? createEmptyMatrixRow(field.columns);
    safeRows[rowIndex] = { ...currentRow, [columnKey]: nextValue };
    setValue(field.key as never, safeRows as never, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const goToStepTwo = async () => {
    const keys: string[] = [];
    if (formDefinition.submissionDateMode === 'custom') keys.push('submissionDate');
    keys.push(...compactFields.map((f) => f.key));

    const isValid = await trigger(keys as never, { shouldFocus: true });
    if (!isValid) return;
    setStep(2);
  };

  const goToStepThree = async () => {
    const keys = [...extendedFields.map((f) => f.key), ...matrixFields.map((f) => f.key)];
    const isValid = keys.length === 0 ? true : await trigger(keys as never, { shouldFocus: true });
    if (!isValid) return;
    setStep(3);
  };

  const onSubmit = async (formData: Record<string, unknown>) => {
    const payload =
      formDefinition.submissionDateMode === 'auto'
        ? { ...formData, submissionDate: new Date().toISOString() }
        : formData;

    const response = await api.post(
      `/v1/evidence-forms/${formType}/submissions`,
      payload,
      organizationId,
    );

    if (response.error) {
      toast.error(response.error);
      return;
    }

    toast.success('Submission saved');
    router.push(`/${organizationId}/company/${formType}`);
    router.refresh();
  };

  return (
    <Section>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {step === 1 && (
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {formDefinition.submissionDateMode === 'custom' && (
                <Controller
                  name={'submissionDate' as never}
                  control={control}
                  render={({ field: controllerField, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="submissionDate">Submission date</FieldLabel>
                      <Text size="sm" variant="muted">
                        Date this evidence was submitted
                      </Text>
                      <Input
                        id="submissionDate"
                        type="date"
                        value={String(controllerField.value ?? '')}
                        onChange={controllerField.onChange}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              )}

              {compactFields.map((field) => (
                <Controller
                  key={field.key}
                  name={field.key as never}
                  control={control}
                  render={({ field: controllerField, fieldState }) => {
                    const selectedOption =
                      field.type === 'select' && field.options
                        ? field.options.find(
                            (opt) => opt.value === String(controllerField.value ?? ''),
                          )
                        : undefined;

                    return (
                      <Field>
                        <FieldLabel htmlFor={field.key}>{field.label}</FieldLabel>
                        {field.description && (
                          <Text size="sm" variant="muted">
                            {field.description}
                          </Text>
                        )}

                        {(field.type === 'text' || field.type === 'date') && (
                          <Input
                            id={field.key}
                            type={field.type === 'date' ? 'date' : 'text'}
                            value={String(controllerField.value ?? '')}
                            onChange={controllerField.onChange}
                            placeholder={field.placeholder}
                          />
                        )}

                        {field.type === 'select' && (
                          <Select
                            value={String(controllerField.value ?? '')}
                            onValueChange={controllerField.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`}>
                                {selectedOption?.label ?? `Select ${field.label.toLowerCase()}`}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {(field.options ?? []).map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    );
                  }}
                />
              ))}
            </div>
          </FieldGroup>
        )}

        {step === 2 && (
          <FieldGroup>
            {extendedFields.length === 0 && matrixFields.length === 0 && (
              <Text variant="muted">No additional fields required for this form.</Text>
            )}
            {extendedFields.map((field) => (
              <Controller
                key={field.key}
                name={field.key as never}
                control={control}
                render={({ field: controllerField, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor={field.key}>{field.label}</FieldLabel>
                    {field.description && (
                      <Text size="sm" variant="muted">
                        {field.description}
                      </Text>
                    )}

                    {field.type === 'textarea' && (
                      <div className="space-y-3">
                        <Textarea
                          id={field.key}
                          style={{
                            width: '100%',
                            maxWidth: 'none',
                            maxHeight: '350px',
                            minHeight: '350px',
                          }}
                          value={String(controllerField.value ?? '')}
                          onChange={controllerField.onChange}
                          placeholder={field.placeholder}
                          rows={12}
                        />
                        <p className="text-xs text-muted-foreground">
                          {String(controllerField.value ?? '').length}/10,000 characters &bull;
                          Markdown supported
                        </p>
                      </div>
                    )}

                    {field.type === 'file' && (
                      <div className="space-y-2">
                        <FileUploader
                          maxFileCount={1}
                          maxSize={100 * 1024 * 1024}
                          accept={
                            field.accept
                              ? Object.fromEntries(
                                  field.accept.split(',').map((ext) => {
                                    const trimmed = ext.trim();
                                    if (trimmed.startsWith('.pdf')) return ['application/pdf', []];
                                    if (trimmed.startsWith('.doc') || trimmed.startsWith('.docx')) {
                                      return [
                                        'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                        [],
                                      ];
                                    }
                                    if (
                                      trimmed.startsWith('.png') ||
                                      trimmed.startsWith('.jpg') ||
                                      trimmed.startsWith('.jpeg')
                                    ) {
                                      return ['image/*', []];
                                    }
                                    if (trimmed.startsWith('.txt')) return ['text/plain', []];
                                    return ['application/octet-stream', []];
                                  }),
                                )
                              : { 'application/pdf': [], 'image/*': [], 'text/*': [] }
                          }
                          disabled={uploadingField === field.key}
                          onUpload={async (files) => {
                            const file = files[0];
                            if (!file) return;
                            await handleFileUpload(field.key, file);
                          }}
                        />
                        {uploadingField === field.key && (
                          <Text size="sm" variant="muted">
                            Uploading file...
                          </Text>
                        )}
                        {controllerField.value &&
                          typeof controllerField.value === 'object' &&
                          'fileName' in controllerField.value &&
                          typeof (controllerField.value as { fileName?: unknown }).fileName ===
                            'string' && (
                            <Text size="sm" variant="muted">
                              Uploaded: {(controllerField.value as { fileName: string }).fileName}
                            </Text>
                          )}
                      </div>
                    )}
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            ))}
            {matrixFields.map((field) => {
              const rows = normalizeMatrixRows(watch(field.key as never));
              const rowValues = rows.length > 0 ? rows : [createEmptyMatrixRow(field.columns)];
              const matrixError = errors[field.key as keyof typeof errors];

              return (
                <Field key={field.key}>
                  <FieldLabel>{field.label}</FieldLabel>
                  {field.description && (
                    <Text size="sm" variant="muted">
                      {field.description}
                    </Text>
                  )}

                  <div className="space-y-3">
                    {rowValues.map((row, rowIndex) => (
                      <div key={`${field.key}-${rowIndex}`} className="rounded-md border border-border p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <Text size="sm" weight="medium">
                            Row {rowIndex + 1}
                          </Text>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeMatrixRow(field, rowIndex)}
                            disabled={rowValues.length <= 1}
                          >
                            Remove row
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                          {field.columns.map((column) => (
                            <Field key={`${field.key}-${rowIndex}-${column.key}`}>
                              <FieldLabel htmlFor={`${field.key}-${rowIndex}-${column.key}`}>
                                {column.label}
                              </FieldLabel>
                              {column.description && (
                                <Text size="sm" variant="muted">
                                  {column.description}
                                </Text>
                              )}
                              <Input
                                id={`${field.key}-${rowIndex}-${column.key}`}
                                value={row[column.key] ?? ''}
                                onChange={(event) =>
                                  updateMatrixCell(field, rowIndex, column.key, event.target.value)
                                }
                                placeholder={column.placeholder}
                              />
                            </Field>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div>
                      <Button type="button" variant="secondary" onClick={() => addMatrixRow(field)}>
                        {field.addRowLabel ?? 'Add row'}
                      </Button>
                    </div>
                  </div>
                  <FieldError errors={[matrixError as never]} />
                </Field>
              );
            })}
          </FieldGroup>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Text size="sm" variant="muted">
              Review your submission before saving.
            </Text>
            <div className="rounded-md border border-border">
              <div className="divide-y divide-border">
                {formDefinition.submissionDateMode === 'custom' && (
                  <div className="grid grid-cols-1 gap-2 p-4 lg:grid-cols-3">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Submission date
                    </div>
                    <div className="lg:col-span-2 text-sm whitespace-pre-wrap wrap-anywhere">
                      {String(values.submissionDate ?? '—')}
                    </div>
                  </div>
                )}
                {visibleFields.map((field) => (
                  <div key={field.key} className="grid grid-cols-1 gap-2 p-4 lg:grid-cols-3">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {field.label}
                    </div>
                    <div className="lg:col-span-2 text-sm whitespace-pre-wrap wrap-anywhere">
                      {isMatrixField(field) ? (
                        (() => {
                          const rows = normalizeMatrixRows(values[field.key as keyof typeof values]);
                          if (rows.length === 0) return '—';

                          return (
                            <div className="space-y-3">
                              {rows.map((row, rowIndex) => (
                                <div
                                  key={`${field.key}-review-${rowIndex}`}
                                  className="rounded-md border border-border p-3"
                                >
                                  <Text size="sm" weight="medium">
                                    Row {rowIndex + 1}
                                  </Text>
                                  <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
                                    {field.columns.map((column) => (
                                      <div key={`${field.key}-review-${rowIndex}-${column.key}`}>
                                        <div className="text-xs uppercase tracking-wider text-muted-foreground">
                                          {column.label}
                                        </div>
                                        <div className="text-sm whitespace-pre-wrap wrap-anywhere">
                                          {row[column.key] || '—'}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()
                      ) : (
                        renderSubmissionValue(values[field.key as keyof typeof values], field)
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Link href={`/${organizationId}/company/${formType}`}>
            <Button variant="ghost">Cancel</Button>
          </Link>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button type="button" variant="secondary" onClick={() => setStep((step - 1) as Step)}>
                Back
              </Button>
            )}
            {step === 1 && (
              <Button type="button" onClick={goToStepTwo}>
                Continue
              </Button>
            )}
            {step === 2 && (
              <Button type="button" onClick={goToStepThree}>
                Review
              </Button>
            )}
            {step === 3 && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit evidence'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Section>
  );
}
