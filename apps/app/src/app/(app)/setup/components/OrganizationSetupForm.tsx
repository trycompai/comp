'use client';

import { changeOrganizationAction } from '@/actions/change-organization';
import { LogoSpinner } from '@/components/logo-spinner';
import type { Organization } from '@comp/db/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@comp/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@comp/ui/form';
import { motion } from 'framer-motion';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useOnboardingForm } from '../hooks/useOnboardingForm';
import { CreateOrganizationMinimalDialog } from './CreateOrganizationMinimalDialog';
import { OnboardingFormActions } from './OnboardingFormActions';
import { OnboardingStepInput } from './OnboardingStepInput';

interface OrganizationSetupFormProps {
  existingOrganizations?: Organization[];
}

export function OrganizationSetupForm({ existingOrganizations = [] }: OrganizationSetupFormProps) {
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
  } = useOnboardingForm();

  const hasExistingOrgs = existingOrganizations.length > 0;

  return isFinalizing ? (
    <div className="flex min-h-screen items-center justify-center">
      <LogoSpinner />
    </div>
  ) : (
    <div className="scrollbar-hide flex min-h-[calc(100vh-42px)] flex-col items-center justify-center p-4">
      <Card className="scrollbar-hide relative flex w-full max-w-2xl flex-col">
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
        <CardFooter>
          <div className="flex flex-1 items-center" suppressHydrationWarning>
            {mounted && canShowSkipButton && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <CreateOrganizationMinimalDialog
                  open={showSkipDialog}
                  onOpenChange={setShowSkipDialog}
                  onConfirmSkip={handleSkipOnboardingAction}
                  loading={isSkipping || isOnboarding}
                />
              </motion.div>
            )}
          </div>
          <OnboardingFormActions
            onBack={handleBack}
            isSubmitting={isOnboarding || isFinalizing}
            stepIndex={stepIndex}
            isLastStep={isLastStep}
            isOnboarding={isOnboarding}
          />
        </CardFooter>
      </Card>
    </div>
  );
}
