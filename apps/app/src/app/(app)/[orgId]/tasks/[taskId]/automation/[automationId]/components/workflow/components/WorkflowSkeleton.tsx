"use client";

import { Card, CardContent } from "@trycompai/ui/card";

export function WorkflowSkeleton() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      {/* Animated Cards */}
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="relative"
          style={{
            animation: `fadeIn 0.4s ease-out ${index * 0.15}s forwards`,
            opacity: 0,
          }}
        >
          {/* Connection Line */}
          {index > 0 && (
            <div className="absolute -top-6 left-6 flex flex-col items-center">
              <div className="bg-border/30 h-6 w-px" />
            </div>
          )}

          {/* Skeleton Card */}
          <Card className="border-border/50 bg-card relative overflow-hidden border">
            <CardContent className="relative p-5">
              <div className="flex items-center gap-4">
                {/* Skeleton Icon */}
                <div className="relative">
                  <div className="bg-muted h-12 w-12 shrink-0 animate-pulse rounded-xl" />
                  <div className="bg-card border-border/50 absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border">
                    <span className="text-muted-foreground/50 text-[11px] font-semibold">
                      {index + 1}
                    </span>
                  </div>
                </div>

                {/* Skeleton Content */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="bg-muted h-4 animate-pulse rounded"
                      style={{ width: "140px" }}
                    />
                    <div className="bg-muted/70 h-5 w-16 animate-pulse rounded-full" />
                  </div>
                  <div
                    className="bg-muted/70 h-3 animate-pulse rounded"
                    style={{ width: "220px" }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
