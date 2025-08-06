'use client';

import { updateVendorInherentRisk } from '@/app/(app)/[orgId]/vendors/[vendorId]/actions/update-vendor-inherent-risk';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { useToast } from '@comp/ui/use-toast';
import { Impact, Likelihood } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { T, useGT } from 'gt-next';
import { useQueryState } from 'nuqs';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const formSchema = z.object({
  inherentProbability: z.nativeEnum(Likelihood),
  inherentImpact: z.nativeEnum(Impact),
});

type FormValues = z.infer<typeof formSchema>;

interface InherentRiskFormProps {
  vendorId: string;
  initialProbability?: Likelihood;
  initialImpact?: Impact;
}

export function InherentRiskForm({
  vendorId,
  initialProbability = Likelihood.very_unlikely,
  initialImpact = Impact.insignificant,
}: InherentRiskFormProps) {
  const { toast } = useToast();
  const [_, setOpen] = useQueryState('inherent-risk-sheet');
  const t = useGT();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inherentProbability: initialProbability,
      inherentImpact: initialImpact,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await updateVendorInherentRisk({
        vendorId,
        inherentProbability: values.inherentProbability,
        inherentImpact: values.inherentImpact,
      });

      toast({
        title: t('Success'),
        description: t('Inherent risk updated successfully'),
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
          name="inherentProbability"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <T>Inherent Probability</T>
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select a probability')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={Likelihood.very_likely}>
                    <T>Very Likely</T>
                  </SelectItem>
                  <SelectItem value={Likelihood.likely}>
                    <T>Likely</T>
                  </SelectItem>
                  <SelectItem value={Likelihood.possible}>
                    <T>Possible</T>
                  </SelectItem>
                  <SelectItem value={Likelihood.unlikely}>
                    <T>Unlikely</T>
                  </SelectItem>
                  <SelectItem value={Likelihood.very_unlikely}>
                    <T>Very Unlikely</T>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="inherentImpact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <T>Inherent Impact</T>
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select an impact')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={Impact.insignificant}>
                    <T>Insignificant</T>
                  </SelectItem>
                  <SelectItem value={Impact.minor}>
                    <T>Minor</T>
                  </SelectItem>
                  <SelectItem value={Impact.moderate}>
                    <T>Moderate</T>
                  </SelectItem>
                  <SelectItem value={Impact.major}>
                    <T>Major</T>
                  </SelectItem>
                  <SelectItem value={Impact.severe}>
                    <T>Severe</T>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit">
            <T>Save</T>
          </Button>
        </div>
      </form>
    </Form>
  );
}
