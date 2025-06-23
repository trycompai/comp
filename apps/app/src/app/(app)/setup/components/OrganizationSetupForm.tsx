'use client';

import { changeOrganizationAction } from '@/actions/change-organization';
import { LogoSpinner } from '@/components/logo-spinner';
import type { Organization } from '@comp/db/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@comp/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@comp/ui/form';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useOnboardingForm } from '../hooks/useOnboardingForm';
import { OnboardingFormActions } from './OnboardingFormActions';
import { OnboardingStepInput } from './OnboardingStepInput';

interface OrganizationSetupFormProps {
  existingOrganizations?: Organization[];
  setupId?: string;
  initialData?: Record<string, any>;
  currentStep?: string;
}

export function OrganizationSetupForm({
  existingOrganizations = [],
  setupId,
  initialData,
  currentStep,
}: OrganizationSetupFormProps) {
  const [isLoadingFrameworks, setIsLoadingFrameworks] = useState(false);
  const router = useRouter();

  const changeOrgAction = useAction(changeOrganizationAction, {
    onSuccess: (result) => {
      const orgId = result.data?.data?.id;
      if (orgId) {
        router.push(`/${orgId}/`);
      }
    },
  });

  const {
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
  } = useOnboardingForm({
    setupId,
    initialData,
    currentStep,
  });

  const hasExistingOrgs = existingOrganizations.length > 0;

  // Save step progress to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isFinalizing) {
        // Set to max scale when finalizing
        localStorage.setItem('onboarding-progress', '1');
        window.dispatchEvent(
          new CustomEvent('onboarding-step-change', {
            detail: { stepIndex: steps.length - 1, totalSteps: steps.length, progress: 1 },
          }),
        );
      } else {
        const progress = stepIndex / (steps.length - 1);
        localStorage.setItem('onboarding-step-index', stepIndex.toString());
        localStorage.setItem('onboarding-total-steps', steps.length.toString());
        localStorage.setItem('onboarding-progress', progress.toString());

        // Dispatch custom event to notify the background wrapper
        window.dispatchEvent(
          new CustomEvent('onboarding-step-change', {
            detail: { stepIndex, totalSteps: steps.length, progress },
          }),
        );
      }
    }
  }, [stepIndex, steps.length, isFinalizing]);

  return isFinalizing ? (
    <div className="flex min-h-screen items-center justify-center">
      <LogoSpinner />
    </div>
  ) : (
    <div className="scrollbar-hide flex min-h-[calc(100vh-50px)] flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-2xl">
        <Card className="scrollbar-hide relative flex w-full flex-col bg-card/80 dark:bg-card/70 backdrop-blur-xl border border-border/50 shadow-2xl">
          {isLoadingFrameworks && step.key === 'frameworkIds' && (
            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
              <LogoSpinner />
            </div>
          )}
          <CardHeader className="flex min-h-[140px] flex-col items-center justify-center pb-0">
            <div className="flex flex-col items-center gap-2">
              <LogoSpinner />
              <div className="text-muted-foreground text-sm">
                Step {stepIndex + 1} of {steps.length}
              </div>
              <CardTitle className="flex min-h-[56px] items-center justify-center text-center">
                {step.question}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-[150px] flex-1 flex-col overflow-y-auto">
            <Form {...form} key={step.key}>
              <form
                id="onboarding-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="mt-4 w-full"
                autoComplete="off"
              >
                <FormField
                  name={step.key}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <OnboardingStepInput
                          currentStep={step}
                          form={form}
                          savedAnswers={savedAnswers}
                          onLoadingChange={setIsLoadingFrameworks}
                        />
                      </FormControl>
                      <div className="min-h-[20px]">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="flex w-full items-center justify-between">
              <div className="flex flex-1 items-center" suppressHydrationWarning>
                {/* Skip button removed - forcing all questions */}
              </div>
              <OnboardingFormActions
                onBack={handleBack}
                isSubmitting={isOnboarding || isFinalizing}
                stepIndex={stepIndex}
                isLastStep={isLastStep}
                isOnboarding={isOnboarding}
              />
            </div>
            <div className="w-full border-t border-border/30 pt-3">
              <p className="text-center text-xs text-muted-foreground/70">
                <span className="inline-flex items-center gap-1">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Your answers will be used by our AI to create a personalized compliance plan
                </span>
              </p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
