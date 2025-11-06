'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { Loader2, Play, Zap } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTaskAutomation } from '../../../hooks/use-task-automation';
import { useSharedChatContext } from '../../../lib/chat-context';
import { EvaluationCriteriaCard } from '../../evaluation/EvaluationCriteriaCard';

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
  integrationsUsed: {
    link: string;
  }[];
  evaluationCriteria?: string;
  automationId?: string;
}

export function UnifiedWorkflowCard({
  steps,
  title,
  onTest,
  integrationsUsed,
  evaluationCriteria,
  automationId,
}: Props) {
  const { automationIdRef } = useSharedChatContext();
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  // Use the real automation ID from ref (not "new")
  const realAutomationId =
    automationIdRef.current !== 'new' ? automationIdRef.current : automationId;

  // Fetch automation data with the correct ID
  const { automation } = useTaskAutomation(realAutomationId);

  // Use live automation data for criteria, fallback to prop
  const liveCriteria = automation?.evaluationCriteria || evaluationCriteria;

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
      {/* Header with integration icons */}
      <CardHeader className="p-4">
        <div className="flex items-center gap-2 mb-4">
          {integrationsUsed?.map((integration) => (
            <div key={`https://img.logo.dev/${integration.link}?token=pk_AZatYxV5QDSfWpRDaBxzRQ`}>
              <Image
                src={`https://img.logo.dev/${integration.link}?token=pk_AZatYxV5QDSfWpRDaBxzRQ`}
                alt={integration.link}
                width={20}
                height={20}
                unoptimized
              />
            </div>
          ))}
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

      {/* Evaluation Criteria Section - Show after animation */}
      {realAutomationId && realAutomationId !== 'new' && isAnimationComplete && (
        <div className="px-4 pb-4 pt-2 animate-in fade-in duration-500">
          <div className="max-w-[650px] mx-auto">
            <EvaluationCriteriaCard
              automationId={realAutomationId}
              initialCriteria={liveCriteria}
              isAiGenerated={!!liveCriteria}
            />
          </div>
        </div>
      )}

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
            <span className="text-sm text-blue-500">Building integration</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTest?.();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors animate-in fade-in duration-500"
          >
            <Play className="w-4 h-4" />
            Test Integration
          </button>
        )}
      </div>
    </Card>
  );
}
