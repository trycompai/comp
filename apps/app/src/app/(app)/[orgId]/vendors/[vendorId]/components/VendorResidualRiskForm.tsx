'use client';

import { updateResidualRiskSchema } from '@/actions/schema';
import { useRiskMutations } from '@/hooks/use-risk-mutations';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@comp/ui/form';
import { Slider } from '@comp/ui/slider';
import { Impact, Likelihood } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useQueryState } from 'nuqs';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

interface ResidualRiskFormProps {
  riskId: string;
  initialProbability: number;
  initialImpact: number;
  onSuccess?: () => void;
}

interface FormData {
  probability: number;
  impact: number;
}

function mapNumericToImpact(value: number): Impact {
  if (value <= 2) return Impact.insignificant;
  if (value <= 4) return Impact.minor;
  if (value <= 6) return Impact.moderate;
  if (value <= 8) return Impact.major;
  return Impact.severe;
}

function mapNumericToLikelihood(value: number): Likelihood {
  if (value <= 2) return Likelihood.very_unlikely;
  if (value <= 4) return Likelihood.unlikely;
  if (value <= 6) return Likelihood.possible;
  if (value <= 8) return Likelihood.likely;
  return Likelihood.very_likely;
}

export function VendorResidualRiskForm({
  riskId,
  initialProbability,
  initialImpact,
}: ResidualRiskFormProps) {
  const { updateRisk } = useRiskMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_, setOpen] = useQueryState('residual-risk-sheet');

  const form = useForm<z.infer<typeof updateResidualRiskSchema>>({
    resolver: zodResolver(updateResidualRiskSchema),
    defaultValues: {
      id: riskId,
      probability: initialProbability ? initialProbability : 0,
      impact: initialImpact ? initialImpact : 0,
    },
  });

  const onSubmit = async (data: z.infer<typeof updateResidualRiskSchema>) => {
    setIsSubmitting(true);
    try {
      await updateRisk(data.id, {
        residualLikelihood: mapNumericToLikelihood(data.probability),
        residualImpact: mapNumericToImpact(data.impact),
      });
      toast.success('Residual risk updated successfully');
      setOpen(null);
    } catch {
      toast.error('Failed to update residual risk');
    } finally {
      setIsSubmitting(false);
    }
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
              <FormControl>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[field.value]}
                  onValueChange={(value) => field.onChange(value[0])}
                  className="py-4"
                />
              </FormControl>
              <FormDescription className="text-right">{field.value} / 10</FormDescription>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="impact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{'Impact'}</FormLabel>
              <FormControl>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[field.value]}
                  onValueChange={(value) => field.onChange(value[0])}
                  className="py-4"
                />
              </FormControl>
              <FormDescription className="text-right">{field.value} / 10</FormDescription>
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="default"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
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
