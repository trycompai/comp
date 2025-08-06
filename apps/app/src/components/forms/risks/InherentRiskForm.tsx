'use client';

import { updateInherentRiskAction } from '@/actions/risk/update-inherent-risk-action';
import { getUpdateInherentRiskSchema } from '@/actions/schema';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@comp/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Impact, Likelihood } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGT } from 'gt-next';
import type { InlineTranslationOptions } from 'gt-next/types';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useQueryState } from 'nuqs';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

interface InherentRiskFormProps {
  riskId: string;
  initialProbability?: Likelihood;
  initialImpact?: Impact;
}

// Map for displaying readable labels
const getLikelihoodLabels = (
  t: (content: string, options?: InlineTranslationOptions) => string,
): Record<Likelihood, string> => ({
  [Likelihood.very_unlikely]: t('Very Unlikely'),
  [Likelihood.unlikely]: t('Unlikely'),
  [Likelihood.possible]: t('Possible'),
  [Likelihood.likely]: t('Likely'),
  [Likelihood.very_likely]: t('Very Likely'),
});

// Map for displaying readable labels
const getImpactLabels = (
  t: (content: string, options?: InlineTranslationOptions) => string,
): Record<Impact, string> => ({
  [Impact.insignificant]: t('Insignificant'),
  [Impact.minor]: t('Minor'),
  [Impact.moderate]: t('Moderate'),
  [Impact.major]: t('Major'),
  [Impact.severe]: t('Severe'),
});

export function InherentRiskForm({
  riskId,
  initialProbability,
  initialImpact,
}: InherentRiskFormProps) {
  const [_, setOpen] = useQueryState('inherent-risk-sheet');
  const t = useGT();
  const updateInherentRiskSchema = React.useMemo(() => getUpdateInherentRiskSchema(t), [t]);
  const likelihoodLabels = getLikelihoodLabels(t);
  const impactLabels = getImpactLabels(t);
  const updateInherentRisk = useAction(updateInherentRiskAction, {
    onSuccess: () => {
      toast.success(t('Inherent risk updated successfully'));
      setOpen(null);
    },
    onError: () => {
      toast.error(t('Failed to update inherent risk'));
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

  const onSubmit = (values: z.infer<ReturnType<typeof getUpdateInherentRiskSchema>>) => {
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
              <FormLabel>{t('Probability')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select a probability')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(likelihoodLabels).map(([value, label]) => (
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
              <FormLabel>{t('Impact')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select an impact')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(impactLabels).map(([value, label]) => (
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
              t('Save')
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
