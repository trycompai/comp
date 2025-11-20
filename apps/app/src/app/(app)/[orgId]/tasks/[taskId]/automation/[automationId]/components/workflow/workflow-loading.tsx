"use client";

import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

interface Props {
  className?: string;
}

export function WorkflowLoading({ className }: Props) {
  return (
    <div
      className={cn(
        "bg-background flex h-full flex-col overflow-hidden",
        className,
      )}
    >
      {/* Header */}
      <div className="border-border border-b px-6 py-4">
        <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <Zap className="text-primary h-4 w-4 animate-pulse" />
          Generating Workflow
        </h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Analyzing your automation...
        </p>
      </div>

      {/* Loading Animation */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Animated Cards */}
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="relative"
              style={{
                animation: `slideIn 0.5s ease-out ${index * 0.2}s forwards`,
                opacity: 0,
              }}
            >
              {/* Connection Line */}
              {index < 2 && (
                <div
                  className="bg-border absolute top-14 left-6 h-12 w-0.5"
                  style={{
                    animation: `growDown 0.3s ease-out ${index * 0.2 + 0.5}s forwards`,
                    transformOrigin: "top",
                    transform: "scaleY(0)",
                  }}
                />
              )}

              {/* Card */}
              <div className="border-border bg-card relative rounded-sm border p-4">
                <div className="flex items-start gap-4">
                  {/* Skeleton Icon */}
                  <div className="bg-muted animate-pulse rounded-sm p-2.5">
                    <div className="bg-muted-foreground/30 h-4 w-4 rounded" />
                  </div>

                  {/* Skeleton Content */}
                  <div className="flex-1 space-y-2">
                    <div
                      className="bg-muted h-4 animate-pulse"
                      style={{ width: `${60 + index * 10}%` }}
                    />
                    <div
                      className="bg-muted/60 h-3 animate-pulse rounded"
                      style={{ width: `${80 - index * 10}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes growDown {
          from {
            transform: scaleY(0);
          }
          to {
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
}
