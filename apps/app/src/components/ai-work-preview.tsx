"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  Search,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { cn } from "@trycompai/ui/cn";
import { Separator } from "@trycompai/ui/separator";

import { MiniDataStream } from "./mini-data-stream";

interface WorkItem {
  id: string;
  title: string;
  type: "policy" | "vendor" | "risk" | "control" | "evidence";
  status: "pending" | "processing" | "complete" | "issue";
  detail?: string;
}

const INITIAL_WORK_ITEMS: WorkItem[] = [
  {
    id: "1",
    title: "Drafting Information Security Policy",
    type: "policy",
    status: "pending",
    detail:
      "Customizing based on your AWS infrastructure and security controls",
  },
  {
    id: "2",
    title: "Researching Stripe Compliance",
    type: "vendor",
    status: "pending",
    detail: "Analyzing PCI DSS compliance and payment security certifications",
  },
  {
    id: "3",
    title: "Assessing Data Privacy Risks",
    type: "risk",
    status: "pending",
    detail: "Mapping personal data flows across your systems",
  },
  {
    id: "4",
    title: "Writing Access Control Policy",
    type: "policy",
    status: "pending",
    detail: "Incorporating your Okta SSO and role-based permissions",
  },
  {
    id: "5",
    title: "Implementing Encryption Controls",
    type: "control",
    status: "pending",
    detail: "Configuring TLS, data-at-rest, and key management standards",
  },
  {
    id: "6",
    title: "Auditing GitHub Security",
    type: "vendor",
    status: "pending",
    detail: "Reviewing branch protection, access controls, and audit logs",
  },
  {
    id: "7",
    title: "Creating Incident Response Plan",
    type: "policy",
    status: "pending",
    detail: "Building runbooks for security events and data breaches",
  },
  {
    id: "8",
    title: "Collecting AWS Evidence",
    type: "evidence",
    status: "pending",
    detail:
      "Gathering CloudTrail logs, IAM policies, and security configurations",
  },
  {
    id: "9",
    title: "Evaluating Third-Party Risks",
    type: "risk",
    status: "pending",
    detail: "Scoring vendor security posture and compliance gaps",
  },
  {
    id: "10",
    title: "Drafting Data Retention Policy",
    type: "policy",
    status: "pending",
    detail: "Aligning with GDPR requirements and business needs",
  },
  {
    id: "11",
    title: "Monitoring Security Posture",
    type: "evidence",
    status: "pending",
    detail: "Continuous compliance checks across cloud infrastructure",
  },
  {
    id: "12",
    title: "Building Vendor Management Program",
    type: "control",
    status: "pending",
    detail: "Establishing review cycles and risk assessment workflows",
  },
];

const StatusIcon = ({ status }: { status: string }) => {
  const baseClass = "w-4 h-4 flex-shrink-0";
  switch (status) {
    case "pending":
      return <Circle className={cn(baseClass, "text-muted-foreground")} />;
    case "processing":
      return (
        <Loader2
          className={cn(
            baseClass,
            "animate-spin text-purple-600 dark:text-purple-400"
          )}
        />
      );
    case "complete":
      return <CheckCircle2 className={cn(baseClass, "text-primary")} />;
    case "issue":
      return (
        <AlertTriangle
          className={cn(baseClass, "text-amber-600 dark:text-amber-400")}
        />
      );
    default:
      return <Circle className={cn(baseClass, "text-muted-foreground")} />;
  }
};

const getIcon = (type: WorkItem["type"]) => {
  switch (type) {
    case "policy":
      return FileText;
    case "vendor":
      return Search;
    case "risk":
      return Shield;
    case "control":
      return Shield;
    case "evidence":
      return Users;
    default:
      return FileText;
  }
};

