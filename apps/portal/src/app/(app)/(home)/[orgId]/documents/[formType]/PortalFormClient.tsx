'use client';

import {
  Button,
  Field,
  FieldGroup,
  FieldLabel,
  Input,
  PageHeader,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Text,
  Textarea,
} from '@trycompai/design-system';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type FieldDef = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: ReadonlyArray<{ label: string; value: string }>;
  accept?: string;
};

interface PortalFormClientProps {
  formTitle: string;
  formDescription: string;
  fields: ReadonlyArray<FieldDef>;
  submitAction: (formData: FormData) => Promise<void>;
  successMessage?: boolean;
  errorMessage?: string;
}

export function PortalFormClient({
  formTitle,
  formDescription,
  fields,
  submitAction,
  successMessage,
  errorMessage,
}: PortalFormClientProps) {
  const params = useParams<{ orgId: string }>();

  const isCompact = (f: FieldDef) => f.type === 'text' || f.type === 'date' || f.type === 'select';

  // Sort compact fields: dates first, then the rest (matches app behavior)
  const compactFields = (() => {
    const compact = fields.filter(isCompact);
    const dateFields = compact.filter((f) => f.type === 'date');
    const nonDateFields = compact.filter((f) => f.type !== 'date');
    return [...dateFields, ...nonDateFields];
  })();

  const fullWidthFields = fields.filter((f) => !isCompact(f));

  return (
    <Stack gap="lg">
      <PageHeader title={`New ${formTitle} Submission`} />
      <Text variant="muted">{formDescription}</Text>

      {successMessage && (
        <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
          Submission saved successfully.
        </div>
      )}

      {errorMessage && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      <Section>
        <form action={submitAction} className="space-y-6">
          {/* Compact fields (text, date, select) in 2-column grid */}
          {compactFields.length > 0 && (
            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {compactFields.map((field) => (
                  <Field key={field.key}>
                    <FieldLabel htmlFor={field.key}>{field.label}</FieldLabel>
                    {field.description && (
                      <Text size="sm" variant="muted">
                        {field.description}
                      </Text>
                    )}

                    {field.type === 'text' && (
                      <Input
                        id={field.key}
                        name={field.key}
                        required={field.required}
                        placeholder={field.placeholder}
                      />
                    )}

                    {field.type === 'date' && (
                      <Input
                        id={field.key}
                        name={field.key}
                        type="date"
                        required={field.required}
                      />
                    )}

                    {field.type === 'select' && (
                      <Select name={field.key} required={field.required}>
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
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
                  </Field>
                ))}
              </div>
            </FieldGroup>
          )}

          {/* Full-width fields (textarea, file) */}
          {fullWidthFields.length > 0 && (
            <FieldGroup>
              {fullWidthFields.map((field) => (
                <Field key={field.key}>
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
                        name={field.key}
                        required={field.required}
                        placeholder={field.placeholder}
                        rows={12}
                      />
                      <p className="text-xs text-muted-foreground">
                        10,000 character limit &bull; Markdown supported
                      </p>
                    </div>
                  )}

                  {field.type === 'file' && (
                    <div className="space-y-2">
                      <div className="rounded-md border border-border p-4">
                        <Input
                          id={field.key}
                          name={field.key}
                          type="file"
                          required={field.required}
                          accept={field.accept}
                        />
                      </div>
                      <Text size="sm" variant="muted">
                        Accepted: {field.accept ?? 'all file types'}
                      </Text>
                    </div>
                  )}
                </Field>
              ))}
            </FieldGroup>
          )}

          <div className="flex items-center justify-between">
            <Link href={`/${params.orgId}`}>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
            <Button type="submit">Submit form</Button>
          </div>
        </form>
      </Section>
    </Stack>
  );
}
