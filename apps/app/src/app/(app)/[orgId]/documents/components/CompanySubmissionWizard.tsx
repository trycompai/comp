'use client';

import {
  evidenceFormDefinitions,
  evidenceFormSubmissionSchemaMap,
  meetingMinutesPlaceholders,
  meetingSubTypes,
  type EvidenceFormFieldDefinition,
  type EvidenceFormFile,
  type EvidenceFormType,
  type MeetingSubType,
} from '@/app/(app)/[orgId]/documents/forms';
import type { EvidenceFormAnalysisResult } from '@/app/api/evidence-forms/analyze/route';
import { FileUploader } from '@/components/file-uploader';
import { api } from '@/lib/api-client';
import { meetingFields } from '@comp/company';
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
import { toast } from 'sonner';
import {
  isMatrixField,
  normalizeMatrixRows,
  renderSubmissionValue,
  type MatrixColumnDefinition,
  type MatrixRowValue,
} from './submission-utils';

type Step = 1 | 2 | 3 | 4;

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

function createEmptyMatrixRow(columns: ReadonlyArray<MatrixColumnDefinition>): MatrixRowValue {
  return Object.fromEntries(columns.map((column) => [column.key, '']));
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

  const isMeeting = formType === 'meeting';
  const isTabletopExercise = formType === 'tabletop-exercise';
  const hasAiAnalysis = isMeeting || isTabletopExercise;
  const useFourSteps = formType === 'tabletop-exercise';
  const isReviewStep = step === 4 || (step === 3 && !useFourSteps);
  const [selectedMeetingType, setSelectedMeetingType] = useState<MeetingSubType>('board-meeting');
  const [analysisResult, setAnalysisResult] = useState<EvidenceFormAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisSkipped, setAnalysisSkipped] = useState(false);

  const activeFormDefinition = useMemo(() => {
    if (!isMeeting) return evidenceFormDefinitions[formType];

    const placeholder = meetingMinutesPlaceholders[selectedMeetingType] ?? '';
    return {
      ...evidenceFormDefinitions.meeting,
      fields: meetingFields(placeholder),
    };
  }, [formType, isMeeting, selectedMeetingType]);

  const formSchema = evidenceFormSubmissionSchemaMap[formType];
  const visibleFields = activeFormDefinition.fields.filter(
    (field) => field.key !== 'submissionDate',
  );
  const matrixFields = useMemo(() => visibleFields.filter(isMatrixField), [visibleFields]);

  const step2OnlyFieldKeys = useMemo(
    () => (formType === 'network-diagram' ? ['diagramUrl'] : []),
    [formType],
  );
  const step2OnlyFields = useMemo(
    () => visibleFields.filter((f) => step2OnlyFieldKeys.includes(f.key)),
    [visibleFields, step2OnlyFieldKeys],
  );

  const compactFields = useMemo(() => {
    const compact = visibleFields.filter(
      (f) =>
        (f.type === 'text' || f.type === 'date' || f.type === 'select') &&
        !step2OnlyFieldKeys.includes(f.key),
    );
    const dateFields = compact.filter((f) => f.type === 'date');
    const nonDateFields = compact.filter((f) => f.type !== 'date');
    return [...dateFields, ...nonDateFields];
  }, [visibleFields, step2OnlyFieldKeys]);
  const textareaFields = useMemo(
    () => visibleFields.filter((f) => f.type === 'textarea'),
    [visibleFields],
  );
  const fileFields = useMemo(() => visibleFields.filter((f) => f.type === 'file'), [visibleFields]);
  const extendedFields = useMemo(
    () => visibleFields.filter((f) => f.type === 'textarea' || f.type === 'file'),
    [visibleFields],
  );
  const step3Fields = useMemo(() => [...fileFields, ...matrixFields], [fileFields, matrixFields]);

  const today = new Date().toISOString().slice(0, 10);

  const defaultValues = useMemo(() => {
    const defaults: Record<string, unknown> = {
      submissionDate:
        activeFormDefinition.submissionDateMode === 'custom' ? today : new Date().toISOString(),
    };

    for (const field of activeFormDefinition.fields) {
      if (field.type === 'date' && field.key !== 'submissionDate') {
        defaults[field.key] = today;
      }
      if (field.type === 'textarea' && field.placeholder) {
        defaults[field.key] = field.placeholder;
      }
    }

    for (const matrixField of matrixFields) {
      defaults[matrixField.key] = [createEmptyMatrixRow(matrixField.columns)];
    }

    return defaults;
  }, [activeFormDefinition, matrixFields, today]);

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
      const submitFormType = isMeeting ? selectedMeetingType : formType;
      const response = await api.post<EvidenceFormFile>(
        '/v1/evidence-forms/uploads',
        {
          formType: submitFormType,
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

  const addMatrixRow = (
    field: EvidenceFormFieldDefinition & {
      type: 'matrix';
      columns: ReadonlyArray<MatrixColumnDefinition>;
    },
  ) => {
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

  const validateRequiredMatrixCells = () => {
    for (const field of matrixFields) {
      const rows = normalizeMatrixRows(getValues(field.key as never));
      const rowValues = rows.length > 0 ? rows : [createEmptyMatrixRow(field.columns)];

      for (let rowIndex = 0; rowIndex < rowValues.length; rowIndex += 1) {
        const row = rowValues[rowIndex] ?? {};

        for (const column of field.columns) {
          if (!column.required) continue;

          const rawValue = row[column.key];
          const value = typeof rawValue === 'string' ? rawValue.trim() : '';
          if (value.length > 0) continue;

          const inputId = `${field.key}-${rowIndex}-${column.key}`;
          document.getElementById(inputId)?.focus();
          toast.error(`Complete "${column.label}" in row ${rowIndex + 1} to continue`);
          return false;
        }
      }
    }

    return true;
  };

  const runAiAnalysis = async (targetStep: Step) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    setAnalysisSkipped(false);
    setStep(targetStep);
    try {
      let analyzeBody: Record<string, unknown>;
      if (isMeeting) {
        analyzeBody = {
          formType: 'meeting',
          meetingMinutes: String(getValues('meetingMinutes' as never) ?? ''),
          meetingType: selectedMeetingType,
        };
      } else {
        const attendeeRows = normalizeMatrixRows(getValues('attendees' as never));
        const actionItemRows = normalizeMatrixRows(getValues('actionItems' as never));
        analyzeBody = {
          formType: 'tabletop-exercise',
          scenarioDescription: String(getValues('scenarioDescription' as never) ?? ''),
          sessionNotes: String(getValues('sessionNotes' as never) ?? ''),
          attendees: attendeeRows
            .map((r) => `${r.name ?? ''} — ${r.roleTitle ?? ''}, ${r.department ?? ''}`)
            .join('\n'),
          actionItems: actionItemRows
            .map(
              (r) =>
                `Finding: ${r.finding ?? ''} | Action: ${r.improvementAction ?? ''} | Owner: ${r.assignedOwner ?? ''} | Due: ${r.dueDate ?? ''}`,
            )
            .join('\n'),
        };
      }
      const response = await fetch('/api/evidence-forms/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-Id': organizationId,
        },
        body: JSON.stringify(analyzeBody),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        setAnalysisError(
          (errorData as { error?: string } | null)?.error ??
            'AI analysis unavailable. You may submit without analysis.',
        );
        return;
      }
      const result = (await response.json()) as EvidenceFormAnalysisResult;
      setAnalysisResult(result);
    } catch {
      setAnalysisError('AI analysis unavailable. You may submit without analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const goToStepTwo = async () => {
    const keys: string[] = [];
    if (activeFormDefinition.submissionDateMode === 'custom') keys.push('submissionDate');
    keys.push(...compactFields.map((f) => f.key));

    const isValid = await trigger(keys as never, { shouldFocus: true });
    if (!isValid) {
      toast.error('Complete required fields before continuing');
      return;
    }
    setStep(2);
  };

  const goToStepThree = async () => {
    if (useFourSteps) {
      const keys = textareaFields.map((f) => f.key);
      const isValid =
        keys.length === 0 ? true : await trigger(keys as never, { shouldFocus: true });
      if (!isValid) {
        toast.error('Complete required fields before continuing');
        return;
      }
      setStep(3);
      return;
    }

    if (!validateRequiredMatrixCells()) return;
    const keys = [
      ...step2OnlyFields.map((f) => f.key),
      ...extendedFields.map((f) => f.key),
      ...matrixFields.map((f) => f.key),
    ];
    const isValid = keys.length === 0 ? true : await trigger(keys as never, { shouldFocus: true });
    if (!isValid) {
      toast.error('Complete required fields before reviewing');
      return;
    }
    if (hasAiAnalysis) {
      await runAiAnalysis(3);
    } else {
      setStep(3);
    }
  };

  const goToStepFour = async () => {
    if (!validateRequiredMatrixCells()) return;

    const keys = [...fileFields.map((f) => f.key), ...matrixFields.map((f) => f.key)];
    const isValid = keys.length === 0 ? true : await trigger(keys as never, { shouldFocus: true });
    if (!isValid) {
      toast.error('Complete required fields before reviewing');
      return;
    }

    if (hasAiAnalysis) {
      await runAiAnalysis(4);
    } else {
      setStep(4);
    }
  };

  const onSubmit = async (formData: Record<string, unknown>) => {
    const payload =
      activeFormDefinition.submissionDateMode === 'auto'
        ? { ...formData, submissionDate: new Date().toISOString() }
        : formData;

    const submitFormType = isMeeting ? selectedMeetingType : formType;

    const response = await api.post(
      `/v1/evidence-forms/${submitFormType}/submissions`,
      payload,
      organizationId,
    );

    if (response.error) {
      toast.error(response.error);
      return;
    }

    toast.success('Submission saved');
    router.push(`/${organizationId}/documents/${formType}`);
    router.refresh();
  };

  const selectedMeetingLabel = meetingSubTypes.find((m) => m.value === selectedMeetingType)?.label;

  return (
    <Section>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {step === 1 && (
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {isMeeting && (
                <Field>
                  <FieldLabel htmlFor="meetingType">Meeting type</FieldLabel>
                  <Text size="sm" variant="muted">
                    Select the type of meeting to record
                  </Text>
                  <Select
                    value={selectedMeetingType}
                    onValueChange={(value) => setSelectedMeetingType(value as MeetingSubType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select meeting type">
                        {selectedMeetingLabel ?? 'Select meeting type'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {meetingSubTypes.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {activeFormDefinition.submissionDateMode === 'custom' && (
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
            {useFourSteps ? (
              <>
                {textareaFields.length === 0 && (
                  <Text variant="muted">No additional fields required for this step.</Text>
                )}
                {textareaFields.map((field) => (
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
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                ))}
              </>
            ) : (
              <>
                {step2OnlyFields.length === 0 &&
                  extendedFields.length === 0 &&
                  matrixFields.length === 0 && (
                    <Text variant="muted">No additional fields required for this form.</Text>
                  )}
                {step2OnlyFields.map((field) => (
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
                        <Input
                          id={field.key}
                          type="text"
                          value={String(controllerField.value ?? '')}
                          onChange={controllerField.onChange}
                          placeholder={field.placeholder}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                ))}
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
                                      field.accept
                                        .split(',')
                                        .map((ext): [string, string[]] | null => {
                                          const trimmed = ext.trim().toLowerCase();
                                          if (trimmed === '.pdf') return ['application/pdf', []];
                                          if (trimmed === '.doc') return ['application/msword', []];
                                          if (trimmed === '.docx') {
                                            return [
                                              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                              [],
                                            ];
                                          }
                                          if (trimmed === '.png') return ['image/png', []];
                                          if (trimmed === '.jpg' || trimmed === '.jpeg') {
                                            return ['image/jpeg', []];
                                          }
                                          if (trimmed === '.txt') return ['text/plain', []];
                                          if (trimmed === '.svg') return ['image/svg+xml', []];
                                          if (trimmed === '.vsdx')
                                            return ['application/vnd.visio', []];
                                          return null;
                                        })
                                        .filter(
                                          (entry): entry is [string, string[]] => entry !== null,
                                        ),
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
                                  Uploaded:{' '}
                                  {(controllerField.value as { fileName: string }).fileName}
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
                          <div
                            key={`${field.key}-${rowIndex}`}
                            className="rounded-md border border-border p-3"
                          >
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
                                      updateMatrixCell(
                                        field,
                                        rowIndex,
                                        column.key,
                                        event.target.value,
                                      )
                                    }
                                    placeholder={column.placeholder}
                                  />
                                </Field>
                              ))}
                            </div>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => addMatrixRow(field)}
                        >
                          {field.addRowLabel ?? 'Add row'}
                        </Button>
                      </div>
                      <FieldError errors={[matrixError as never]} />
                    </Field>
                  );
                })}
              </>
            )}
          </FieldGroup>
        )}

        {step === 3 && useFourSteps && (
          <FieldGroup>
            {step3Fields.length === 0 && (
              <Text variant="muted">No additional fields required for this step.</Text>
            )}
            {fileFields.map((field) => (
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
                    <div className="space-y-2">
                      <FileUploader
                        maxFileCount={1}
                        maxSize={100 * 1024 * 1024}
                        accept={
                          field.accept
                            ? Object.fromEntries(
                                field.accept
                                  .split(',')
                                  .map((ext): [string, string[]] | null => {
                                    const trimmed = ext.trim().toLowerCase();
                                    if (trimmed === '.pdf') return ['application/pdf', []];
                                    if (trimmed === '.doc') return ['application/msword', []];
                                    if (trimmed === '.docx') {
                                      return [
                                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                        [],
                                      ];
                                    }
                                    if (trimmed === '.png') return ['image/png', []];
                                    if (trimmed === '.jpg' || trimmed === '.jpeg') {
                                      return ['image/jpeg', []];
                                    }
                                    if (trimmed === '.txt') return ['text/plain', []];
                                    if (trimmed === '.svg') return ['image/svg+xml', []];
                                    if (trimmed === '.vsdx') return ['application/vnd.visio', []];
                                    return null;
                                  })
                                  .filter((entry): entry is [string, string[]] => entry !== null),
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
                      <div
                        key={`${field.key}-${rowIndex}`}
                        className="rounded-md border border-border p-3"
                      >
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

        {isReviewStep && (
          <div className="space-y-4">
            <Text size="sm" variant="muted">
              Review your submission before saving.
            </Text>

            {hasAiAnalysis && (
              <div className="rounded-md border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Text size="sm" weight="medium">
                    {isTabletopExercise
                      ? 'Exercise completeness analysis'
                      : 'Security topic analysis'}
                  </Text>
                  {isAnalyzing && (
                    <span className="text-xs text-muted-foreground animate-pulse">
                      Analyzing...
                    </span>
                  )}
                </div>

                {analysisError && (
                  <div className="rounded-md bg-muted p-3">
                    <Text size="sm" variant="muted">
                      {analysisError}
                    </Text>
                  </div>
                )}

                {analysisResult && (
                  <>
                    <div className="space-y-2">
                      {analysisResult.requirements.map((req) => (
                        <div key={req.topic} className="flex items-start gap-2 text-sm">
                          <span className="mt-0.5 shrink-0">
                            {req.covered ? (
                              <span className="text-green-600 dark:text-green-400">&#10003;</span>
                            ) : (
                              <span className="text-red-600 dark:text-red-400">&#10007;</span>
                            )}
                          </span>
                          <div>
                            <span className="font-medium">{req.topic}</span>
                            <p className="text-muted-foreground text-xs">{req.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div
                      className={`rounded-md p-3 text-sm ${
                        analysisResult.overallPass
                          ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300'
                          : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {analysisResult.summary}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="rounded-md border border-border">
              <div className="divide-y divide-border">
                {isMeeting && (
                  <div className="grid grid-cols-1 gap-2 p-4 lg:grid-cols-3">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Meeting type
                    </div>
                    <div className="lg:col-span-2 text-sm">{selectedMeetingLabel}</div>
                  </div>
                )}
                {activeFormDefinition.submissionDateMode === 'custom' && (
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
                      {isMatrixField(field)
                        ? (() => {
                            const rows = normalizeMatrixRows(
                              values[field.key as keyof typeof values],
                            );
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
                        : renderSubmissionValue(values[field.key as keyof typeof values], field)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Link href={`/${organizationId}/documents/${formType}`}>
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
                {useFourSteps ? 'Continue' : 'Review'}
              </Button>
            )}
            {step === 3 && useFourSteps && (
              <Button type="button" onClick={goToStepFour}>
                Review
              </Button>
            )}
            {(step === 3 && !useFourSteps) || (step === 4 && useFourSteps) ? (
              <>
                {hasAiAnalysis &&
                  !analysisResult?.overallPass &&
                  !analysisError &&
                  !analysisSkipped &&
                  !isAnalyzing &&
                  analysisResult && (
                    <Button type="button" variant="ghost" onClick={() => setAnalysisSkipped(true)}>
                      Submit anyway
                    </Button>
                  )}
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    isAnalyzing ||
                    (hasAiAnalysis &&
                      !analysisResult?.overallPass &&
                      !analysisError &&
                      !analysisSkipped &&
                      !!analysisResult)
                  }
                >
                  {isSubmitting
                    ? 'Submitting...'
                    : isAnalyzing
                      ? 'Analyzing...'
                      : 'Submit evidence'}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </form>
    </Section>
  );
}
