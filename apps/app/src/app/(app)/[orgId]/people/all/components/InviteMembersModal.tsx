'use client';

import type { Role } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { ActionResponse } from '@/actions/types';
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
import { addEmployeeWithoutInvite } from '../actions/addEmployeeWithoutInvite';
import { checkMemberStatus } from '../actions/checkMemberStatus';
import { inviteNewMember } from '../actions/inviteNewMember';
import { sendInvitationEmailToExistingMember } from '../actions/sendInvitationEmail';
import { MultiRoleCombobox } from './MultiRoleCombobox';

// --- Constants for Roles ---
const ALL_SELECTABLE_ROLES = [
  'admin',
  'auditor',
  'employee',
  'contractor',
] as const satisfies Readonly<[Role, ...Role[]]>;
type InviteRole = (typeof ALL_SELECTABLE_ROLES)[number];
const DEFAULT_ROLES: InviteRole[] = [];

const isInviteRole = (role: string, allowedRoles: InviteRole[]): role is InviteRole => {
  return allowedRoles.includes(role as InviteRole);
};

const createFormSchema = (allowedRoles: InviteRole[]) => {
  const roleEnum = z.enum(allowedRoles as [InviteRole, ...InviteRole[]]);
  const manualInviteSchema = z.object({
    email: z.string().email({ message: 'Invalid email address.' }),
    roles: z.array(roleEnum).min(1, { message: 'Please select at least one role.' }),
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
  allowedRoles: InviteRole[];
}

interface BulkInviteResultData {
  successfulInvites: number;
  failedItems: {
    input: string | { email: string; role: InviteRole | InviteRole[] };
    error: string;
  }[];
}

export function InviteMembersModal({
  open,
  onOpenChange,
  organizationId,
  allowedRoles,
}: InviteMembersModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'manual' | 'csv'>('manual');
  const [isLoading, setIsLoading] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ActionResponse<BulkInviteResultData> | null>(null);

  const normalizedAllowedRoles = allowedRoles.length > 0 ? allowedRoles : [...ALL_SELECTABLE_ROLES];
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

        // Process invitations
        let successCount = 0;
        const failedInvites: { email: string; error: string }[] = [];
        const emailFailedEmails: string[] = [];

        // Process each invitation sequentially
        for (const invite of values.manualInvites) {
          const hasEmployeeRoleAndNoAdmin =
            !invite.roles.includes('admin') &&
            (invite.roles.includes('employee') || invite.roles.includes('contractor'));
          try {
            if (hasEmployeeRoleAndNoAdmin) {
              const result = await addEmployeeWithoutInvite({
                organizationId,
                email: invite.email.toLowerCase(),
                roles: invite.roles,
              });
              if (!result.success) {
                failedInvites.push({
                  email: invite.email,
                  error: result.error ?? 'Failed to add employee',
                });
              } else {
                if ('emailSent' in result && result.emailSent === false) {
                  emailFailedEmails.push(invite.email);
                }
                successCount++;
              }
            } else {
              // Check member status and reactivate if needed
              const memberStatus = await checkMemberStatus({
                email: invite.email.toLowerCase(),
                organizationId,
              });

              if (memberStatus.memberExists && memberStatus.isActive) {
                // Member already exists and is active - send invitation email manually
                await sendInvitationEmailToExistingMember({
                  email: invite.email.toLowerCase(),
                  organizationId,
                  roles: invite.roles,
                });
              } else {
                // Member doesn't exist - use server action to send the invitation
                await inviteNewMember({
                  email: invite.email.toLowerCase(),
                  organizationId,
                  roles: invite.roles,
                });
              }
              successCount++;
            }
          } catch (error) {
            console.error(`Failed to invite ${invite.email}:`, error);
            failedInvites.push({
              email: invite.email,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        // Handle results
        if (successCount > 0) {
          toast.success(`Successfully invited ${successCount} member(s).`);

          if (failedInvites.length === 0) {
            form.reset();
            onOpenChange(false);
          }

          // Revalidate the page to refresh the member list
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

          // Track results
          let successCount = 0;
          const failedInvites: { email: string; error: string }[] = [];
          const emailFailedEmails: string[] = [];

          // Process each row
          for (const row of dataRows) {
            const columns = row.split(',').map((col) => col.trim());

            if (columns.length <= Math.max(emailIndex, roleIndex)) {
              failedInvites.push({
                email: columns[emailIndex] || 'Invalid row',
                error: 'Invalid CSV row format',
              });
              continue;
            }

            const email = columns[emailIndex];
            const roleValue = columns[roleIndex];

            // Validate email
            if (!email || !z.string().email().safeParse(email).success) {
              failedInvites.push({
                email: email || 'Invalid email',
                error: 'Invalid email format',
              });
              continue;
            }

            // Validate role(s) - split by pipe for multiple roles
            const roles = roleValue.split('|').map((r) => r.trim());
            const validRoles = roles.filter((role) => isInviteRole(role, normalizedAllowedRoles));

            if (validRoles.length === 0) {
              failedInvites.push({
                email,
                error: `Invalid role(s): ${roleValue}. Must be one of: ${normalizedAllowedRoles.join(', ')}`,
              });
              continue;
            }

            // Attempt to invite
            const hasEmployeeRoleAndNoAdmin =
              (validRoles.includes('employee') || validRoles.includes('contractor')) &&
              !validRoles.includes('admin');
            try {
              if (hasEmployeeRoleAndNoAdmin) {
                const result = await addEmployeeWithoutInvite({
                  organizationId,
                  email: email.toLowerCase(),
                  roles: validRoles,
                });
                if (!result.success) {
                  failedInvites.push({
                    email,
                    error: result.error ?? 'Failed to add employee',
                  });
                } else {
                  if ('emailSent' in result && result.emailSent === false) {
                    emailFailedEmails.push(email);
                  }
                  successCount++;
                }
              } else {
                // Check member status and reactivate if needed
                const memberStatus = await checkMemberStatus({
                  email: email.toLowerCase(),
                  organizationId,
                });

                if (memberStatus.memberExists && memberStatus.isActive) {
                  // Member already exists and is active - send invitation email manually
                  await sendInvitationEmailToExistingMember({
                    email: email.toLowerCase(),
                    organizationId,
                    roles: validRoles,
                  });
                } else {
                  // Member doesn't exist - use server action to send the invitation
                  await inviteNewMember({
                    email: email.toLowerCase(),
                    organizationId,
                    roles: validRoles,
                  });
                }
                successCount++;
              }
            } catch (error) {
              console.error(`Failed to invite ${email}:`, error);
              failedInvites.push({
                email,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }

          // Handle results
          if (successCount > 0) {
            toast.success(`Successfully invited ${successCount} member(s).`);

            if (failedInvites.length === 0) {
              form.reset();
              onOpenChange(false);
            }

            // Revalidate the page to refresh the member list
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
