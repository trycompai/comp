'use client';

import type { OnboardingFormFields } from '@/app/(app)/setup/components/OnboardingStepInput';
import { companyDetailsSchema, steps } from '@/app/(app)/setup/lib/constants';
import type { CompanyDetails } from '@/app/(app)/setup/lib/types';
import { trackEvent, trackOnboardingEvent } from '@/utils/tracking';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { completeOnboarding } from '../actions/complete-onboarding';

interface UsePostPaymentOnboardingProps {
  organizationId: string;
  organizationName: string;
  initialData?: Record<string, any>;
}

// Use steps 4-12 (post-payment steps)
const postPaymentSteps = steps.slice(3);

export function usePostPaymentOnboarding({
  organizationId,
  organizationName,
  initialData = {},
}: UsePostPaymentOnboardingProps) {
  const router = useRouter();

  // Initialize with any saved data, including organization name
  const [savedAnswers, setSavedAnswers] = useState<Partial<CompanyDetails>>({
    ...initialData,
    organizationName,
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const step = postPaymentSteps[stepIndex];
  const stepSchema = z.object({
    [step.key]: companyDetailsSchema.shape[step.key],
  });

  const form = useForm<OnboardingFormFields>({
    resolver: zodResolver(stepSchema),
    mode: 'onSubmit',
    defaultValues: { [step.key]: savedAnswers[step.key] || '' },
  });

  // Reset form when step changes
  useEffect(() => {
    form.reset({ [step.key]: savedAnswers[step.key] || '' });
  }, [savedAnswers, step.key, form]);

  // Track onboarding start
  useEffect(() => {
    trackEvent('onboarding_started', {
      event_category: 'onboarding',
      organization_id: organizationId,
      phase: 'post_payment',
    });
  }, [organizationId]);

  const completeOnboardingAction = useAction(completeOnboarding, {
    onSuccess: async ({ data }) => {
      if (data?.success && data?.redirectUrl) {
        setIsFinalizing(true);

        // Track completion
        trackEvent('onboarding_completed', {
          event_category: 'onboarding',
          organization_id: organizationId,
          flow_type: 'post_payment',
          total_steps: steps.length,
        });

        // Redirect to the organization dashboard
        router.push(data.redirectUrl);
      } else {
        toast.error('Failed to complete onboarding');
        setIsFinalizing(false);
        setIsOnboarding(false);
      }
    },
    onError: () => {
      toast.error('Failed to complete onboarding');
      setIsFinalizing(false);
      setIsOnboarding(false);
    },
    onExecute: () => {
      setIsOnboarding(true);
    },
  });

  const handleCompleteOnboarding = (allAnswers: Partial<CompanyDetails>) => {
    completeOnboardingAction.execute({
      organizationId,
      describe: allAnswers.describe || '',
      industry: allAnswers.industry || '',
      teamSize: allAnswers.teamSize || '',
      devices: allAnswers.devices || '',
      authentication: allAnswers.authentication || '',
      software: allAnswers.software || '',
      workLocation: allAnswers.workLocation || '',
      infrastructure: allAnswers.infrastructure || '',
      dataTypes: allAnswers.dataTypes || '',
    });
  };

  const onSubmit = (data: OnboardingFormFields) => {
    const newAnswers: OnboardingFormFields = { ...savedAnswers, ...data };

    // Handle multi-select fields with "Other" option
    for (const key of Object.keys(newAnswers)) {
      if (step.options && step.key === key && key !== 'frameworkIds') {
        const customValue = newAnswers[`${key}Other`] || '';
        const values = (newAnswers[key] || '').split(',').filter(Boolean);

        if (customValue) {
          values.push(customValue);
        }

        newAnswers[key] = values
          .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i && v !== '')
          .join(',');
        delete newAnswers[`${key}Other`];
      }
    }

    setSavedAnswers(newAnswers as Partial<CompanyDetails>);

    // Track step completion
    trackOnboardingEvent(step.key, stepIndex + 4, {
      // +4 because we're starting at step 4
      step_value: data[step.key],
      phase: 'post_payment',
    });

    if (stepIndex < postPaymentSteps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleCompleteOnboarding(newAnswers);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      // Save current form values before going back
      const currentValues = form.getValues();
      if (currentValues[step.key]) {
        setSavedAnswers({ ...savedAnswers, [step.key]: currentValues[step.key] });
      }

      // Clear form errors
      form.clearErrors();

      // Go to previous step
      setStepIndex(stepIndex - 1);
    }
  };

  const isLastStep = stepIndex === postPaymentSteps.length - 1;

  return {
    stepIndex,
    steps: postPaymentSteps,
    step,
    form,
    savedAnswers,
    isOnboarding,
    isFinalizing,
    onSubmit,
    handleBack,
    isLastStep,
    currentStepNumber: stepIndex + 4, // Display as steps 4-12
    totalSteps: steps.length, // Total 12 steps
  };
}