export function AiWorkPreview() {
  const [workItems, setWorkItems] = useState<WorkItem[]>(INITIAL_WORK_ITEMS);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const processNextItem = () => {
      // Start processing current item
      setWorkItems((prev) => {
        const newItems = [...prev];
        if (newItems[currentIndex]) {
          newItems[currentIndex].status = "processing";
        }
        return newItems;
      });

      // Different task types take different amounts of time
      const currentItem = workItems[currentIndex];
      let baseTime = 8000;
      let variability = 6000;

      if (currentItem) {
        switch (currentItem.type) {
          case "policy":
            baseTime = 10000; // Policies take longer to draft
            variability = 5000;
            break;
          case "vendor":
            baseTime = 8000; // Vendor research is moderate
            variability = 4000;
            break;
          case "risk":
            baseTime = 9000; // Risk assessment is thorough
            variability = 5000;
            break;
          case "control":
            baseTime = 7000; // Controls are more straightforward
            variability = 3000;
            break;
          case "evidence":
            baseTime = 6000; // Evidence collection is faster
            variability = 3000;
            break;
        }
      }

      // Complete current item and move to next after delay
      timeoutId = setTimeout(
        () => {
          setWorkItems((prev) => {
            const newItems = [...prev];
            if (newItems[currentIndex]) {
              // Add some randomness - occasionally flag issues
              if (
                newItems[currentIndex].type === "vendor" &&
                Math.random() < 0.2
              ) {
                newItems[currentIndex].status = "issue";
              } else {
                newItems[currentIndex].status = "complete";
              }
            }
            return newItems;
          });

          // Move to next item after a brief pause
          setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % workItems.length);
          }, 2000);
        },
        baseTime + Math.random() * variability
      );
    };

    timeoutId = setTimeout(processNextItem, 2000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentIndex, workItems.length, workItems]);

  // Get visible items (previous, current, next)
  const getVisibleItems = () => {
    const prev = (currentIndex - 1 + workItems.length) % workItems.length;
    const next = (currentIndex + 1) % workItems.length;
    return [prev, currentIndex, next];
  };

  const visibleIndexes = getVisibleItems();

  return (
    <div className="flex h-[500px] w-full flex-col select-none">
      {/* Header */}
      <div className="mb-8 flex items-start gap-3">
        <div className="relative">
          <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex flex-col gap-4">
          <p className="text-2xl font-bold">
            Our AI is getting you audit-ready
          </p>
          <p className="text-md">
            We have begun drafting personalized policies, researching vendor
            compliance, and assessing potential risks to get you audit-ready.
          </p>
          <p className="text-md">
            Select a plan to gain access to your personalized compliance
            program.
          </p>
        </div>
      </div>
      <Separator />

      {/* Carousel container */}
      <div className="relative flex-1 overflow-hidden pt-12">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <AnimatePresence initial={false}>
            {visibleIndexes.map((itemIndex, position) => {
              const item = workItems[itemIndex];
              const Icon = getIcon(item.type);
              const isProcessing = item.status === "processing";
              const isDone =
                item.status === "complete" || item.status === "issue";
              const isPrev = position === 0;
              const isCurrent = position === 1;
              const isNext = position === 2;

              return (
                <motion.div
                  key={`${item.id}-${itemIndex}`}
                  initial={
                    isNext ? { opacity: 0, y: 100 } : { opacity: 0, y: -100 }
                  }
                  animate={{
                    opacity: isCurrent ? 1 : isPrev && isDone ? 0.5 : 0.3,
                    y: isPrev ? -130 : isCurrent ? 0 : 130,
                    scale: isCurrent ? 1 : 0.9,
                  }}
                  exit={{ opacity: 0, y: -200 }}
                  transition={{
                    type: "spring",
                    stiffness: 100,
                    damping: 25,
                    mass: 1,
                  }}
                  className={cn(
                    "absolute w-full max-w-xl rounded-lg border",
                    isCurrent ? "z-20" : isNext ? "z-10" : "z-0",
                    isCurrent &&
                      isProcessing &&
                      "border-purple-500/50 bg-purple-50/5 shadow-xl shadow-purple-500/10 dark:bg-purple-950/10",
                    isCurrent && !isProcessing && "bg-background",
                    !isCurrent && "pointer-events-none"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-start gap-3 p-4",
                      isCurrent &&
                        isProcessing &&
                        "bg-gradient-to-r from-purple-50/5 to-transparent dark:from-purple-950/20"
                    )}
                  >
                    <StatusIcon status={item.status} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="text-muted-foreground h-4 w-4" />
                        <p
                          className={cn(
                            "text-sm font-medium",
                            isPrev &&
                              isDone &&
                              "text-muted-foreground line-through"
                          )}
                        >
                          {item.title}
                        </p>
                        <span
                          className={cn(
                            "ml-auto rounded-full px-2 py-0.5 text-xs",
                            item.type === "policy" &&
                              "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                            item.type === "vendor" &&
                              "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                            item.type === "risk" &&
                              "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
                            item.type === "control" &&
                              "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
                            item.type === "evidence" &&
                              "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                          )}
                        >
                          {item.type}
                        </span>
                      </div>

                      {item.detail && isCurrent && !isProcessing && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {item.detail}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Animated data stream when processing */}
                  <AnimatePresence>
                    {isCurrent && isProcessing && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 82, opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4">
                          <MiniDataStream
                            taskType={item.type}
                            itemTitle={item.title}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Fade gradients */}
        <div className="from-background pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b to-transparent" />
        <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t to-transparent" />
      </div>
    </div>
  );
}
