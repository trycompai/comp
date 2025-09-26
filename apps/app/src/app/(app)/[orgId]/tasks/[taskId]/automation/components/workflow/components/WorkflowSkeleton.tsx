'use client';

import { Card, CardContent } from '@comp/ui/card';

export function WorkflowSkeleton() {
  return (
    <div className="space-y-6 max-w-md mx-auto">
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
              <div className="w-px h-6 bg-border/30" />
            </div>
          )}

          {/* Skeleton Card */}
          <Card className="relative overflow-hidden border border-border/50 bg-card">
            <CardContent className="relative p-5">
              <div className="flex items-center gap-4">
                {/* Skeleton Icon */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-muted animate-pulse shrink-0" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-card border border-border/50 flex items-center justify-center">
                    <span className="text-[11px] font-semibold text-muted-foreground/50">
                      {index + 1}
                    </span>
                  </div>
                </div>

                {/* Skeleton Content */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 bg-muted rounded animate-pulse"
                      style={{ width: '140px' }}
                    />
                    <div className="h-5 w-16 bg-muted/70 rounded-full animate-pulse" />
                  </div>
                  <div
                    className="h-3 bg-muted/70 rounded animate-pulse"
                    style={{ width: '220px' }}
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
