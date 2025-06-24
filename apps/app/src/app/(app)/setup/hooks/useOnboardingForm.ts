'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { sendGTMEvent } from '@next/third-parties/google';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { createOrganization } from '../actions/create-organization';
import { createOrganizationMinimal } from '../actions/create-organization-minimal';
import type { OnboardingFormFields } from '../components/OnboardingStepInput';
import { STORAGE_KEY, companyDetailsSchema, steps } from '../lib/constants';
import { updateSetupSession } from '../lib/setup-session';
import type { CompanyDetails } from '../lib/types';
import { useLocalStorage } from './useLocalStorage';

interface UseOnboardingFormProps {
  setupId?: string;
  initialData?: Record<string, any>;
  currentStep?: string;
}

export function useOnboardingForm({
  setupId,
  initialData,
  currentStep,
}: UseOnboardingFormProps = {}) {
  const router = useRouter();

  // If we have a setupId, use the initialData from KV, otherwise use localStorage
  const [savedAnswers, setSavedAnswers] = useLocalStorage<Partial<CompanyDetails>>(
    STORAGE_KEY,
    setupId && initialData ? initialData : {},
  );

  // Determine the initial step index based on currentStep
  const initialStepIndex = currentStep ? steps.findIndex((s) => s.key === currentStep) : 0;

  const [stepIndex, setStepIndex] = useState(Math.max(0, initialStepIndex));
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Save progress to KV if we have a setupId
  useEffect(() => {
    if (setupId && mounted) {
      const currentStepKey = steps[stepIndex]?.key;
      updateSetupSession(setupId, {
        currentStep: currentStepKey,
        formData: savedAnswers as Record<string, any>,
      });
    }
  }, [setupId, stepIndex, savedAnswers, mounted]);

  const step = steps[stepIndex];
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

  const createOrganizationMinimalAction = useAction(createOrganizationMinimal, {
    onSuccess: ({ data }) => {
      if (data?.success && data?.organizationId) {
        setIsFinalizing(true);
        sendGTMEvent({ event: 'conversion' });

        // Organization created, now redirect to plans page
        router.push(`/upgrade/${data.organizationId}`);
      } else {
        toast.error(data?.error || 'Failed to create organization minimal');
        setIsSkipping(false);
      }
    },
    onError: (error) => {
      console.error('Create organization minimal error:', error);
      toast.error('Failed to create organization minimal');
      setIsSkipping(false);
    },
    onExecute: () => {
      setIsSkipping(true);
    },
  });

  const createOrganizationAction = useAction(createOrganization, {
    onSuccess: async ({ data }) => {
      if (data?.success && data?.organizationId) {
        setIsFinalizing(true);
        sendGTMEvent({ event: 'conversion' });

        // Organization created, now redirect to plans page
        router.push(`/upgrade/${data.organizationId}`);

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
    createOrganizationAction.execute({
      frameworkIds: currentAnswers.frameworkIds || [],
      organizationName: currentAnswers.organizationName || '',
      website: currentAnswers.website || '',
      describe: currentAnswers.describe || '',
      industry: currentAnswers.industry || '',
      teamSize: currentAnswers.teamSize || '',
      devices: currentAnswers.devices || '',
      authentication: currentAnswers.authentication || '',
      workLocation: currentAnswers.workLocation || '',
      infrastructure: currentAnswers.infrastructure || '',
      dataTypes: currentAnswers.dataTypes || '',
      software: currentAnswers.software || '',
    });
  };

  const handleCreateOrganizationMinimalAction = () => {
    createOrganizationMinimalAction.execute({
      organizationName: savedAnswers.organizationName || 'My Organization',
      website: savedAnswers.website || 'https://my-organization.com',
      frameworkIds: savedAnswers.frameworkIds || [],
    });
    setSavedAnswers({});
  };

  const onSubmit = (data: OnboardingFormFields) => {
    const newAnswers: OnboardingFormFields = { ...savedAnswers, ...data };

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
    if (stepIndex < steps.length - 1) {
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

  const canShowSkipButton = Boolean(
    savedAnswers.frameworkIds &&
      savedAnswers.frameworkIds.length > 0 &&
      savedAnswers.organizationName &&
      savedAnswers.website,
  );
  const isLastStep = stepIndex === steps.length - 1;

  return {
    stepIndex,
    steps,
    step,
    form,
    savedAnswers,
    showSkipDialog,
    setShowSkipDialog,
    isSkipping,
    isOnboarding,
    isFinalizing,
    mounted,
    onSubmit,
    handleBack,
    handleSkipOnboardingAction: handleCreateOrganizationMinimalAction,
    canShowSkipButton,
    isLastStep,
  };
}
