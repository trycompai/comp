'use client';

import { updateResidualRiskEnumAction } from '@/actions/risk/update-residual-risk-enum-action';
import { getUpdateResidualRiskEnumSchema } from '@/actions/schema';
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

interface ResidualRiskFormProps {
  riskId: string;
  initialProbability?: Likelihood;
  initialImpact?: Impact;
  onSuccess?: () => void;
}

const getLikelihoodLabels = (
  t: (content: string, options?: InlineTranslationOptions) => string,
): Record<Likelihood, string> => ({
  [Likelihood.very_unlikely]: t('Very Unlikely'),
  [Likelihood.unlikely]: t('Unlikely'),
  [Likelihood.possible]: t('Possible'),
  [Likelihood.likely]: t('Likely'),
  [Likelihood.very_likely]: t('Very Likely'),
});

const getImpactLabels = (
  t: (content: string, options?: InlineTranslationOptions) => string,
): Record<Impact, string> => ({
  [Impact.insignificant]: t('Insignificant'),
  [Impact.minor]: t('Minor'),
  [Impact.moderate]: t('Moderate'),
  [Impact.major]: t('Major'),
  [Impact.severe]: t('Severe'),
});

export function ResidualRiskForm({
  riskId,
  initialProbability,
  initialImpact,
}: ResidualRiskFormProps) {
  const [_, setOpen] = useQueryState('residual-risk-sheet');
  const t = useGT();
  const updateResidualRiskEnumSchema = React.useMemo(() => getUpdateResidualRiskEnumSchema(t), [t]);
  const likelihoodLabels = getLikelihoodLabels(t);
  const impactLabels = getImpactLabels(t);

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
      toast.success(t('Residual risk updated successfully'));
      setOpen(null);
    },
    onError: () => {
      toast.error(t('Failed to update residual risk'));
    },
  });

  const onSubmit = (data: z.infer<ReturnType<typeof getUpdateResidualRiskEnumSchema>>) => {
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
            disabled={updateResidualRisk.status === 'executing'}
          >
            {updateResidualRisk.status === 'executing' ? (
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
