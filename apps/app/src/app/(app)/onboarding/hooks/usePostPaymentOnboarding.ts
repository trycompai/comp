'use client';

import type { OnboardingFormFields } from '@/app/(app)/setup/components/OnboardingStepInput';
import { useLocalStorage } from '@/app/(app)/setup/hooks/useLocalStorage';
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

  // Create storage keys specific to this organization
  const storageKey = `onboarding-progress-${organizationId}`;
  const stepStorageKey = `onboarding-step-${organizationId}`;

  // Use localStorage to persist progress
  const [savedAnswers, setSavedAnswers] = useLocalStorage<Partial<CompanyDetails>>(storageKey, {
    ...initialData,
    organizationName,
  });

  // Use localStorage to persist current step
  const [savedStepIndex, setSavedStepIndex] = useLocalStorage<number>(stepStorageKey, 0);

  const [isLoading, setIsLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Initialize step index after component mounts to prevent flicker
  useEffect(() => {
    // Use saved step index, but also verify it makes sense
    // (e.g., don't jump to step 7 if steps 4-6 aren't answered)
    const firstUnansweredIndex = postPaymentSteps.findIndex((step) => !savedAnswers[step.key]);

    // Use the saved step index if it's valid, otherwise use first unanswered
    const initialStep =
      savedStepIndex >= 0 && savedStepIndex < postPaymentSteps.length
        ? savedStepIndex
        : firstUnansweredIndex === -1
          ? 0
          : firstUnansweredIndex;

    setStepIndex(initialStep);
    setIsLoading(false);
  }, [savedAnswers, savedStepIndex]);

  const step = postPaymentSteps[stepIndex];
  const stepSchema = z.object({
    [step.key]: companyDetailsSchema.shape[step.key],
  });

  const form = useForm<OnboardingFormFields>({
    resolver: zodResolver(stepSchema),
    mode: 'onSubmit',
    defaultValues: { [step.key]: savedAnswers[step.key] || '' },
  });

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

        // Clear the saved progress from localStorage
        localStorage.removeItem(storageKey);
        localStorage.removeItem(stepStorageKey);

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
      geo: allAnswers.geo || '',
    });
  };

  const completeNow = () => {
    const currentValues = form.getValues();
    const allAnswers: Partial<CompanyDetails> = {
      ...savedAnswers,
      ...currentValues,
      organizationName,
    } as Partial<CompanyDetails>;

    handleCompleteOnboarding(allAnswers);
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

    // Always preserve organizationName
    newAnswers.organizationName = organizationName;

    setSavedAnswers(newAnswers as Partial<CompanyDetails>);

    // Track step completion
    trackOnboardingEvent(step.key, stepIndex + 1, {
      step_value: data[step.key],
      phase: 'post_payment',
    });

    if (stepIndex < postPaymentSteps.length - 1) {
      const newStepIndex = stepIndex + 1;
      setStepIndex(newStepIndex);
      setSavedStepIndex(newStepIndex);
    } else {
      handleCompleteOnboarding(newAnswers);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      // Save current form values before going back
      const currentValues = form.getValues();
      if (currentValues[step.key]) {
        setSavedAnswers({ ...savedAnswers, [step.key]: currentValues[step.key], organizationName });
      }

      // Clear form errors
      form.clearErrors();

      // Go to previous step
      const newStepIndex = stepIndex - 1;
      setStepIndex(newStepIndex);
      setSavedStepIndex(newStepIndex);
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
    isLoading,
    onSubmit,
    handleBack,
    isLastStep,
    currentStepNumber: stepIndex + 1, // Display as steps 1-9
    totalSteps: postPaymentSteps.length, // Total 9 steps for post-payment
    completeNow,
  };
}
