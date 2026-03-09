'use client';

import { api } from '@/lib/api-client';
import type { Role } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import useSWR from 'swr';
import { z } from 'zod';

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
import { MultiRoleCombobox } from './MultiRoleCombobox';

// --- Constants for Roles ---
const BUILT_IN_SELECTABLE_ROLES: Role[] = ['admin', 'auditor', 'employee', 'contractor'];
const DEFAULT_ROLES: string[] = [];

const isAllowedRole = (role: string, allowedRoles: string[]): boolean => {
  return allowedRoles.includes(role);
};

const createFormSchema = (allowedRoles: string[]) => {
  const roleValidator = z.string().refine((val) => allowedRoles.includes(val), {
    message: 'Invalid role selection.',
  });
  const manualInviteSchema = z.object({
    email: z.string().email({ message: 'Invalid email address.' }),
    roles: z.array(roleValidator).min(1, { message: 'Please select at least one role.' }),
  });

  const manualModeSchema = z.object({
    mode: z.literal('manual'),
    manualInvites: z
      .array(manualInviteSchema)
      .min(1, { message: 'Please add at least one invite.' }),
    csvFile: z.any().optional(), // Optional here, validated by union
  });

  const csvModeSchema = z.object({
    mode: z.literal('csv'),
    manualInvites: z.array(manualInviteSchema).optional(), // Optional here
    csvFile: z.any().refine((val) => val instanceof FileList && val.length === 1, {
      message: 'Please select a single CSV file.',
    }),
  });

  return z.discriminatedUnion('mode', [manualModeSchema, csvModeSchema]);
};

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

interface InviteMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  allowedBuiltInRoles: Role[];
}

