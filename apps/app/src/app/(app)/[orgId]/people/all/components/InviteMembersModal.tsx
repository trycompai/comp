'use client';

import type { Role } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comp/ui/tabs';
import type { CustomRoleOption } from './MultiRoleCombobox';
import { MultiRoleCombobox } from './MultiRoleCombobox';

import {
  ALL_SELECTABLE_ROLES,
  formSchema,
  type InviteFormData,
  type InviteResult,
} from './invite-form-schema';
import { parseCsvContent, validateCsvFile } from './csv-invite-parser';

interface InviteMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  allowedRoles: Role[];
  customRoles?: CustomRoleOption[];
  onInviteSuccess?: () => void;
}

async function submitInvites(
  invites: Array<{ email: string; roles: string[] }>,
): Promise<InviteResult[]> {
  const response = await fetch('/api/people/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invites }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to process invitations.');
  }

  const { results } = await response.json();
  return results;
}

function handleInviteResults(
  results: InviteResult[],
  form: ReturnType<typeof useForm<InviteFormData>>,
  onOpenChange: (open: boolean) => void,
  onInviteSuccess?: () => void,
) {
  const successCount = results.filter((r) => r.success).length;
  const failedInvites = results.filter((r) => !r.success);

  if (successCount > 0) {
    toast.success(`Successfully invited ${successCount} member(s).`);
    if (failedInvites.length === 0) {
      form.reset();
      onOpenChange(false);
    }
    onInviteSuccess?.();
  }

  if (failedInvites.length > 0) {
    toast.error(
      `Failed to invite ${failedInvites.length} member(s): ${failedInvites.map((f) => f.email).join(', ')}`,
    );
  }
}

