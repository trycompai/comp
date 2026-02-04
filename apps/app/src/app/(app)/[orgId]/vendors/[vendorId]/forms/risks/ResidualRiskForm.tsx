'use client';

import { useApi } from '@/hooks/use-api';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Impact, Likelihood } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@comp/ui/button';
import { Select, SelectItem, Stack } from '@trycompai/design-system';
import { useState } from 'react';
import { useQueryState } from 'nuqs';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
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
  const api = useApi();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_, setOpen] = useQueryState('residual-risk-sheet');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      residualProbability: initialProbability,
      residualImpact: initialImpact,
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    const response = await api.patch(`/v1/vendors/${vendorId}`, {
      residualProbability: values.residualProbability,
      residualImpact: values.residualImpact,
    });
    setIsSubmitting(false);

    if (response.error) {
      toast.error('An unexpected error occurred');
      return;
    }

    toast.success('Residual risk updated successfully');
    setOpen(null);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Stack gap="4">
          <FormField
            control={form.control}
            name="residualProbability"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Residual Probability</FormLabel>
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
            name="residualImpact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Residual Impact</FormLabel>
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
