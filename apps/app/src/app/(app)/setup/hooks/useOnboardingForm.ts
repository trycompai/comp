'use client';

import { trackEvent, trackOnboardingEvent } from '@/utils/tracking';
import { zodResolver } from '@hookform/resolvers/zod';
import { sendGTMEvent } from '@next/third-parties/google';
import { useAction } from 'next-safe-action/hooks';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { createOrganizationMinimal } from '../actions/create-organization-minimal';
import type { OnboardingFormFields } from '../components/OnboardingStepInput';
import { companyDetailsSchema, steps } from '../lib/constants';
import { updateSetupSession } from '../lib/setup-session';
import type { CompanyDetails } from '../lib/types';

interface UseOnboardingFormProps {
  setupId?: string;
  initialData?: Record<string, any>;
  currentStep?: string;
}

// Only use the first 3 steps for the minimal flow
const prePaymentSteps = steps.slice(0, 3);

export function useOnboardingForm({
  setupId,
  initialData,
  currentStep,
}: UseOnboardingFormProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper to build URL with search params
  const buildUrlWithParams = (path: string, params?: Record<string, string>) => {
    const urlParams = new URLSearchParams();

    // First add the params from the response if any
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        urlParams.append(key, value);
      });
    } else {
      // Otherwise use current search params
      searchParams.forEach((value, key) => {
        urlParams.append(key, value);
      });
    }

    const queryString = urlParams.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  // Use state instead of localStorage - initialized from KV data if setupId exists
  const [savedAnswers, setSavedAnswers] = useState<Partial<CompanyDetails>>(
    setupId && initialData ? initialData : {},
  );

  // Determine the initial step index based on currentStep
  const initialStepIndex = currentStep
    ? prePaymentSteps.findIndex((s) => s.key === currentStep)
    : 0;

  const [stepIndex, setStepIndex] = useState(Math.max(0, initialStepIndex));
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track when user starts onboarding
  useEffect(() => {
    if (mounted && stepIndex === 0 && !savedAnswers.frameworkIds) {
      trackEvent('onboarding_started', {
        event_category: 'onboarding',
        setup_id: setupId,
      });
    }
  }, [mounted, stepIndex, savedAnswers.frameworkIds, setupId]);

  // Save progress to KV if we have a setupId
  useEffect(() => {
    if (setupId && mounted) {
      const currentStepKey = prePaymentSteps[stepIndex]?.key;
      updateSetupSession(setupId, {
        currentStep: currentStepKey,
        formData: savedAnswers as Record<string, any>,
      });
    }
  }, [setupId, stepIndex, savedAnswers, mounted]);

  const step = prePaymentSteps[stepIndex];
  const stepSchema = z.object({
    [step.key]: companyDetailsSchema.shape[step.key],
  });

  const form = useForm<OnboardingFormFields>({
    resolver: zodResolver(stepSchema),
    mode: 'onSubmit',
    defaultValues: { [step.key]: savedAnswers[step.key] || '' },
  });

  // Reset form defaultValues when stepIndex or savedAnswers change for the current step
  useEffect(() => {
    form.reset({ [step.key]: savedAnswers[step.key] || '' });
  }, [savedAnswers, step.key, form]);

  const createOrganizationAction = useAction(createOrganizationMinimal, {
    onSuccess: async ({ data }) => {
      if (data?.success && data?.organizationId) {
        setIsFinalizing(true);
        sendGTMEvent({ event: 'conversion' });

        // Track organization created
        trackEvent('organization_created', {
          event_category: 'onboarding',
          organization_id: data.organizationId,
          flow_type: 'pre_payment',
        });

        // Organization created, now redirect to plans page with search params
        router.push(buildUrlWithParams(`/upgrade/${data.organizationId}`));

        // Clear answers after successful creation
        setSavedAnswers({});
      } else {
        toast.error('Failed to create organization');
        setIsFinalizing(false);
        setIsOnboarding(false);
      }
    },
    onError: () => {
      toast.error('Failed to create organization');
      setIsFinalizing(false);
      setIsOnboarding(false);
    },
    onExecute: () => {
      setIsOnboarding(true);
    },
  });

  const handleCreateOrganizationAction = (currentAnswers: Partial<CompanyDetails>) => {
    // Only pass the first 3 fields to the minimal action
    createOrganizationAction.execute({
      frameworkIds: currentAnswers.frameworkIds || [],
      organizationName: currentAnswers.organizationName || '',
      website: currentAnswers.website || '',
    });
  };

  const onSubmit = (data: OnboardingFormFields) => {
    const newAnswers: OnboardingFormFields = { ...savedAnswers, ...data };

    for (const key of Object.keys(newAnswers)) {
      // Only process multi-select string fields (exclude objects/arrays)
      if (
        step.options &&
        step.key === key &&
        key !== 'frameworkIds' &&
        key !== 'shipping' &&
        key !== 'cSuite' &&
        key !== 'reportSignatory'
      ) {
        const customValue = newAnswers[`${key}Other`] || '';
        const rawValue = newAnswers[key];
        const values = (typeof rawValue === 'string' ? rawValue : '').split(',').filter(Boolean);

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
    trackOnboardingEvent(step.key, stepIndex + 1, {
      step_value: data[step.key],
    });

    // Track framework selection specifically
    if (step.key === 'frameworkIds' && data.frameworkIds) {
      trackEvent('framework_selected', {
        event_category: 'onboarding',
        frameworks: data.frameworkIds,
        framework_count: data.frameworkIds.length,
      });
    }

    if (stepIndex < prePaymentSteps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleCreateOrganizationAction(newAnswers);
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

  // Pre-fill all answers for localhost development
  const handlePrefillAll = async () => {
    try {
      // Fetch frameworks to get valid IDs
      const response = await fetch('/api/frameworks');
      if (!response.ok) throw new Error('Failed to fetch frameworks');
      const data = await response.json();
      const visibleFrameworks = data.frameworks.filter((f: { visible: boolean }) => f.visible);
      
      // Use first two visible frameworks, or just the first one if only one exists
      const frameworkIds = visibleFrameworks
        .slice(0, 2)
        .map((f: { id: string }) => f.id);

      const prefilledAnswers: Partial<CompanyDetails> = {
        frameworkIds: frameworkIds.length > 0 ? frameworkIds : [],
        organizationName: 'Test Company',
        website: 'https://example.com',
      };

      // Set all answers at once
      setSavedAnswers(prefilledAnswers);

      // Fill current step form
      form.reset({ [step.key]: prefilledAnswers[step.key as keyof typeof prefilledAnswers] || '' });

      // Submit with all prefilled answers
      handleCreateOrganizationAction(prefilledAnswers);
    } catch (error) {
      console.error('Error pre-filling answers:', error);
      toast.error('Failed to pre-fill answers');
    }
  };

  const isLastStep = stepIndex === prePaymentSteps.length - 1;

  return {
    stepIndex,
    steps: prePaymentSteps,
    step,
    form,
    savedAnswers,
    isOnboarding,
    isFinalizing,
    mounted,
    onSubmit,
    handleBack,
    handlePrefillAll,
    isLastStep,
  };
}
