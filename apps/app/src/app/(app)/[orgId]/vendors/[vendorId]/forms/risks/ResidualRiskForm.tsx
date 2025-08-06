'use client';

import { updateVendorResidualRisk } from '@/app/(app)/[orgId]/vendors/[vendorId]/actions/update-vendor-residual-risk';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { useToast } from '@comp/ui/use-toast';
import { Impact, Likelihood } from '@db';
import { T, useGT } from 'gt-next';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryState } from 'nuqs';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const formSchema = z.object({
  residualProbability: z.nativeEnum(Likelihood),
  residualImpact: z.nativeEnum(Impact),
});

type FormValues = z.infer<typeof formSchema>;

interface ResidualRiskFormProps {
  vendorId: string;
  initialProbability?: Likelihood;
  initialImpact?: Impact;
}

export function ResidualRiskForm({
  vendorId,
  initialProbability = Likelihood.very_unlikely,
  initialImpact = Impact.insignificant,
}: ResidualRiskFormProps) {
  const t = useGT();
  const { toast } = useToast();
  const [_, setOpen] = useQueryState('residual-risk-sheet');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      residualProbability: initialProbability,
      residualImpact: initialImpact,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      // Call the server action
      const response = await updateVendorResidualRisk({
        vendorId,
        residualProbability: values.residualProbability,
        residualImpact: values.residualImpact,
      });

      toast({
        title: t('Success'),
        description: t('Residual risk updated successfully'),
      });

      setOpen('false');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: t('Error'),
        description: t('An unexpected error occurred'),
        variant: 'destructive',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="residualProbability"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Residual Probability')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select a probability')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={Likelihood.very_likely}>{t('Very Likely')}</SelectItem>
                  <SelectItem value={Likelihood.likely}>{t('Likely')}</SelectItem>
                  <SelectItem value={Likelihood.possible}>{t('Possible')}</SelectItem>
                  <SelectItem value={Likelihood.unlikely}>{t('Unlikely')}</SelectItem>
                  <SelectItem value={Likelihood.very_unlikely}>{t('Very Unlikely')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="residualImpact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Residual Impact')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select an impact')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={Impact.insignificant}>{t('Insignificant')}</SelectItem>
                  <SelectItem value={Impact.minor}>{t('Minor')}</SelectItem>
                  <SelectItem value={Impact.moderate}>{t('Moderate')}</SelectItem>
                  <SelectItem value={Impact.major}>{t('Major')}</SelectItem>
                  <SelectItem value={Impact.severe}>{t('Severe')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit">{t('Save')}</Button>
        </div>
      </form>
    </Form>
  );
}
