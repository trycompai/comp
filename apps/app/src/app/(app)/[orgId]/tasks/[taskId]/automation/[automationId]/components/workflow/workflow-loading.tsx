'use client';

import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';

interface Props {
  className?: string;
}

export function WorkflowLoading({ className }: Props) {
  return (
    <div className={cn('flex flex-col h-full overflow-hidden bg-background', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary animate-pulse" />
          Generating Workflow
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Analyzing your automation...</p>
      </div>

      {/* Loading Animation */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="space-y-8 max-w-md w-full">
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
                  className="absolute left-6 top-14 w-0.5 h-12 bg-border"
                  style={{
                    animation: `growDown 0.3s ease-out ${index * 0.2 + 0.5}s forwards`,
                    transformOrigin: 'top',
                    transform: 'scaleY(0)',
                  }}
                />
              )}

              {/* Card */}
              <div className="relative p-4 rounded-sm border border-border bg-card">
                <div className="flex items-start gap-4">
                  {/* Skeleton Icon */}
                  <div className="p-2.5 rounded-sm bg-muted animate-pulse">
                    <div className="w-4 h-4 bg-muted-foreground/30 rounded" />
                  </div>

                  {/* Skeleton Content */}
                  <div className="flex-1 space-y-2">
                    <div
                      className="h-4 bg-muted animate-pulse"
                      style={{ width: `${60 + index * 10}%` }}
                    />
                    <div
                      className="h-3 bg-muted/60 rounded animate-pulse"
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
