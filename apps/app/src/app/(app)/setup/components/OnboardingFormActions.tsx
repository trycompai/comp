import { Button } from '@comp/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface OnboardingFormActionsProps {
  onBack: () => void;
  isSubmitting: boolean;
  stepIndex: number;
  isLastStep: boolean;
  isOnboarding: boolean; // For the loader in the Finish button
  isCurrentStepValid: boolean;
}

export function OnboardingFormActions({
  onBack,
  isSubmitting,
  stepIndex,
  isLastStep,
  isOnboarding,
  isCurrentStepValid,
}: OnboardingFormActionsProps) {
  return (
    <div className="flex items-center gap-2">
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
              onClick={onBack}
              disabled={isSubmitting || stepIndex === 0} // stepIndex === 0 check is redundant due to conditional rendering but good for safety
            >
              Previous
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
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
            form="onboarding-form" // Important: links to the form in OrganizationSetupForm.tsx
            className="flex items-center gap-2"
            disabled={isSubmitting || !isCurrentStepValid}
            data-testid="setup-finish-button"
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
            form="onboarding-form" // Important: links to the form in OrganizationSetupForm.tsx
            className="flex items-center gap-2"
            disabled={isSubmitting || !isCurrentStepValid}
            data-testid="setup-next-button"
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
  );
}
