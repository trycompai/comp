"use client";

import { useRealtimeRun } from "@trigger.dev/react-hooks";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  ChevronUp,
  Clock3,
  Loader2,
  Rocket,
  Settings,
  ShieldAlert,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { Onboarding } from "@trycompai/db";
import { Button } from "@trycompai/ui/button";
import { Card, CardContent } from "@trycompai/ui/card";

const ONBOARDING_STEPS = [
  { key: "vendors", label: "Researching Vendors", order: 1 },
  { key: "risk", label: "Creating Risks", order: 2 },
  { key: "policies", label: "Tailoring Policies", order: 3 },
] as const;

const IN_PROGRESS_STATUSES = [
  "QUEUED",
  "EXECUTING",
  "WAITING_FOR_DEPLOY",
  "REATTEMPTING",
  "FROZEN",
  "DELAYED",
];

const getFriendlyStatusName = (status: string): string => {
  if (!status) return "Unknown";
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const OnboardingTracker = ({
  onboarding,
}: {
  onboarding: Onboarding;
}) => {
  const triggerJobId = onboarding.triggerJobId;
  const organizationId = onboarding.organizationId;
  const pathname = usePathname();
  const router = useRouter();
  const orgId = pathname?.split("/")[1] || "";
  const [mounted, setMounted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPoliciesExpanded, setIsPoliciesExpanded] = useState(false);
  const [isVendorsExpanded, setIsVendorsExpanded] = useState(false);
  const [isRisksExpanded, setIsRisksExpanded] = useState(false);

  // useRealtimeRun will automatically get the token from TriggerProvider context
  // This gives us real-time updates including metadata changes
  const { run, error } = useRealtimeRun(triggerJobId || "", {
    enabled: !!triggerJobId,
  });

  const handleRetry = useCallback(() => {
    if (!organizationId) {
      return;
    }
    void router.push(`/onboarding/${organizationId}?retry=1`);
  }, [organizationId, router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-minimize when completed
  useEffect(() => {
    if (run?.status === "COMPLETED" && !isMinimized) {
      setIsMinimized(true);
    }
  }, [run?.status, isMinimized]);

  // Extract step completion from metadata (real-time updates)
  const stepStatus = useMemo(() => {
    if (!run?.metadata) {
      return {
        vendors: false,
        risk: false,
        policies: false,
        currentStep: null,
        vendorsTotal: 0,
        vendorsCompleted: 0,
        vendorsRemaining: 0,
        vendorsInfo: [],
        vendorsStatus: {},
        risksTotal: 0,
        risksCompleted: 0,
        risksRemaining: 0,
        risksInfo: [],
        risksStatus: {},
        policiesTotal: 0,
        policiesCompleted: 0,
        policiesRemaining: 0,
        policiesInfo: [],
        policiesStatus: {},
      };
    }

    const meta = run.metadata as Record<string, unknown>;

    // Build vendorsStatus object from individual vendor status keys
    const vendorsStatus: Record<
      string,
      "pending" | "processing" | "assessing" | "completed"
    > = {};
    const vendorsInfo =
      (meta.vendorsInfo as Array<{ id: string; name: string }>) || [];

    vendorsInfo.forEach((vendor) => {
      const statusKey = `vendor_${vendor.id}_status`;
      vendorsStatus[vendor.id] =
        (meta[statusKey] as
          | "pending"
          | "processing"
          | "assessing"
          | "completed") || "pending";
    });

    // Build risksStatus object from individual risk status keys
    const risksStatus: Record<
      string,
      "pending" | "processing" | "assessing" | "completed"
    > = {};
    const risksInfo =
      (meta.risksInfo as Array<{ id: string; name: string }>) || [];

    risksInfo.forEach((risk) => {
      const statusKey = `risk_${risk.id}_status`;
      risksStatus[risk.id] =
        (meta[statusKey] as
          | "pending"
          | "processing"
          | "assessing"
          | "completed") || "pending";
    });

    // Build policiesStatus object from individual policy status keys
    const policiesStatus: Record<
      string,
      "queued" | "pending" | "processing" | "completed"
    > = {};
    const policiesInfo =
      (meta.policiesInfo as Array<{ id: string; name: string }>) || [];

    policiesInfo.forEach((policy) => {
      // Check for individual policy status key: policy_{id}_status
      const statusKey = `policy_${policy.id}_status`;
      policiesStatus[policy.id] =
        (meta[statusKey] as
          | "queued"
          | "pending"
          | "processing"
          | "completed") || "queued";
    });

    return {
      vendors: meta.vendors === true,
      risk: meta.risk === true,
      policies: meta.policies === true,
      currentStep: (meta.currentStep as string) || null,
      vendorsTotal: (meta.vendorsTotal as number) || 0,
      vendorsCompleted: (meta.vendorsCompleted as number) || 0,
      vendorsRemaining: (meta.vendorsRemaining as number) || 0,
      vendorsInfo,
      vendorsStatus,
      risksTotal: (meta.risksTotal as number) || 0,
      risksCompleted: (meta.risksCompleted as number) || 0,
      risksRemaining: (meta.risksRemaining as number) || 0,
      risksInfo,
      risksStatus,
      policiesTotal: (meta.policiesTotal as number) || 0,
      policiesCompleted: (meta.policiesCompleted as number) || 0,
      policiesRemaining: (meta.policiesRemaining as number) || 0,
      policiesInfo,
      policiesStatus,
    };
  }, [run?.metadata]);

  // Calculate current step from metadata
  const currentStep = useMemo(() => {
    if (stepStatus.currentStep) {
      // Use the currentStep from metadata if available
      const step = ONBOARDING_STEPS.find((s) =>
        stepStatus.currentStep?.includes(s.label)
      );
      return step || null;
    }
    // Otherwise find first incomplete step
    return ONBOARDING_STEPS.find(
      (step) => !stepStatus[step.key as keyof typeof stepStatus]
    );
  }, [stepStatus]);

  // Auto-expand current step and collapse others
  useEffect(() => {
    if (!currentStep) return;

    const stepKey = currentStep.key;

    // Expand current step if it has items to show
    if (stepKey === "vendors" && stepStatus.vendorsTotal > 0) {
      setIsVendorsExpanded(true);
      setIsRisksExpanded(false);
      setIsPoliciesExpanded(false);
    } else if (stepKey === "risk" && stepStatus.risksTotal > 0) {
      setIsVendorsExpanded(false);
      setIsRisksExpanded(true);
      setIsPoliciesExpanded(false);
    } else if (stepKey === "policies" && stepStatus.policiesTotal > 0) {
      setIsVendorsExpanded(false);
      setIsRisksExpanded(false);
      setIsPoliciesExpanded(true);
    }
  }, [
    currentStep?.key,
    stepStatus.vendorsTotal,
    stepStatus.risksTotal,
    stepStatus.policiesTotal,
  ]);

  // Build dynamic current step message with progress
  const currentStepMessage = useMemo(() => {
    if (stepStatus.currentStep) {
      // If it's the policies step, update the count dynamically
      if (stepStatus.currentStep.includes("Tailoring Policies")) {
        if (stepStatus.policiesTotal > 0) {
          return `Tailoring Policies... (${stepStatus.policiesCompleted}/${stepStatus.policiesTotal})`;
        }
        return "Tailoring Policies...";
      }
      return stepStatus.currentStep;
    }
    if (currentStep) {
      return currentStep.label;
    }
    return "Initializing...";
  }, [
    stepStatus.currentStep,
    stepStatus.policiesTotal,
    stepStatus.policiesCompleted,
    currentStep,
  ]);

  if (!triggerJobId || !mounted) {
    return null;
  }

  // Dismiss completed card
  if (run?.status === "COMPLETED" && isDismissed) {
    return null;
  }

  // Minimized view - show only current step
  if (isMinimized) {
    const isCompleted = run?.status === "COMPLETED";

    return createPortal(
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed right-4 bottom-4 z-50 max-w-[calc(100vw-2rem)] min-w-[400px]"
        >
          <Card className="border shadow-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {isCompleted ? (
                    <Rocket className="text-chart-positive h-5 w-5 shrink-0" />
                  ) : (
                    <Settings className="text-primary h-5 w-5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-base font-medium">
                      {isCompleted
                        ? "Setup Complete"
                        : "Setting up your organization"}
                    </p>
                    {!isCompleted && currentStepMessage && (
                      <p className="text-muted-foreground mt-0.5 truncate text-sm">
                        {currentStepMessage}
                      </p>
                    )}
                    {isCompleted && (
                      <p className="text-muted-foreground mt-0.5 text-sm">
                        Your organization is ready!
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isCompleted && (
                    <button
                      onClick={() => setIsDismissed(true)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                  {!isCompleted && (
                    <button
                      onClick={() => setIsMinimized(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Expand"
                    >
                      <ChevronsUp className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>,
      document.body
    );
  }

  const renderStatusContent = () => {
    if (!run && !error) {
      return (
        <div className="flex items-center gap-3">
          <Loader2 className="text-primary h-5 w-5 shrink-0 animate-spin" />
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-base font-medium">
              Initializing...
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Checking onboarding status
            </p>
          </div>
        </div>
      );
    }
    if (!run) {
      return (
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-warning mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-warning text-base font-medium">
              Status Unavailable
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Could not retrieve status
            </p>
          </div>
          <button
            onClick={() => setIsMinimized(true)}
            className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
            aria-label="Minimize"
          >
            <ChevronsDown className="h-5 w-5" />
          </button>
        </div>
      );
    }

    const friendlyStatus = getFriendlyStatusName(run.status);

    switch (run.status) {
      case "WAITING":
      case "QUEUED":
      case "EXECUTING":
      case "PENDING_VERSION":
      case "DEQUEUED":
      case "DELAYED":
        return (
          <div className="flex h-full flex-col gap-4 overflow-hidden">
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Settings className="text-primary h-5 w-5 shrink-0" />
                <p className="text-foreground text-base font-medium">
                  Setting up your organization
                </p>
              </div>
              <button
                onClick={() => setIsMinimized(true)}
                className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                aria-label="Minimize"
              >
                <ChevronsDown className="h-5 w-5" />
              </button>
            </div>

            {/* Step progress - scrollable */}
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
              {ONBOARDING_STEPS.map((step) => {
                const isCurrent = currentStep?.key === step.key;
                const isVendorsStep = step.key === "vendors";
                const isRisksStep = step.key === "risk";
                const isPoliciesStep = step.key === "policies";

                // Determine completion based on actual counts, not boolean flags
                const vendorsCompleted =
                  stepStatus.vendorsTotal > 0 &&
                  stepStatus.vendorsCompleted >= stepStatus.vendorsTotal;
                const risksCompleted =
                  stepStatus.risksTotal > 0 &&
                  stepStatus.risksCompleted >= stepStatus.risksTotal;
                const policiesCompleted =
                  stepStatus.policiesTotal > 0 &&
                  stepStatus.policiesCompleted >= stepStatus.policiesTotal;

                const isCompleted =
                  (isVendorsStep && vendorsCompleted) ||
                  (isRisksStep && risksCompleted) ||
                  (isPoliciesStep && policiesCompleted);

                // Check if any items are actively being processed (not just queued)
                const vendorsProcessing = Object.values(
                  stepStatus.vendorsStatus || {}
                ).some(
                  (status) => status === "processing" || status === "assessing"
                );
                const risksProcessing = Object.values(
                  stepStatus.risksStatus || {}
                ).some(
                  (status) => status === "processing" || status === "assessing"
                );
                const policiesProcessing = Object.values(
                  stepStatus.policiesStatus || {}
                ).some((status) => status === "processing");

                // Show spinner if actively processing, even if not the current step
                const isActivelyProcessing =
                  (isVendorsStep && vendorsProcessing) ||
                  (isRisksStep && risksProcessing) ||
                  (isPoliciesStep && policiesProcessing);

                const vendorsQueued =
                  stepStatus.vendorsCompleted < stepStatus.vendorsTotal &&
                  stepStatus.vendorsTotal > 0 &&
                  !vendorsProcessing;
                const risksQueued =
                  stepStatus.risksCompleted < stepStatus.risksTotal &&
                  stepStatus.risksTotal > 0 &&
                  !risksProcessing;
                const policiesQueued =
                  stepStatus.policiesCompleted < stepStatus.policiesTotal &&
                  stepStatus.policiesTotal > 0 &&
                  !policiesProcessing;

                // Vendors step with expandable dropdown
                if (isVendorsStep && stepStatus.vendorsTotal > 0) {
                  return (
                    <div key={step.key} className="flex flex-col gap-2">
                      <button
                        onClick={() => setIsVendorsExpanded(!isVendorsExpanded)}
                        className="flex w-full items-center gap-2 text-left"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="text-chart-positive h-5 w-5 shrink-0" />
                        ) : isCurrent || isActivelyProcessing ? (
                          <Loader2 className="text-primary h-5 w-5 shrink-0 animate-spin" />
                        ) : vendorsQueued ? (
                          <Clock3 className="text-muted-foreground h-5 w-5 shrink-0" />
                        ) : (
                          <div className="border-muted h-5 w-5 shrink-0 rounded-full border-2" />
                        )}
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span
                            className={`text-sm ${
                              isCompleted
                                ? "text-chart-positive"
                                : isCurrent
                                  ? "text-primary font-medium"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {step.label}
                          </span>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-muted-foreground text-sm">
                              {stepStatus.vendorsCompleted}/
                              {stepStatus.vendorsTotal}
                            </span>
                            {isVendorsExpanded ? (
                              <ChevronUp className="text-muted-foreground h-4 w-4" />
                            ) : (
                              <ChevronDown className="text-muted-foreground h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Expanded vendor list */}
                      {isVendorsExpanded &&
                        stepStatus.vendorsInfo.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-col gap-1.5 pl-7">
                              {stepStatus.vendorsInfo.map((vendor) => {
                                const vendorStatus =
                                  stepStatus.vendorsStatus[vendor.id] ||
                                  "pending";
                                const isVendorCompleted =
                                  vendorStatus === "completed";
                                const isVendorProcessing =
                                  vendorStatus === "processing";
                                const isVendorQueued =
                                  vendorStatus === "pending";

                                const content = (
                                  <>
                                    {isVendorCompleted ? (
                                      <CheckCircle2 className="text-chart-positive pointer-events-none h-4 w-4 shrink-0" />
                                    ) : isVendorProcessing ? (
                                      <Loader2 className="text-primary pointer-events-none h-4 w-4 shrink-0 animate-spin" />
                                    ) : isVendorQueued ? (
                                      <Clock3 className="text-muted-foreground pointer-events-none h-4 w-4 shrink-0" />
                                    ) : (
                                      <div className="border-muted pointer-events-none h-4 w-4 shrink-0 rounded-full border-2" />
                                    )}
                                    <span
                                      className={`pointer-events-none truncate text-sm ${
                                        isVendorCompleted
                                          ? "text-chart-positive"
                                          : isVendorProcessing
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                      }`}
                                    >
                                      {vendor.name}
                                    </span>
                                  </>
                                );

                                return (
                                  <div
                                    key={vendor.id}
                                    className="flex items-center gap-2"
                                  >
                                    {isVendorCompleted && orgId ? (
                                      <Link
                                        href={`/${orgId}/vendors/${vendor.id}`}
                                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 transition-all hover:underline"
                                        style={{ cursor: "pointer" }}
                                      >
                                        {content}
                                      </Link>
                                    ) : (
                                      content
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                    </div>
                  );
                }

                // Risks step with expandable dropdown
                if (isRisksStep && stepStatus.risksTotal > 0) {
                  return (
                    <div key={step.key} className="flex flex-col gap-2">
                      <button
                        onClick={() => setIsRisksExpanded(!isRisksExpanded)}
                        className="flex w-full items-center gap-2 text-left"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="text-chart-positive h-5 w-5 shrink-0" />
                        ) : isCurrent || isActivelyProcessing ? (
                          <Loader2 className="text-primary h-5 w-5 shrink-0 animate-spin" />
                        ) : risksQueued ? (
                          <Clock3 className="text-muted-foreground h-5 w-5 shrink-0" />
                        ) : (
                          <div className="border-muted h-5 w-5 shrink-0 rounded-full border-2" />
                        )}
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span
                            className={`text-sm ${
                              isCompleted
                                ? "text-chart-positive"
                                : isCurrent
                                  ? "text-primary font-medium"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {step.label}
                          </span>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-muted-foreground text-sm">
                              {stepStatus.risksCompleted}/
                              {stepStatus.risksTotal}
                            </span>
                            {isRisksExpanded ? (
                              <ChevronUp className="text-muted-foreground h-4 w-4" />
                            ) : (
                              <ChevronDown className="text-muted-foreground h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Expanded risk list */}
                      {isRisksExpanded && stepStatus.risksInfo.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col gap-1.5 pl-7">
                            {stepStatus.risksInfo.map((risk) => {
                              const riskStatus =
                                stepStatus.risksStatus[risk.id] || "pending";
                              const isRiskCompleted =
                                riskStatus === "completed";
                              const isRiskProcessing =
                                riskStatus === "processing";

                              const content = (
                                <>
                                  {isRiskCompleted ? (
                                    <CheckCircle2 className="text-chart-positive pointer-events-none h-4 w-4 shrink-0" />
                                  ) : isRiskProcessing ? (
                                    <Loader2 className="text-primary pointer-events-none h-4 w-4 shrink-0 animate-spin" />
                                  ) : (
                                    <div className="border-muted pointer-events-none h-4 w-4 shrink-0 rounded-full border-2" />
                                  )}
                                  <span
                                    className={`pointer-events-none truncate text-sm ${
                                      isRiskCompleted
                                        ? "text-chart-positive"
                                        : isRiskProcessing
                                          ? "text-primary"
                                          : "text-muted-foreground"
                                    }`}
                                  >
                                    {risk.name}
                                  </span>
                                </>
                              );

                              return (
                                <div
                                  key={risk.id}
                                  className="flex items-center gap-2"
                                >
                                  {isRiskCompleted && orgId ? (
                                    <Link
                                      href={`/${orgId}/risk/${risk.id}`}
                                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 transition-all hover:underline"
                                      style={{ cursor: "pointer" }}
                                    >
                                      {content}
                                    </Link>
                                  ) : (
                                    content
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                }

                if (isPoliciesStep && stepStatus.policiesTotal > 0) {
                  // Policies step with expandable dropdown
                  return (
                    <div key={step.key} className="flex flex-col gap-2">
                      <button
                        onClick={() =>
                          setIsPoliciesExpanded(!isPoliciesExpanded)
                        }
                        className="flex w-full items-center gap-2 text-left"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="text-chart-positive h-5 w-5 shrink-0" />
                        ) : isCurrent || isActivelyProcessing ? (
                          <Loader2 className="text-primary h-5 w-5 shrink-0 animate-spin" />
                        ) : policiesQueued ? (
                          <Clock3 className="text-muted-foreground h-5 w-5 shrink-0" />
                        ) : (
                          <div className="border-muted h-5 w-5 shrink-0 rounded-full border-2" />
                        )}
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span
                            className={`text-sm ${
                              isCompleted
                                ? "text-chart-positive"
                                : isCurrent
                                  ? "text-primary font-medium"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {step.label}
                          </span>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-muted-foreground text-sm">
                              {stepStatus.policiesCompleted}/
                              {stepStatus.policiesTotal}
                            </span>
                            {!isCompleted &&
                              (isPoliciesExpanded ? (
                                <ChevronUp className="text-muted-foreground h-4 w-4" />
                              ) : (
                                <ChevronDown className="text-muted-foreground h-4 w-4" />
                              ))}
                          </div>
                        </div>
                      </button>

                      {/* Expanded policy list */}
                      {isPoliciesExpanded &&
                        stepStatus.policiesInfo.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-col gap-1.5 pl-7">
                              {stepStatus.policiesInfo.map((policy) => {
                                const policyStatus =
                                  stepStatus.policiesStatus[policy.id] ||
                                  "queued";
                                const isPolicyCompleted =
                                  policyStatus === "completed";
                                const isPolicyProcessing =
                                  policyStatus === "processing";
                                const isPolicyQueued =
                                  policyStatus === "queued" ||
                                  policyStatus === "pending";

                                const content = (
                                  <>
                                    {isPolicyCompleted ? (
                                      <CheckCircle2 className="text-chart-positive pointer-events-none h-4 w-4 shrink-0" />
                                    ) : isPolicyProcessing ? (
                                      <Loader2 className="text-primary pointer-events-none h-4 w-4 shrink-0 animate-spin" />
                                    ) : isPolicyQueued ? (
                                      <Clock3 className="text-muted-foreground pointer-events-none h-4 w-4 shrink-0" />
                                    ) : (
                                      <div className="border-muted pointer-events-none h-4 w-4 shrink-0 rounded-full border-2" />
                                    )}
                                    <span
                                      className={`pointer-events-none truncate text-sm ${
                                        isPolicyCompleted
                                          ? "text-chart-positive"
                                          : isPolicyProcessing
                                            ? "text-primary"
                                            : isPolicyQueued
                                              ? "text-muted-foreground"
                                              : "text-muted-foreground"
                                      }`}
                                    >
                                      {policy.name}
                                    </span>
                                  </>
                                );

                                return (
                                  <div
                                    key={policy.id}
                                    className="flex items-center gap-2"
                                  >
                                    {isPolicyCompleted && orgId ? (
                                      <Link
                                        href={`/${orgId}/policies/${policy.id}`}
                                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 transition-all hover:underline"
                                        style={{ cursor: "pointer" }}
                                      >
                                        {content}
                                      </Link>
                                    ) : (
                                      content
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                    </div>
                  );
                }

                // Regular step
                return (
                  <div key={step.key} className="flex items-center gap-2">
                    {isCompleted ? (
                      <CheckCircle2 className="text-chart-positive h-5 w-5 shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="text-primary h-5 w-5 shrink-0 animate-spin" />
                    ) : policiesQueued ? (
                      <Clock3 className="text-muted-foreground h-5 w-5 shrink-0" />
                    ) : (
                      <div className="border-muted h-5 w-5 shrink-0 rounded-full border-2" />
                    )}
                    <span
                      className={`text-sm ${
                        isCompleted
                          ? "text-chart-positive"
                          : isCurrent
                            ? "text-primary font-medium"
                            : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case "COMPLETED":
        return (
          <div className="flex h-full flex-col gap-4 overflow-hidden">
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Rocket className="text-chart-positive h-5 w-5 shrink-0" />
                <p className="text-foreground text-base font-medium">
                  Setup Complete
                </p>
              </div>
              <button
                onClick={() => setIsMinimized(true)}
                className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                aria-label="Minimize"
              >
                <ChevronsDown className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-1 flex-col justify-center">
              <div className="flex flex-col gap-2">
                <p className="text-chart-positive text-base font-medium">
                  Your organization is ready!
                </p>
                <p className="text-muted-foreground text-sm">
                  All onboarding steps have been completed successfully.
                </p>
              </div>
            </div>

            {/* Show completed steps */}
            <div className="flex shrink-0 flex-col gap-2.5">
              {ONBOARDING_STEPS.map((step) => (
                <div key={step.key} className="flex items-center gap-2">
                  <CheckCircle2 className="text-chart-positive h-5 w-5 shrink-0" />
                  <span className="text-chart-positive text-sm">
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      case "FAILED":
      case "CANCELED":
      case "CRASHED":
      case "SYSTEM_FAILURE":
      case "EXPIRED":
      case "TIMED_OUT": {
        const errorMessage =
          run.error?.message || "An unexpected issue occurred.";
        const truncatedMessage =
          errorMessage.length > 60
            ? `${errorMessage.substring(0, 57)}...`
            : errorMessage;
        return (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="text-destructive mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-destructive text-base font-medium">
                  Setup needs attention
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Something went wrong while tailoring your environment. Retry
                  the onboarding job or contact support for help.
                </p>
              </div>
              <button
                onClick={() => setIsMinimized(true)}
                className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                aria-label="Minimize"
              >
                <ChevronsDown className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={handleRetry}
                disabled={!organizationId}
              >
                Retry setup
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href="mailto:support@trycomp.ai">Contact support</a>
              </Button>
            </div>
          </div>
        );
      }
      default: {
        const exhaustiveCheck: never = run.status as never;

        return (
          <div className="flex items-start gap-3">
            <Zap className="text-warning mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-warning text-base font-medium">
                Unknown Status
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Status: {exhaustiveCheck}
              </p>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
              aria-label="Minimize"
            >
              <ChevronsDown className="h-5 w-5" />
            </button>
          </div>
        );
      }
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed right-4 bottom-4 z-50 w-96 max-w-[calc(100vw-2rem)] min-w-[400px]"
    >
      <Card className="flex h-[600px] flex-col overflow-hidden border shadow-2xl">
        <CardContent className="flex flex-1 flex-col overflow-hidden p-5">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {renderStatusContent()}
          </div>
        </CardContent>
      </Card>
    </motion.div>,
    document.body
  );
};
