'use client';

import { LogoSpinner } from '@/components/logo-spinner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@comp/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@comp/ui/form';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useOnboardingForm } from '../hooks/useOnboardingForm';
import { OnboardingFormActions } from './OnboardingFormActions';
import { OnboardingStepInput } from './OnboardingStepInput';
import { SkipOnboardingDialog } from './SkipOnboardingDialog';

export function OnboardingForm() {
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

  return isFinalizing ? (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        <span className="text-muted-foreground">Redirecting...</span>
      </div>
    </div>
  ) : (
    <div className="scrollbar-hide flex min-h-screen items-center justify-center p-4">
      <Card className="scrollbar-hide flex w-full max-w-2xl flex-col">
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
                <SkipOnboardingDialog
                  open={showSkipDialog}
                  onOpenChange={setShowSkipDialog}
                  onConfirmSkip={handleSkipOnboardingAction}
                  isSkipping={isSkipping}
                  triggerDisabled={isSkipping || isOnboarding}
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
