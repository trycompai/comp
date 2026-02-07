'use client';

import { updateOrganizationEvidenceApprovalAction } from '@/actions/organization/update-organization-evidence-approval-action';
import { organizationEvidenceApprovalSchema } from '@/actions/schema';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@comp/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Switch } from '@trycompai/design-system';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

export function UpdateOrganizationEvidenceApproval({
  evidenceApprovalEnabled,
}: {
  evidenceApprovalEnabled: boolean;
}) {
  const updateEvidenceApproval = useAction(updateOrganizationEvidenceApprovalAction, {
    onSuccess: () => {
      toast.success('Evidence approval setting updated');
    },
    onError: () => {
      toast.error('Error updating evidence approval setting');
    },
  });

  const form = useForm<z.infer<typeof organizationEvidenceApprovalSchema>>({
    resolver: zodResolver(organizationEvidenceApprovalSchema),
    defaultValues: {
      evidenceApprovalEnabled,
    },
  });

  const onSubmit = (data: z.infer<typeof organizationEvidenceApprovalSchema>) => {
    updateEvidenceApproval.execute(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="max-w-4xl space-y-6 pt-4">
          <FormField
            control={form.control}
            name="evidenceApprovalEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Evidence Approval</div>
                  <div className="text-muted-foreground text-sm leading-relaxed">
                    When enabled, evidence tasks can be submitted for review before being marked as done.
                    An approver can be assigned to each task who must approve the evidence before completion.
                  </div>
                  {updateEvidenceApproval.status === 'executing' && (
                    <div className="flex items-center text-muted-foreground text-xs pt-1">
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      Saving...
                    </div>
                  )}
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      form.handleSubmit(onSubmit)();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}
