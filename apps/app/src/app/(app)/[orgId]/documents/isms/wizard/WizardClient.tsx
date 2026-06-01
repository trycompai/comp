'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, Heading, Spinner, Stack, Text } from '@trycompai/design-system';
import { ArrowLeft, ArrowRight, Checkmark, MagicWand, Save } from '@trycompai/design-system/icons';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useIsmsWizard } from '../hooks/useIsmsWizard';
import { buildWizardDefaults } from './wizard-form-defaults';
import { pickStepAnswers, WIZARD_STEPS } from './wizard-steps';
import { WizardProgress } from './WizardProgress';
import { WizardStepContent } from './WizardStepContent';
import {
  EMPTY_WIZARD_DEFAULTS,
  wizardFormSchema,
  type WizardFormValues,
  type WizardProfileResponse,
} from './wizard-types';

interface WizardClientProps {
  organizationId: string;
  frameworkId: string;
  fallbackData: WizardProfileResponse | null;
}

/** Calm full-bleed transition shown while documents are generated. */
function WizardGenerating() {
  return (
    <div className="flex min-h-80 items-center justify-center">
      <Stack gap="4" align="center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Spinner />
        </div>
        <Stack gap="1" align="center">
          <Heading level="2">Generating your ISMS</Heading>
          <div className="max-w-md text-center">
            <Text size="sm" variant="muted">
              We are saving your answers and regenerating your six foundational documents. This only
              takes a moment.
            </Text>
          </div>
        </Stack>
      </Stack>
    </div>
  );
}

/**
 * Orchestrates the ISMS setup wizard (CS-438): a 6-step React Hook Form pre-filled
 * from the profile defaults + saved answers. Each Next validates and partially
 * saves the active step; completion runs the full save then regenerates all six
 * ISMS documents and returns the user to the overview.
 */
export function WizardClient({ organizationId, frameworkId, fallbackData }: WizardClientProps) {
  const router = useRouter();
  const { profile, saveAnswers, complete, generateAll } = useIsmsWizard({
    organizationId,
    frameworkId,
    fallbackData,
  });

  const initialProfile = profile ?? fallbackData;
  const defaultValues = useMemo<WizardFormValues>(
    () =>
      buildWizardDefaults({
        answers: initialProfile?.answers ?? null,
        defaults: initialProfile?.defaults ?? EMPTY_WIZARD_DEFAULTS,
      }),
    [initialProfile],
  );

  const { control, getValues, trigger, reset, formState } = useForm<WizardFormValues>({
    resolver: zodResolver(wizardFormSchema),
    defaultValues,
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Re-seed the form if the profile arrives after mount (e.g. SSR fallback was
  // null and SWR resolved later). Only while the user hasn't edited anything, so
  // in-progress answers are never clobbered.
  const hasReseeded = useRef(false);
  useEffect(() => {
    if (hasReseeded.current || !profile || formState.isDirty) return;
    hasReseeded.current = true;
    reset(defaultValues);
  }, [profile, defaultValues, formState.isDirty, reset]);

  const members = Array.isArray(initialProfile?.members) ? initialProfile.members : [];
  const profileDefaults = initialProfile?.defaults ?? EMPTY_WIZARD_DEFAULTS;

  const step = WIZARD_STEPS[stepIndex];
  const isLastStep = stepIndex === WIZARD_STEPS.length - 1;

  const persistStep = async (): Promise<boolean> => {
    const valid = await trigger(step.fields);
    if (!valid) return false;
    const slice = pickStepAnswers({ values: getValues(), fields: step.fields });
    setIsSaving(true);
    try {
      await saveAnswers(slice);
      return true;
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to save progress');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    setStepIndex((index) => Math.max(index - 1, 0));
  };

  const handleNext = async () => {
    const saved = await persistStep();
    if (!saved) return;
    setStepIndex((index) => Math.min(index + 1, WIZARD_STEPS.length - 1));
  };

  const handleSaveProgress = async () => {
    const saved = await persistStep();
    if (saved) toast.success('Progress saved');
  };

  const handleFinish = async () => {
    const valid = await trigger();
    if (!valid) {
      const firstInvalid = WIZARD_STEPS.findIndex((wizardStep) =>
        wizardStep.fields.some((fieldName) => formState.errors[fieldName] != null),
      );
      if (firstInvalid !== -1) {
        setStepIndex(firstInvalid);
        toast.error(`Please fix the highlighted answers in "${WIZARD_STEPS[firstInvalid].title}".`);
        return;
      }
      toast.error('Please complete every step before finishing.');
      return;
    }
    setIsFinishing(true);
    try {
      await complete(getValues());
      await generateAll();
      toast.success('ISMS documents generated');
      router.push(`/${organizationId}/documents?tab=iso-27001`);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Failed to finish setup');
      setIsFinishing(false);
    }
  };

  const busy = isSaving || isFinishing;

  return (
    <Stack gap="8">
      <Stack gap="2">
        <div className="flex items-center gap-2 text-primary">
          <MagicWand size={18} />
          <Text size="sm" weight="semibold" variant="primary">
            ISMS setup wizard
          </Text>
        </div>
        <Heading level="1">Set up your ISMS</Heading>
        <div className="max-w-2xl">
          <Text size="sm" variant="muted">
            Confirm or edit a handful of answers we cannot derive automatically. Most fields are
            pre-filled — this usually takes 10–15 minutes. We will regenerate your foundational
            documents when you finish.
          </Text>
        </div>
      </Stack>

      {isFinishing ? (
        <Card>
          <WizardGenerating />
        </Card>
      ) : (
        <>
          <WizardProgress steps={WIZARD_STEPS} currentStep={stepIndex} />

          <Card>
            <WizardStepContent
              stepId={step.id}
              control={control}
              errors={formState.errors}
              members={members}
              defaults={profileDefaults}
            />
          </Card>

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={stepIndex === 0 || busy}
              iconLeft={<ArrowLeft size={16} />}
            >
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleSaveProgress}
                disabled={busy}
                loading={isSaving}
                iconLeft={<Save size={16} />}
              >
                Save progress
              </Button>
              {isLastStep ? (
                <Button
                  type="button"
                  onClick={handleFinish}
                  disabled={busy}
                  loading={isFinishing}
                  iconLeft={<Checkmark size={16} />}
                >
                  Finish & generate
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={busy}
                  loading={isSaving}
                  iconRight={<ArrowRight size={16} />}
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </Stack>
  );
}
