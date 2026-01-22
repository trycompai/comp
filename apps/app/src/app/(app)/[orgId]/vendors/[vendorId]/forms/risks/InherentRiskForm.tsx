'use client';

import { updateVendorInherentRisk } from '@/app/(app)/[orgId]/vendors/[vendorId]/actions/update-vendor-inherent-risk';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Impact, Likelihood } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@comp/ui/button';
import { Select, SelectItem, Stack } from '@trycompai/design-system';
import { useQueryState } from 'nuqs';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
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
  const [_, setOpen] = useQueryState('inherent-risk-sheet');

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

      toast.success('Inherent risk updated successfully');
      setOpen(null);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('An unexpected error occurred');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Stack gap="4">
          <FormField
            control={form.control}
            name="inherentProbability"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inherent Probability</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectItem value={Likelihood.very_likely}>Very Likely</SelectItem>
                    <SelectItem value={Likelihood.likely}>Likely</SelectItem>
                    <SelectItem value={Likelihood.possible}>Possible</SelectItem>
                    <SelectItem value={Likelihood.unlikely}>Unlikely</SelectItem>
                    <SelectItem value={Likelihood.very_unlikely}>Very Unlikely</SelectItem>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="inherentImpact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inherent Impact</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectItem value={Impact.insignificant}>Insignificant</SelectItem>
                    <SelectItem value={Impact.minor}>Minor</SelectItem>
                    <SelectItem value={Impact.moderate}>Moderate</SelectItem>
                    <SelectItem value={Impact.major}>Major</SelectItem>
                    <SelectItem value={Impact.severe}>Severe</SelectItem>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end pt-4">
            <Button type="submit">Save</Button>
          </div>
        </Stack>
      </form>
    </Form>
  );
}
