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
  isTesting?: boolean;
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
  isTesting = false,
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
    // Calculate total animation time:
    // Card fade in (1s) + expand delay (0.3s) + expand (0.8s) + last step reveal
    // Last step appears at: 0.5 + (steps.length - 1) * 0.5 + 0.5s for animation
    const lastStepDelay = steps.length > 0 ? 0.5 + (steps.length - 1) * 0.5 : 0;
    const totalAnimationTime = (1.3 + lastStepDelay + 0.8) * 1000; // ~2.6s + 0.5s per step

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
          {(integrationsUsed?.length ? integrationsUsed : [{ link: 'trycomp.ai' }]).map(
            (integration) => (
              <div
                key={`https://img.logo.dev/${integration.link}?token=pk_AZatYxV5QDSfWpRDaBxzRQ`}
              >
                <Image
                  src={`https://img.logo.dev/${integration.link}?token=pk_AZatYxV5QDSfWpRDaBxzRQ`}
                  alt={integration.link}
                  width={20}
                  height={20}
                  unoptimized
                />
              </div>
            ),
          )}
        </div>

        <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>

      {/* Steps Section - Sequential reveal animation */}
      {steps.length > 0 && (
        <CardContent className="p-0 m-0">
          <Card
            key={`workflow-steps-${steps.length}`}
            className="bg-background rounded-2xl border border-border border-b-0 border-x-0 rounded-bl-none rounded-br-none w-full overflow-hidden"
            style={
              {
                // Use 'both' fill-mode: applies 'from' during delay, persists 'to' after
                animation: `expand-height 0.8s ease-out 0.3s both`,
                '--final-height': `${steps.length * 80 + 32}px`,
              } as React.CSSProperties
            }
          >
            <CardContent className="p-4">
              <div className="space-y-4">
                {steps.map((step, index) => {
                  // Each step appears sequentially: step 0 at 0.5s, step 1 at 1.0s, step 2 at 1.5s, etc.
                  const stepDelay = 0.5 + index * 0.5;
                  const iconDelay = stepDelay + 0.15;
                  const lineDelay = stepDelay + 0.3;

                  return (
                    <div
                      key={step.id}
                      className="flex items-start gap-3"
                      style={{
                        animation: `reveal-step 0.5s ease-out ${stepDelay}s both`,
                      }}
                    >
                      {/* Icon column with connection */}
                      <div className="flex flex-col items-center">
                        <div
                          className="w-5 h-5 rounded-md bg-linear-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center shadow-sm"
                          style={{
                            animation: `zoom-icon 0.3s ease-out ${iconDelay}s both`,
                          }}
                        >
                          <Zap className="w-3 h-3 text-primary" />
                        </div>
                        {/* Connection line - only show if not last step */}
                        {index < steps.length - 1 && (
                          <div
                            className="w-px h-4 bg-linear-to-b from-border to-border/50 mt-2"
                            style={{
                              animation: `reveal-step 0.3s ease-out ${lineDelay}s both`,
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
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      )}

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
        className={`relative z-10 rounded-b-xl p-4 w-full border-0 border-t border-border transition-colors duration-500 ${
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
            disabled={isTesting}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTest?.();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors animate-in fade-in duration-500 pointer-events-auto"
          >
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isTesting ? 'Testing...' : 'Test Integration'}
          </button>
        )}
      </div>
    </Card>
  );
}
