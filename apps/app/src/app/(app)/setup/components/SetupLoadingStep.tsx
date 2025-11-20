"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AiWorkPreviewAuthentic } from "@/components/ai-work-preview-authentic";
import { ArrowRight } from "lucide-react";

import { Button } from "@trycompai/ui/button";

interface SetupLoadingStepProps {
  organizationId: string;
}

export function SetupLoadingStep({ organizationId }: SetupLoadingStepProps) {
  const router = useRouter();
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    // Set a random duration between 2 and 7 minutes (in milliseconds)
    const minDurationMs = 2 * 60 * 1000; // 2 minutes
    const maxDurationMs = 7 * 60 * 1000; // 7 minutes
    const randomDuration =
      Math.floor(Math.random() * (maxDurationMs - minDurationMs + 1)) +
      minDurationMs;

    // For the rest of the UI, keep the random duration
    const minTimeTimer = setTimeout(() => {
      setCanContinue(true);
    }, randomDuration);

    return () => {
      clearTimeout(minTimeTimer);
    };
  }, []);

  const handleContinue = () => {
    router.push(`/upgrade/${organizationId}`);
  };

  return (
    <div className="relative min-h-[calc(100vh-42px)]">
      {/* Main content */}
      <div className="flex min-h-[calc(100vh-42px-72px)] items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="relative">
            <div className="bg-card/80 dark:bg-card/70 relative rounded-2xl border border-white/20 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10">
              {/* Inner glow for depth */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent" />
              <div className="relative">
                <AiWorkPreviewAuthentic />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium footer */}
      <div className="bg-card/60 dark:bg-card/50 sticky right-0 bottom-0 left-0 border-t border-white/10 backdrop-blur-md dark:border-white/5">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1">
              <p className="text-foreground text-sm font-medium">
                {canContinue
                  ? "AI is working in the background (this will take 2-7 minutes)"
                  : "AI workspace setup in progress... (2-7 minutes)"}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {canContinue
                  ? "You can safely continue - we'll notify you when everything is ready"
                  : "Analyzing your infrastructure and compliance requirements"}
              </p>
            </div>
            <Button
              onClick={handleContinue}
              disabled={false}
              size="default"
              variant={"default"}
              className={
                "shadow-primary/20 hover:shadow-primary/30 min-w-[160px] shadow-lg transition-all hover:shadow-xl"
              }
            >
              <>
                Continue to Plans
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
