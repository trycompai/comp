'use client';

import { OnboardingStepInput } from '@/app/(app)/setup/components/OnboardingStepInput';
import { LogoSpinner } from '@/components/logo-spinner';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@comp/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@comp/ui/form';
import type { Organization } from '@db';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { usePostPaymentOnboarding } from '../hooks/usePostPaymentOnboarding';

interface PostPaymentOnboardingProps {
  organization: Organization;
  initialData?: Record<string, any>;
}

export function PostPaymentOnboarding({
  organization,
  initialData = {},
}: PostPaymentOnboardingProps) {
  const {
    stepIndex,
    steps,
    step,
    form,
    savedAnswers,
    isOnboarding,
    isFinalizing,
    isLoading,
    onSubmit,
    handleBack,
    isLastStep,
    currentStepNumber,
    totalSteps,
    completeNow,
  } = usePostPaymentOnboarding({
    organizationId: organization.id,
    organizationName: organization.name,
    initialData,
  });

  const isLocal = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const host = window.location.host || '';
    return (
      process.env.NODE_ENV !== 'production' ||
      host.includes('localhost') ||
      host.startsWith('127.0.0.1') ||
      host.startsWith('::1')
    );
  }, []);

  // Dispatch custom event for background animation when step changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isFinalizing) {
        // Set to max scale when finalizing
        window.dispatchEvent(
          new CustomEvent('onboarding-step-change', {
            detail: { stepIndex: totalSteps - 1, totalSteps, progress: 1 },
          }),
        );
      } else {
        const progress = stepIndex / (totalSteps - 1);
        // Dispatch custom event to notify the background wrapper
        window.dispatchEvent(
          new CustomEvent('onboarding-step-change', {
            detail: { stepIndex, totalSteps, progress },
          }),
        );
      }
    }
  }, [stepIndex, isFinalizing, totalSteps]);

  return (
    <div className="scrollbar-hide flex min-h-[calc(100vh-50px)] flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-6xl">
        <Card className="scrollbar-hide relative mx-auto flex w-full max-w-3xl flex-col bg-card/80 dark:bg-card/70 backdrop-blur-xl border border-border/50 shadow-2xl md:w-[680px] lg:w-[820px] xl:w-[920px]">
          {(isLoading || isFinalizing) && (
            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
              <LogoSpinner />
            </div>
          )}
          <CardHeader className="flex min-h-[140px] flex-col items-center justify-center pb-0">
            <div className="flex flex-col items-center gap-2">
              <LogoSpinner />
              <div className="text-muted-foreground text-sm">
                Step {stepIndex + 1} of {totalSteps}
              </div>
              <CardTitle className="flex min-h-[56px] items-center justify-center text-center">
                {step?.question || ''}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-[150px] flex-1 flex-col overflow-y-auto">
            {!isLoading && (
              <Form {...form}>
                <form
                  id="onboarding-form"
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="mt-4 w-full"
                  autoComplete="off"
                >
                  {steps.map((s, idx) => (
                    <div
                      key={s.key}
                      style={{ display: idx === stepIndex ? 'block' : 'none' }}
                    >
                      <FormField
                        name={s.key}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <OnboardingStepInput
                                currentStep={s}
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
                    </div>
                  ))}
                </form>
              </Form>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="flex w-full items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={stepIndex === 0 || isOnboarding || isLoading}
                className="group transition-all hover:pr-3"
              >
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Back
              </Button>

              <div className="flex items-center gap-2">
                {isLocal && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={completeNow}
                    disabled={isOnboarding || isFinalizing || isLoading}
                    className="group transition-all"
                  >
                    Complete now
                  </Button>
                )}
                <Button
                  type="submit"
                  form="onboarding-form"
                  disabled={isOnboarding || isFinalizing || isLoading}
                  className="group transition-all hover:pl-3"
                  data-testid="onboarding-next-button"
                >
                  {isFinalizing ? (
                    'Setting up...'
                  ) : isLastStep ? (
                    'Complete Setup'
                  ) : (
                    <>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="w-full border-t border-border/30 pt-3">
              <p className="text-center text-xs text-muted-foreground/70">
                <span className="inline-flex items-center justify-center gap-1.5 flex-wrap">
                  <svg
                    className="h-3.5 w-3.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                    />
                  </svg>
                  <span className="max-w-[280px] sm:max-w-none">
                    AI personalizes your plan based on your answers
                  </span>
                </span>
              </p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
