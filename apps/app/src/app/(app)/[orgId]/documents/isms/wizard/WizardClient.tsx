'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, PageHeader, Text } from '@trycompai/design-system';
import { ArrowLeft, ArrowRight, Checkmark, Save } from '@trycompai/design-system/icons';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
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

  const { control, getValues, trigger, formState } = useForm<WizardFormValues>({
    resolver: zodResolver(wizardFormSchema),
    defaultValues,
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

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
    } finally {
      setIsFinishing(false);
    }
  };

  const busy = isSaving || isFinishing;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="ISMS setup wizard" />
      <div className="line-clamp-2">
        <Text variant="muted">
          Confirm or edit a handful of answers we cannot derive automatically. Most fields are
          pre-filled — this usually takes 10–15 minutes. We will regenerate your foundational
          documents when you finish.
        </Text>
      </div>

      <WizardProgress steps={WIZARD_STEPS} currentStep={stepIndex} />

      <WizardStepContent
        stepId={step.id}
        control={control}
        errors={formState.errors}
        members={members}
        defaults={profileDefaults}
      />

      <div className="flex items-center justify-between">
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
            variant="secondary"
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
              {isFinishing ? 'Finishing…' : 'Finish & generate'}
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
    </div>
  );
}
