'use client';

import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import confetti from 'canvas-confetti';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { usePostHog } from 'posthog-js/react';
import { useEffect, useState } from 'react';
import { zaraz } from 'zaraz-ts';

type PlanType = 'starter' | 'done-for-you';

interface PlanContent {
  title: string;
  description: string;
  badge: string;
  badgeClass: string;
  iconClass: string;
  iconColor: string;
  buttonText: string;
}

export function CheckoutCompleteDialog({ orgId }: { orgId: string }) {
  const [checkoutComplete, setCheckoutComplete] = useQueryState('checkoutComplete', {
    defaultValue: '',
    clearOnDefault: true,
  });
  const [open, setOpen] = useState(false);
  const [planType, setPlanType] = useState<PlanType | null>('done-for-you');
  const posthog = usePostHog();

  useEffect(() => {
    if (checkoutComplete === 'starter' || checkoutComplete === 'done-for-you') {
      const detectedPlanType = checkoutComplete as PlanType;

      // Store the plan type before clearing the query param
      setPlanType(detectedPlanType);

      // Track the checkout completion event
      zaraz.track('checkout_completed', { plan_type: detectedPlanType });
      posthog?.capture('checkout_completed', { plan_type: detectedPlanType, orgId });

      // Show the dialog
      setOpen(true);

      // Trigger confetti animation
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: any = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // Use different colors based on plan type
        const colors =
          detectedPlanType === 'done-for-you'
            ? ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'] // Green for paid
            : ['#3b82f6', '#60a5fa', '#93bbfc', '#bfdbfe', '#dbeafe']; // Blue for starter

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors,
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors,
        });
      }, 250);

      // Clear the query parameter immediately so it doesn't linger in the URL
      setCheckoutComplete('');
    }
  }, [checkoutComplete, setCheckoutComplete, orgId, posthog]);

  const handleClose = () => {
    setOpen(false);
  };

  // Different content based on plan type
  const content: Record<PlanType, PlanContent> = {
    'done-for-you': {
      title: 'Payment Successful! 🎉',
      description:
        'Your invoice has been paid. To get started, please continue with the onboarding so our AI can get to work.',
      badge: 'Invoice Paid',
      badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      iconClass: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      buttonText: 'Continue',
    },
    starter: {
      title: 'Payment Successful! 🎉',
      description: 'Your Starter subscription is now active.',
      badge: 'Invoice Paid',
      badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      iconClass: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      buttonText: 'Complete Onboarding',
    },
  };

  // Only render content if we have a valid plan type stored
  if (!planType) {
    return null;
  }

  const currentContent = content[planType];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center pb-2">
          <div
            className={`mx-auto mb-4 h-12 w-12 rounded-full ${currentContent.iconClass} flex items-center justify-center`}
          >
            <CheckCircle2 className={`h-6 w-6 ${currentContent.iconColor}`} />
          </div>
          <DialogTitle className="text-2xl font-semibold text-center">
            {currentContent.title}
          </DialogTitle>
          <DialogDescription className="text-center mt-2">
            {currentContent.description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleClose} className="w-full">
            {currentContent.buttonText} <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
