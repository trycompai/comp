'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { Loader2, Play, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  type: 'trigger' | 'action' | 'condition' | 'output';
  iconType:
    | 'start'
    | 'fetch'
    | 'login'
    | 'check'
    | 'process'
    | 'filter'
    | 'notify'
    | 'complete'
    | 'error';
}

interface Props {
  steps: WorkflowStep[];
  title: string;
  onTest?: () => void;
}

export function UnifiedWorkflowCard({ steps, title, onTest }: Props) {
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  useEffect(() => {
    // Calculate total animation time: card (1s) + expansion (1s) + all steps
    const totalAnimationTime = 2500 + steps.length * 1200;

    const timer = setTimeout(() => {
      setIsAnimationComplete(true);
    }, totalAnimationTime);

    return () => clearTimeout(timer);
  }, [steps.length]);
  return (
    <Card className="w-full min-w-md max-w-md mx-auto bg-background border border-border shadow-md rounded-2xl overflow-hidden flex flex-col flex-1 animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-out">
      <style jsx>{`
        @keyframes reveal-step {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes zoom-icon {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }

        @keyframes expand-height {
          from {
            max-height: 0;
          }
          to {
            max-height: var(--final-height);
          }
        }
      `}</style>
      {/* Header with integration icons */}
      <CardHeader className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </div>
        </div>

        <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>

      {/* Steps Section - Pure CSS Animation */}
      <CardContent className="p-0 m-0">
        <Card
          className="bg-background rounded-2xl border border-border border-b-0 border-x-0 rounded-bl-none rounded-br-none w-full"
          style={
            {
              animation: 'expand-height 1s ease-out 1.5s forwards',
              maxHeight: '0px',
              '--final-height': `${steps.length * 90}px`,
            } as React.CSSProperties
          }
        >
          <CardContent className="p-4">
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="flex items-start gap-3"
                  style={{
                    animation: `reveal-step 0.8s ease-out ${2 + index * 1.2}s forwards`,
                    opacity: 0,
                  }}
                >
                  {/* Icon column with connection */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-5 h-5 rounded-md bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center shadow-sm"
                      style={{
                        animation: `zoom-icon 0.5s ease-out ${2.2 + index * 1.2}s forwards`,
                        transform: 'scale(0)',
                      }}
                    >
                      <Zap className="w-3 h-3 text-primary" />
                    </div>
                    {/* Connection line - only show if not last step */}
                    {index < steps.length - 1 && (
                      <div
                        className="w-px h-4 bg-gradient-to-b from-border to-border/50 mt-2"
                        style={{
                          animation: `reveal-step 0.6s ease-out ${2.4 + index * 1.2}s forwards`,
                          opacity: 0,
                        }}
                      />
                    )}
                  </div>

                  {/* Content column */}
                  <div className="flex-1 items-start justify-start flex flex-col">
                    <span className="text-sm leading-none font-medium text-foreground">
                      {step.title}
                    </span>
                    {step.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </CardContent>
      <div
        className={`rounded-b-xl p-4 w-full border-0 border-t border-border transition-colors duration-500 ${
          !isAnimationComplete ? 'bg-blue-100' : 'bg-secondary'
        }`}
      >
        {!isAnimationComplete ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            </div>
            <span className="text-sm text-blue-500">Building automation</span>
          </div>
        ) : (
          <button
            onClick={onTest}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors animate-in fade-in duration-500"
          >
            <Play className="w-4 h-4" />
            Test Automation
          </button>
        )}
      </div>
    </Card>
  );
}
