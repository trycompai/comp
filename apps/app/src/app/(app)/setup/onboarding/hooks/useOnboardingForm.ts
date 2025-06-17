import { zodResolver } from '@hookform/resolvers/zod';
import { sendGTMEvent } from '@next/third-parties/google';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { onboardOrganization } from '../actions/onboard-organization';
import { skipOnboarding } from '../actions/skip-onboarding';
import { useLocalStorage } from './useLocalStorage';
import { STORAGE_KEY, companyDetailsSchema, steps } from '../lib/constants';
import type { CompanyDetails } from '../lib/types';
import type { OnboardingFormFields } from '../components/OnboardingStepInput';

export function useOnboardingForm() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [savedAnswers, setSavedAnswers] = useLocalStorage<Partial<CompanyDetails>>(STORAGE_KEY, {});
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const skipOnboardingAction = useAction(skipOnboarding, {
    onSuccess: () => {
      setIsFinalizing(true);
      sendGTMEvent({ event: 'conversion' });
      router.push('/');
    },
    onError: () => {
      toast.error('Failed to skip onboarding');
    },
    onExecute: () => {
      setIsSkipping(true);
    },
  });

  const onboardOrganizationAction = useAction(onboardOrganization, {
    onSuccess: (result) => {
      setIsFinalizing(true);
      sendGTMEvent({ event: 'conversion' });
      if (result.data?.success) {
        router.push(`/${result.data.organizationId}/frameworks`);
        setSavedAnswers({});
      } else {
        toast.error('Failed to onboard organization');
        setIsFinalizing(false);
        setIsOnboarding(false);
      }
    },
    onError: () => {
      toast.error('Failed to onboard organization');
      setIsFinalizing(false);
      setIsOnboarding(false);
    },
    onExecute: () => {
      setIsOnboarding(true);
    },
  });

  const handleOnboardOrganizationAction = (currentAnswers: Partial<CompanyDetails>) => {
    onboardOrganizationAction.execute({
      legalName: currentAnswers.legalName || '',
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

  const handleSkipOnboardingAction = () => {
    skipOnboardingAction.execute({
      legalName: savedAnswers.legalName || 'My Organization',
      website: savedAnswers.website || 'https://my-organization.com',
    });
    setSavedAnswers({});
  };

  const onSubmit = (data: OnboardingFormFields) => {
    const newAnswers: OnboardingFormFields = { ...savedAnswers, ...data };

    for (const key of Object.keys(newAnswers)) {
      if (step.options && step.key === key) {
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
      handleOnboardOrganizationAction(newAnswers);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  const canShowSkipButton = Boolean(savedAnswers.legalName && savedAnswers.website);
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
    handleSkipOnboardingAction,
    canShowSkipButton,
    isLastStep,
  };
}
