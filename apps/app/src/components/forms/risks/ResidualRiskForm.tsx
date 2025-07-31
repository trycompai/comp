'use client';

import { updateResidualRiskEnumAction } from '@/actions/risk/update-residual-risk-enum-action';
import { updateResidualRiskEnumSchema } from '@/actions/schema';
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

interface ResidualRiskFormProps {
  riskId: string;
  initialProbability?: Likelihood;
  initialImpact?: Impact;
  onSuccess?: () => void;
}

const LIKELIHOOD_LABELS: Record<Likelihood, string> = {
  [Likelihood.very_unlikely]: 'Very Unlikely',
  [Likelihood.unlikely]: 'Unlikely',
  [Likelihood.possible]: 'Possible',
  [Likelihood.likely]: 'Likely',
  [Likelihood.very_likely]: 'Very Likely',
};

const IMPACT_LABELS: Record<Impact, string> = {
  [Impact.insignificant]: 'Insignificant',
  [Impact.minor]: 'Minor',
  [Impact.moderate]: 'Moderate',
  [Impact.major]: 'Major',
  [Impact.severe]: 'Severe',
};

export function ResidualRiskForm({
  riskId,
  initialProbability,
  initialImpact,
}: ResidualRiskFormProps) {
  const [_, setOpen] = useQueryState('residual-risk-sheet');

  const form = useForm<z.infer<typeof updateResidualRiskEnumSchema>>({
    resolver: zodResolver(updateResidualRiskEnumSchema),
    defaultValues: {
      id: riskId,
      probability: initialProbability,
      impact: initialImpact,
    },
  });

  const updateResidualRisk = useAction(updateResidualRiskEnumAction, {
    onSuccess: () => {
      toast.success('Residual risk updated successfully');
      setOpen(null);
    },
    onError: () => {
      toast.error('Failed to update residual risk');
    },
  });

  const onSubmit = (data: z.infer<typeof updateResidualRiskEnumSchema>) => {
    updateResidualRisk.execute(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            disabled={updateResidualRisk.status === 'executing'}
          >
            {updateResidualRisk.status === 'executing' ? (
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
