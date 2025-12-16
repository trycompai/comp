'use client';

import { OnboardingStepInput } from '@/app/(app)/setup/components/OnboardingStepInput';
import { AnimatedWrapper } from '@/components/animated-wrapper';
import { LogoSpinner } from '@/components/logo-spinner';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@comp/ui/form';
import type { Organization } from '@db';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import Balancer from 'react-wrap-balancer';
import { usePostPaymentOnboarding } from '../hooks/usePostPaymentOnboarding';

interface PostPaymentOnboardingProps {
  organization: Organization;
  initialData?: Record<string, any>;
  userEmail?: string;
}

export function PostPaymentOnboarding({
  organization,
  initialData = {},
  userEmail,
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
    handleSkip,
    isLastStep,
    isSkippable,
    currentStepNumber,
    totalSteps,
    completeNow,
  } = usePostPaymentOnboarding({
    organizationId: organization.id,
    organizationName: organization.name,
    initialData,
    userEmail,
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

  // Check if current step has valid input
  const currentStepValue = form.watch(step?.key);
  const isCurrentStepValid = (() => {
    if (!step) return false;
    if (step.key === 'frameworkIds') {
      return Array.isArray(currentStepValue) && currentStepValue.length > 0;
    }
    // For other fields, check if they have a value
    return Boolean(currentStepValue) && String(currentStepValue).trim().length > 0;
  })();

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

  return isFinalizing ? (
    <div className="flex min-h-dvh items-center justify-center">
      <LogoSpinner />
    </div>
  ) : (
    <div className="flex flex-1 flex-col md:px-18 md:py-12 px-4 py-6">
      {/* Progress Stepper */}
      <AnimatedWrapper
        delay={700}
        animationKey={`progress-${step?.key}`}
        className="mb-8 md:max-w-sm"
      >
        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </AnimatedWrapper>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Title */}
        <div className="mb-8">
          <AnimatedWrapper delay={800} animationKey={`title-${step?.key}`}>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2">
              <Balancer>{step?.question || ''}</Balancer>
            </h1>
          </AnimatedWrapper>
          <AnimatedWrapper delay={1000} animationKey={`subtitle-${step?.key}`}>
            <p className="text-md md:text-lg text-muted-foreground flex items-center flex-wrap">
              <Balancer>Our AI will personalize the platform based on your answers.</Balancer>
            </p>
          </AnimatedWrapper>
        </div>

        {/* Form Content */}
        <div className="flex-1">
          {!isLoading && step && (
            <AnimatedWrapper delay={1200} animationKey={`form-${step.key}`}>
              <Form {...form} key={step.key}>
                <form
                  id="onboarding-form"
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="w-full"
                  autoComplete="off"
                >
                  {/* Complex fields handle their own validation UI */}
                  {step.key === 'reportSignatory' ||
                  step.key === 'shipping' ||
                  step.key === 'cSuite' ? (
                    <OnboardingStepInput
                      currentStep={step}
                      form={form}
                      savedAnswers={savedAnswers}
                    />
                  ) : (
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
                  )}
                </form>
              </Form>
            </AnimatedWrapper>
          )}
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex items-center gap-2 justify-end">
          <AnimatePresence>
            {stepIndex > 0 && (
              <motion.div
                key="back"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
              >
                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={handleBack}
                  disabled={isOnboarding || isLoading}
                >
                  Previous
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {isSkippable && (
              <motion.div
                key="skip"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
              >
                <Button
                  type="button"
                  variant="ghost"
                  className="flex items-center gap-2 text-muted-foreground"
                  onClick={handleSkip}
                  disabled={isOnboarding || isFinalizing || isLoading}
                  data-testid="onboarding-skip-button"
                >
                  Skip for now
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          {isLocal && (
            <motion.div
              key="complete-now"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25, delay: 0.05 }}
            >
              <Button
                type="button"
                variant="secondary"
                onClick={completeNow}
                disabled={isOnboarding || isFinalizing || isLoading}
              >
                Complete
              </Button>
            </motion.div>
          )}
          <motion.div
            key="next-finish"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, delay: 0.05 }}
          >
            {isLastStep ? (
              <Button
                type="submit"
                form="onboarding-form"
                className="flex items-center gap-2"
                disabled={!isCurrentStepValid || isOnboarding || isFinalizing || isLoading}
                data-testid="onboarding-next-button"
              >
                <motion.span
                  key="finish-label"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  {isOnboarding && <Loader2 className="h-4 w-4 animate-spin" />}
                  Complete
                </motion.span>
              </Button>
            ) : (
              <Button
                type="submit"
                form="onboarding-form"
                className="flex items-center gap-2"
                disabled={!isCurrentStepValid || isOnboarding || isFinalizing || isLoading}
                data-testid="onboarding-next-button"
              >
                <motion.span
                  key="next-label"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center"
                >
                  Continue
                </motion.span>
              </Button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