export function InviteMembersModal({
  open,
  onOpenChange,
  allowedRoles,
  customRoles = [],
  onInviteSuccess,
}: InviteMembersModalProps) {
  const [mode, setMode] = useState<'manual' | 'csv'>('manual');
  const [isLoading, setIsLoading] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const normalizedAllowedRoles = allowedRoles.length > 0 ? allowedRoles : ALL_SELECTABLE_ROLES;

  const form = useForm<InviteFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: 'manual',
      manualInvites: [{ email: '', roles: [] }],
      csvFile: undefined,
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'manualInvites',
  });

  async function onSubmit(values: InviteFormData) {
    setIsLoading(true);
    try {
      if (values.mode === 'manual') {
        if (!values.manualInvites || values.manualInvites.length === 0) {
          toast.error('Please add at least one member to invite.');
          return;
        }

        const invalidInvites = values.manualInvites.filter(
          (invite) => !invite.roles || invite.roles.length === 0,
        );
        if (invalidInvites.length > 0) {
          toast.error(
            `Please select at least one role for: ${invalidInvites.map((i) => i.email || 'invite').join(', ')}`,
          );
          return;
        }

        const invites = values.manualInvites.map((invite) => ({
          email: invite.email.toLowerCase(),
          roles: invite.roles,
        }));
        const results = await submitInvites(invites);
        handleInviteResults(results, form, onOpenChange, onInviteSuccess);
      } else if (values.mode === 'csv') {
        await handleCsvSubmit(values);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCsvSubmit(values: InviteFormData) {
    if (!values.csvFile || !(values.csvFile instanceof FileList) || values.csvFile.length !== 1) {
      form.setError('csvFile', { message: 'A valid CSV file is required.' });
      return;
    }

    const file = values.csvFile[0];
    const fileError = validateCsvFile(file);
    if (fileError) {
      form.setError('csvFile', { message: fileError });
      return;
    }

    const text = await file.text();
    const { invites: csvInvites, errors: parseErrors } = parseCsvContent(text);

    if (parseErrors.length > 0 && csvInvites.length === 0) {
      toast.error(parseErrors[0].error);
      return;
    }

    if (csvInvites.length > 0) {
      const results = await submitInvites(csvInvites);
      const allResults: InviteResult[] = [
        ...results,
        ...parseErrors.map((e) => ({ email: e.email, success: false, error: e.error })),
      ];
      handleInviteResults(allResults, form, onOpenChange, onInviteSuccess);
    } else if (parseErrors.length > 0) {
      toast.error(
        `Failed: ${parseErrors.map((f) => `${f.email}: ${f.error}`).join(', ')}`,
      );
    }
  }

  const handleModeChange = (newMode: string) => {
    if (newMode !== 'manual' && newMode !== 'csv') return;
    setMode(newMode);
    form.setValue('mode', newMode, { shouldValidate: true });

    if (newMode === 'manual') {
      if (fields.length === 0) append({ email: '', roles: [] });
      form.setValue('csvFile', undefined);
      setCsvFileName(null);
    } else {
      form.setValue('manualInvites', undefined);
    }
    form.clearErrors();
  };

  const csvTemplateDataUri = useMemo(() => {
    const primaryRole = normalizedAllowedRoles[0];
    const secondaryRole = normalizedAllowedRoles[1];
    const multiRoleExample =
      normalizedAllowedRoles.length > 1 ? `${primaryRole}|${secondaryRole}` : primaryRole;
    const csv = `email,role\njohn@company.com,${primaryRole}\njane@company.com,${multiRoleExample}`;
    return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  }, [normalizedAllowedRoles]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>Add an employee to your organization.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              const firstError = Object.values(errors)[0];
              const message =
                firstError && 'message' in firstError
                  ? (firstError.message as string)
                  : 'Please fill in all required fields.';
              toast.error(message);
            })}
            className="space-y-4"
          >
            <Tabs value={mode} onValueChange={handleModeChange}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="csv">CSV</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4 pt-4">
                {fields.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <FormField
                      control={form.control}
                      name={`manualInvites.${index}.email`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          {index === 0 && <FormLabel>Email</FormLabel>}
                          <FormControl>
                            <Input
                              className="h-10"
                              placeholder="Enter email address"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Controller
                      control={form.control}
                      name={`manualInvites.${index}.roles`}
                      render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <FormItem className="w-[200px]">
                          {index === 0 && <FormLabel>Role</FormLabel>}
                          <MultiRoleCombobox
                            selectedRoles={(value || []) as Role[]}
                            onSelectedRolesChange={onChange}
                            allowedRoles={normalizedAllowedRoles}
                            customRoles={customRoles}
                            placeholder="Select a role"
                          />
                          <FormMessage>{error?.message}</FormMessage>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => fields.length > 1 && remove(index)}
                      disabled={fields.length <= 1}
                      className={`mt-${index === 0 ? '6' : '0'} self-center ${fields.length <= 1 ? 'cursor-not-allowed opacity-50' : ''}`}
                      aria-label="Remove invite"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => append({ email: '', roles: [] })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Another
                </Button>
                <FormDescription>Add an employee to your organization.</FormDescription>
              </TabsContent>

              <TabsContent value="csv" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="csvFile"
                  render={({ field: { onChange, value, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>CSV File</FormLabel>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('csvFileInput')?.click()}
                        >
                          Choose File
                        </Button>
                        <span className="text-muted-foreground truncate text-sm">
                          {csvFileName || 'No file chosen'}
                        </span>
                      </div>
                      <FormControl className="relative">
                        <Input
                          id="csvFileInput"
                          type="file"
                          accept=".csv"
                          {...fieldProps}
                          onChange={(event) => {
                            onChange(event.target.files);
                            setCsvFileName(event.target.files?.[0]?.name || null);
                          }}
                          className="sr-only"
                        />
                      </FormControl>
                      <FormDescription>
                        Upload a CSV with &apos;email&apos; and &apos;role&apos; columns. Use pipe
                        (|) for multiple roles.
                      </FormDescription>
                      <a
                        href={csvTemplateDataUri}
                        download="comp_invite_template.csv"
                        className="text-muted-foreground hover:text-foreground text-xs underline transition-colors"
                      >
                        Download CSV template
                      </a>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Adding Employee...' : 'Invite'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
