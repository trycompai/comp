'use client';

import { updateInherentRiskAction } from '@/actions/risk/update-inherent-risk-action';
import { updateInherentRiskSchema } from '@/actions/schema';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@comp/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Impact, Likelihood } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useQueryState } from 'nuqs';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

interface InherentRiskFormProps {
  riskId: string;
  initialProbability?: Likelihood;
  initialImpact?: Impact;
}

// Map for displaying readable labels
const LIKELIHOOD_LABELS: Record<Likelihood, string> = {
  [Likelihood.very_unlikely]: 'Very Unlikely',
  [Likelihood.unlikely]: 'Unlikely',
  [Likelihood.possible]: 'Possible',
  [Likelihood.likely]: 'Likely',
  [Likelihood.very_likely]: 'Very Likely',
};

// Map for displaying readable labels
const IMPACT_LABELS: Record<Impact, string> = {
  [Impact.insignificant]: 'Insignificant',
  [Impact.minor]: 'Minor',
  [Impact.moderate]: 'Moderate',
  [Impact.major]: 'Major',
  [Impact.severe]: 'Severe',
};

export function InherentRiskForm({
  riskId,
  initialProbability,
  initialImpact,
}: InherentRiskFormProps) {
  const [_, setOpen] = useQueryState('inherent-risk-sheet');
  const updateInherentRisk = useAction(updateInherentRiskAction, {
    onSuccess: () => {
      toast.success('Inherent risk updated successfully');
      setOpen(null);
    },
    onError: () => {
      toast.error('Failed to update inherent risk');
    },
  });

  const form = useForm<z.infer<typeof updateInherentRiskSchema>>({
    resolver: zodResolver(updateInherentRiskSchema),
    defaultValues: {
      id: riskId,
      probability: initialProbability,
      impact: initialImpact,
    },
  });

  const onSubmit = (values: z.infer<typeof updateInherentRiskSchema>) => {
    updateInherentRisk.execute(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="probability"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{'Probability'}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={'Select a probability'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(LIKELIHOOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="impact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{'Impact'}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={'Select an impact'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(IMPACT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="default"
            disabled={updateInherentRisk.status === 'executing'}
          >
            {updateInherentRisk.status === 'executing' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