export function InviteMembersModal({
  open,
  onOpenChange,
  organizationId,
  allowedBuiltInRoles,
}: InviteMembersModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'manual' | 'csv'>('manual');
  const [isLoading, setIsLoading] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);

  // Fetch custom roles from the API
  const { data: customRolesData } = useSWR(
    open ? `/v1/roles` : null,
    async (endpoint: string) => {
      const res = await api.get<{ customRoles: Array<{ id: string; name: string; permissions: Record<string, string[]> }> }>(endpoint);
      return res.data?.customRoles ?? [];
    },
  );
  const customRoles = customRolesData ?? [];
  const customRoleNames = customRoles.map((r) => r.name);

  const normalizedAllowedRoles = [
    ...(allowedBuiltInRoles.length > 0 ? allowedBuiltInRoles : BUILT_IN_SELECTABLE_ROLES),
    ...customRoleNames,
  ];
  const formSchema = useMemo(
    () => createFormSchema(normalizedAllowedRoles),
    [normalizedAllowedRoles.join(',')],
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: 'manual',
      manualInvites: [
        {
          email: '',
          roles: DEFAULT_ROLES,
        },
      ],
      csvFile: undefined,
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'manualInvites',
  });

  async function onSubmit(values: FormData) {
    console.log('onSubmit triggered', { values });
    setIsLoading(true);

    try {
      if (values.mode === 'manual') {
        console.log('Processing manual mode');
        if (!values.manualInvites || values.manualInvites.length === 0) {
          console.error('Manual mode validation failed: No invites.');
          toast.error('Please add at least one member to invite.');
          setIsLoading(false);
          return;
        }

        const invalidInvites = values.manualInvites.filter(
          (invite) => !invite.roles || invite.roles.length === 0,
        );
        if (invalidInvites.length > 0) {
          console.error(
            `Manual mode validation failed: No roles selected for: ${invalidInvites.map((i) => i.email || 'invite').join(', ')}`,
          );
          toast.error(
            `Please select at least one role for: ${invalidInvites.map((i) => i.email || 'invite').join(', ')}`,
          );
          setIsLoading(false);
          return;
        }

        // Send all invites to the API in one call
        const invitePayload = values.manualInvites.map((invite) => ({
          email: invite.email.toLowerCase(),
          roles: invite.roles,
        }));

        const { data, error } = await api.post<{
          results: Array<{
            email: string;
            success: boolean;
            error?: string;
            emailSent?: boolean;
          }>;
        }>('/v1/people/invite', { invites: invitePayload });

        if (error || !data?.results) {
          toast.error('Failed to process invitations.');
          setIsLoading(false);
          return;
        }

        const results = data.results;
        const successCount = results.filter((r) => r.success).length;
        const failedInvites = results.filter((r) => !r.success);
        const emailFailedEmails = results
          .filter((r) => r.success && r.emailSent === false)
          .map((r) => r.email);

        if (successCount > 0) {
          toast.success(`Successfully invited ${successCount} member(s).`);

          if (failedInvites.length === 0) {
            form.reset();
            onOpenChange(false);
          }

          router.refresh();
        }

        if (failedInvites.length > 0) {
          toast.error(
            `Failed to invite ${failedInvites.length} member(s): ${failedInvites.map((f) => f.email).join(', ')}`,
          );
        }

        if (emailFailedEmails.length > 0) {
          toast.warning(
            `${emailFailedEmails.length} member(s) added but invite email could not be sent: ${emailFailedEmails.join(', ')}. You can resend from the team page.`,
          );
        }
      } else if (values.mode === 'csv') {
        // Handle CSV file uploads
        console.log('Processing CSV mode');

        // Validate file exists and is valid
        if (
          !values.csvFile ||
          !(values.csvFile instanceof FileList) ||
          values.csvFile.length !== 1
        ) {
          console.error('CSV mode validation failed: No valid file selected.');
          form.setError('csvFile', {
            message: 'A valid CSV file is required.',
          });
          setIsLoading(false);
          return;
        }

        const file = values.csvFile[0];
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
          console.error('CSV mode validation failed: Incorrect file type.', {
            type: file.type,
          });
          form.setError('csvFile', {
            message: 'File must be a CSV.',
          });
          setIsLoading(false);
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          console.error('CSV mode validation failed: File too large.', {
            size: file.size,
          });
          form.setError('csvFile', {
            message: 'File size must be less than 5MB.',
          });
          setIsLoading(false);
          return;
        }

        try {
          // Parse CSV file
          const text = await file.text();
          const lines = text.split('\n');

          // Skip header row, process each line
          const header = lines[0].toLowerCase();
          if (!header.includes('email') || !header.includes('role')) {
            toast.error(
              "Invalid CSV format. The first row must include 'email' and 'role' columns.",
            );
            setIsLoading(false);
            return;
          }

          // Parse header to find column indexes
          const headers = header.split(',').map((h) => h.trim());
          const emailIndex = headers.findIndex((h) => h === 'email');
          const roleIndex = headers.findIndex((h) => h === 'role');

          if (emailIndex === -1 || roleIndex === -1) {
            toast.error("CSV must contain 'email' and 'role' columns.");
            setIsLoading(false);
            return;
          }

          // Process rows
          const dataRows = lines.slice(1).filter((line) => line.trim() !== '');

          if (dataRows.length === 0) {
            toast.error('CSV file does not contain any data rows.');
            setIsLoading(false);
            return;
          }

          // Parse CSV rows into invite items, validating locally first
          const csvInvites: Array<{ email: string; roles: string[] }> = [];
          const clientErrors: { email: string; error: string }[] = [];

          for (const row of dataRows) {
            const columns = row.split(',').map((col) => col.trim());

            if (columns.length <= Math.max(emailIndex, roleIndex)) {
              clientErrors.push({
                email: columns[emailIndex] || 'Invalid row',
                error: 'Invalid CSV row format',
              });
              continue;
            }

            const email = columns[emailIndex];
            const roleValue = columns[roleIndex];

            if (!email || !z.string().email().safeParse(email).success) {
              clientErrors.push({
                email: email || 'Invalid email',
                error: 'Invalid email format',
              });
              continue;
            }

            const roles = roleValue.split('|').map((r) => r.trim().toLowerCase());
            const validRoles = roles.filter((role) => isAllowedRole(role, normalizedAllowedRoles));

            if (validRoles.length === 0) {
              clientErrors.push({
                email,
                error: `Invalid role(s): ${roleValue}. Must be one of: ${normalizedAllowedRoles.join(', ')}`,
              });
              continue;
            }

            csvInvites.push({ email: email.toLowerCase(), roles: validRoles });
          }

          if (clientErrors.length > 0) {
            toast.error(
              `${clientErrors.length} row(s) had validation errors: ${clientErrors.map((e) => e.email).join(', ')}`,
            );
          }

          if (csvInvites.length > 0) {
            const { data: csvData, error: csvApiError } = await api.post<{
              results: Array<{
                email: string;
                success: boolean;
                error?: string;
                emailSent?: boolean;
              }>;
            }>('/v1/people/invite', { invites: csvInvites });

            if (csvApiError || !csvData?.results) {
              toast.error('Failed to process CSV invitations.');
              setIsLoading(false);
              return;
            }

            const results = csvData.results;
            const successCount = results.filter((r) => r.success).length;
            const failedInvites = results.filter((r) => !r.success);
            const emailFailedEmails = results
              .filter((r) => r.success && r.emailSent === false)
              .map((r) => r.email);

            if (successCount > 0) {
              toast.success(`Successfully invited ${successCount} member(s).`);

              if (failedInvites.length === 0 && clientErrors.length === 0) {
                form.reset();
                onOpenChange(false);
              }

              router.refresh();
            }

            if (failedInvites.length > 0) {
              toast.error(
                `Failed to invite ${failedInvites.length} member(s): ${failedInvites.map((f) => f.email).join(', ')}`,
              );
            }

            if (emailFailedEmails.length > 0) {
              toast.warning(
                `${emailFailedEmails.length} member(s) added but invite email could not be sent: ${emailFailedEmails.join(', ')}. You can resend from the team page.`,
              );
            }
          }
        } catch (csvError) {
          console.error('Error parsing CSV:', csvError);
          toast.error('Failed to parse CSV file. Please check the format.');
        }
      }
    } catch (error) {
      console.error('Error processing invitations:', error);
      toast.error('An unexpected error occurred while processing invitations.');
    } finally {
      setIsLoading(false);
    }
  }

  const handleModeChange = (newMode: string) => {
    if (newMode === 'manual' || newMode === 'csv') {
      setMode(newMode);
      form.setValue('mode', newMode, { shouldValidate: true });

      if (newMode === 'manual') {
        if (fields.length === 0) {
          append({ email: '', roles: DEFAULT_ROLES });
        }
        form.setValue('csvFile', undefined);
        setCsvFileName(null);
      } else if (newMode === 'csv') {
        form.setValue('manualInvites', undefined);
      }

      form.clearErrors();
    }
  };

  const csvTemplate = useMemo(() => {
    const primaryRole = normalizedAllowedRoles[0];
    const secondaryRole = normalizedAllowedRoles[1];
    const multiRoleExample =
      normalizedAllowedRoles.length > 1 ? `${primaryRole}|${secondaryRole}` : primaryRole;

    const rows = [
      'email,role',
      `john@company.com,${primaryRole}`,
      `jane@company.com,${multiRoleExample}`,
    ];

    return rows.join('\n');
  }, [normalizedAllowedRoles]);

  const csvTemplateDataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvTemplate)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{'Add User'}</DialogTitle>
          <DialogDescription>{'Add an employee to your organization.'}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          {index === 0 && <FormLabel>{'Email'}</FormLabel>}
                          <FormControl>
                            <Input
                              className="h-10"
                              placeholder={'Enter email address'}
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
                          {index === 0 && <FormLabel>{'Role'}</FormLabel>}
                          <MultiRoleCombobox
                            selectedRoles={value || []}
                            onSelectedRolesChange={onChange}
                            allowedRoles={normalizedAllowedRoles}
                            customRoles={customRoles}
                            placeholder={'Select a role'}
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
                  onClick={() =>
                    append({
                      email: '',
                      roles: DEFAULT_ROLES,
                    })
                  }
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Another
                </Button>
                <FormDescription>{'Add an employee to your organization.'}</FormDescription>
              </TabsContent>

              <TabsContent value="csv" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="csvFile"
                  render={({ field: { onChange, value, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>{'CSV File'}</FormLabel>
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
                            const fileList = event.target.files;
                            onChange(fileList);
                            setCsvFileName(fileList?.[0]?.name || null);
                          }}
                          className="sr-only"
                        />
                      </FormControl>
                      <FormDescription>
                        {
                          "Upload a CSV file with 'email' and 'role' columns. Use pipe (|) to separate multiple roles (e.g., employee|admin)."
                        }
                      </FormDescription>
                      <a
                        href={csvTemplateDataUri}
                        download="comp_invite_template.csv"
                        className="text-muted-foreground hover:text-foreground text-xs underline transition-colors"
                      >
                        {'Download CSV template'}
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
                {'Cancel'}
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
