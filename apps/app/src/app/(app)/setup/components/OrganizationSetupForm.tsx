"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatedWrapper } from "@/components/animated-wrapper";
import { LogoSpinner } from "@/components/logo-spinner";
import Balancer from "react-wrap-balancer";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@trycompai/ui/form";

import { useOnboardingForm } from "../hooks/useOnboardingForm";
import { OnboardingFormActions } from "./OnboardingFormActions";
import { OnboardingStepInput } from "./OnboardingStepInput";

interface OrganizationSetupFormProps {
  setupId?: string;
  initialData?: Record<string, any>;
  currentStep?: string;
}

export function OrganizationSetupForm({
  setupId,
  initialData,
  currentStep,
}: OrganizationSetupFormProps) {
  const [isLoadingFrameworks, setIsLoadingFrameworks] = useState(false);
  const router = useRouter();

  const {
    stepIndex,
    steps,
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
  } = useOnboardingForm({
    setupId,
    initialData,
    currentStep,
  });

  // Check if current step has valid input
  const currentStepValue = form.watch(step.key);
  const isCurrentStepValid = (() => {
    if (step.key === "frameworkIds") {
      return Array.isArray(currentStepValue) && currentStepValue.length > 0;
    }
    // For other fields, check if they have a value
    return (
      Boolean(currentStepValue) && String(currentStepValue).trim().length > 0
    );
  })();

  // Dispatch custom event for background animation when step changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (isFinalizing) {
        // Set to max scale when finalizing
        window.dispatchEvent(
          new CustomEvent("onboarding-step-change", {
            detail: {
              stepIndex: steps.length - 1,
              totalSteps: steps.length,
              progress: 1,
            },
          }),
        );
      } else {
        const progress = stepIndex / (steps.length - 1);
        // Dispatch custom event to notify the background wrapper
        window.dispatchEvent(
          new CustomEvent("onboarding-step-change", {
            detail: { stepIndex, totalSteps: steps.length, progress },
          }),
        );
      }
    }
  }, [stepIndex, steps.length, isFinalizing]);

  return isFinalizing ? (
    <div className="flex min-h-dvh items-center justify-center">
      <LogoSpinner />
    </div>
  ) : (
    <div className="flex flex-1 flex-col px-4 py-6 md:px-18 md:py-12">
      {/* Progress Stepper */}
      <AnimatedWrapper
        delay={700}
        animationKey={`progress-${step.key}`}
        className="mb-8 md:max-w-sm"
      >
        <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </AnimatedWrapper>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Title */}
        <div className="mb-8">
          <AnimatedWrapper delay={800} animationKey={`title-${step.key}`}>
            <h1 className="text-foreground mb-2 text-2xl font-bold md:text-4xl">
              <Balancer>{step.question}</Balancer>
            </h1>
          </AnimatedWrapper>
          <AnimatedWrapper delay={1000} animationKey={`subtitle-${step.key}`}>
            <p className="text-md text-muted-foreground flex flex-wrap items-center md:text-lg">
              <Balancer>
                Our AI will personalize the platform based on your answers.
              </Balancer>
            </p>
          </AnimatedWrapper>
        </div>

        {/* Form Content */}
        <div className="flex-1">
          <AnimatedWrapper delay={1200} animationKey={`form-${step.key}`}>
            <Form {...form} key={step.key}>
              <form
                id="onboarding-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="w-full"
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
          </AnimatedWrapper>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <AnimatedWrapper delay={1400} animationKey={`actions-${step.key}`}>
          <div className="flex justify-end">
            <OnboardingFormActions
              onBack={handleBack}
              isSubmitting={isOnboarding || isFinalizing}
              stepIndex={stepIndex}
              isLastStep={isLastStep}
              isOnboarding={isOnboarding}
              isCurrentStepValid={isCurrentStepValid}
              onPrefillAll={handlePrefillAll}
            />
          </div>
        </AnimatedWrapper>
      </div>
    </div>
  );
}
