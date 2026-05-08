'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import {
  Alert,
  Button,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Warning } from '@trycompai/design-system/icons';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import useSWR, { mutate as mutateGlobal } from 'swr';
import { evidenceFormDefinitionList } from '../forms';

interface DocumentSetting {
  formType: string;
  isNotRelevant: boolean;
  updatedAt: string | null;
}

type DocumentSettingsResponse = DocumentSetting[];

interface PendingConfirmation {
  formType: string;
  documentName: string;
}

const statusesKey = (organizationId: string) =>
  ['/v1/evidence-forms/statuses', organizationId] as const;

export function DocumentSettings({ organizationId }: { organizationId: string }) {
  const { hasPermission } = usePermissions();
  const [pendingFormType, setPendingFormType] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const canUpdate = hasPermission('evidence', 'update');

  const settingsKey = ['/v1/evidence-forms/settings', organizationId] as const;
  const { data: settings = [], mutate } = useSWR<DocumentSettingsResponse>(
    settingsKey,
    async ([endpoint, orgId]: readonly [string, string]) => {
      const response = await apiClient.get<DocumentSettingsResponse>(endpoint, orgId);
      if (response.error || !response.data) {
        throw new Error(response.error ?? 'Failed to load document settings');
      }
      return response.data;
    },
  );

  const settingsByFormType = useMemo(
    () => new Map(settings.map((setting) => [setting.formType, setting])),
    [settings],
  );

  const visibleForms = useMemo(() => evidenceFormDefinitionList.filter((form) => !form.hidden), []);

  const handleToggle = async ({
    formType,
    isNotRelevant,
  }: {
    formType: string;
    isNotRelevant: boolean;
  }) => {
    if (pendingFormType) return;
    setPendingFormType(formType);

    const previousSettings = settings;
    const nextSettings = visibleForms.map((form) => {
      const existing = settingsByFormType.get(form.type);
      if (form.type !== formType) {
        return {
          formType: form.type,
          isNotRelevant: existing?.isNotRelevant ?? false,
          updatedAt: existing?.updatedAt ?? null,
        };
      }
      return {
        formType,
        isNotRelevant,
        updatedAt: new Date().toISOString(),
      };
    });

    await mutate(nextSettings, { revalidate: false });

    try {
      const response = await apiClient.patch<DocumentSetting>(
        `/v1/evidence-forms/${formType}/settings`,
        { isNotRelevant },
        organizationId,
      );
      if (response.error || !response.data) {
        throw new Error(response.error ?? 'Failed to update document setting');
      }
      toast.success('Document setting updated');
      await mutate();
      await mutateGlobal(statusesKey(organizationId));
    } catch (error) {
      await mutate(previousSettings, { revalidate: false });
      toast.error(error instanceof Error ? error.message : 'Failed to update document setting');
    } finally {
      setPendingFormType(null);
    }
  };

  const handleRelevanceChange = ({
    checked,
    formType,
    documentName,
  }: {
    checked: boolean;
    formType: string;
    documentName: string;
  }) => {
    if (checked) {
      setPendingConfirmation({ formType, documentName });
      return;
    }

    handleToggle({ formType, isNotRelevant: false });
  };

  const handleConfirmNotRelevant = () => {
    if (!pendingConfirmation) return;
    const formType = pendingConfirmation.formType;
    setPendingConfirmation(null);
    handleToggle({ formType, isNotRelevant: true });
  };

  return (
    <>
      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Not relevant</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleForms.map((form) => {
            const setting = settingsByFormType.get(form.type);
            const isNotRelevant = setting?.isNotRelevant ?? false;
            return (
              <TableRow key={form.type}>
                <TableCell>
                  <Text size="sm" weight="medium">
                    {form.title}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text size="sm" variant="muted">
                    {form.category}
                  </Text>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={isNotRelevant}
                    disabled={!canUpdate || pendingFormType !== null}
                    aria-label={`Mark ${form.title} as not relevant`}
                    onCheckedChange={(checked) =>
                      handleRelevanceChange({
                        checked,
                        formType: form.type,
                        documentName: form.title,
                      })
                    }
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialogPrimitive.Root
        open={pendingConfirmation !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingConfirmation(null);
          }
        }}
      >
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] data-closed:animate-out data-closed:fade-out-0 data-open:animate-in data-open:fade-in-0" />
          <AlertDialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-[680px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-background shadow-xl ring-1 ring-foreground/10 outline-none data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95">
            <div className="grid gap-5 p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <Warning size={22} />
                </div>
                <div className="min-w-0 space-y-2">
                  <AlertDialogPrimitive.Title className="text-xl font-semibold leading-tight text-foreground">
                    Mark {pendingConfirmation?.documentName ?? 'this document'} as not relevant?
                  </AlertDialogPrimitive.Title>
                  <AlertDialogPrimitive.Description className="text-sm leading-6 text-muted-foreground">
                    This removes the document from completion calculations and marks linked
                    framework requirements as not relevant. Only use this when the requirement does
                    not apply to your organization or audit scope.
                  </AlertDialogPrimitive.Description>
                </div>
              </div>

              <Alert
                variant="destructive"
                title="Auditors may treat missing required documents as exceptions"
                description="If this document is expected by a framework, auditor, or customer review, marking it as not relevant can create evidence gaps and may require a written justification during an audit."
              />

              <div className="rounded-lg border bg-muted/40 px-4 py-3">
                <Text size="sm" variant="muted">
                  Continue only if you are comfortable defending why{' '}
                  {pendingConfirmation?.documentName ?? 'this document'} is outside the scope of
                  your compliance program.
                </Text>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t bg-muted/50 p-4 sm:flex-row sm:justify-end sm:px-7">
              <AlertDialogPrimitive.Close render={<Button variant="secondary" />}>
                Cancel
              </AlertDialogPrimitive.Close>
              <Button variant="destructive" onClick={handleConfirmNotRelevant}>
                Mark as not relevant
              </Button>
            </div>
          </AlertDialogPrimitive.Popup>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>
    </>
  );
}
