'use client';

import type { EvidenceAutomation, EvidenceAutomationRun } from '@db';
import { CheckCircle2, Circle, Loader2, Sparkles, XCircle } from 'lucide-react';
import { useMemo } from 'react';

interface AutomationIndicatorProps {
  automations?: Array<{
    id: string;
    isEnabled: boolean;
    name: string;
    runs?: Array<{
      status: string;
      success: boolean | null;
      evaluationStatus: string | null;
      createdAt: Date;
    }>;
  }>;
  variant?: 'badge' | 'inline';
}

export function AutomationIndicator({ automations = [], variant = 'badge' }: AutomationIndicatorProps) {
  const automationState = useMemo(() => {
    if (!automations || automations.length === 0) return null;

    const enabled = automations.filter((a) => a.isEnabled);
    if (enabled.length === 0) return null;

    // Get latest run from all enabled automations
    const latestRuns = enabled
      .map((a) => a.runs?.[0])
      .filter(Boolean)
      .sort((a, b) => {
        if (!a?.createdAt || !b?.createdAt) return 0;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    const latestRun = latestRuns[0];
    if (!latestRun) {
      return {
        count: enabled.length,
        status: 'no-runs' as const,
        health: 'unknown' as const,
      };
    }

    // Determine health based on run status and evaluation
    let health: 'healthy' | 'warning' | 'error' | 'unknown' = 'unknown';
    if (latestRun.status === 'completed' && latestRun.success) {
      health = latestRun.evaluationStatus === 'fail' ? 'warning' : 'healthy';
    } else if (latestRun.status === 'failed' || latestRun.evaluationStatus === 'fail') {
      health = 'error';
    } else if (latestRun.status === 'running') {
      health = 'unknown';
    }

    return {
      count: enabled.length,
      status: latestRun.status,
      health,
      hasEvaluation: latestRun.evaluationStatus !== null,
    };
  }, [automations]);

  if (!automationState) return null;

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <Sparkles className={`h-3.5 w-3.5 ${
            automationState.health === 'healthy'
              ? 'text-emerald-500'
              : automationState.health === 'warning'
                ? 'text-amber-500'
                : automationState.health === 'error'
                  ? 'text-red-500'
                  : 'text-slate-400'
          }`} />
          {automationState.status === 'running' && (
            <Loader2 className="absolute -top-0.5 -right-0.5 h-2 w-2 animate-spin text-blue-500" />
          )}
        </div>
        <span className="text-slate-600 text-[10px] font-medium">
          {automationState.count > 1 ? `${automationState.count}x` : 'AI'}
        </span>
      </div>
    );
  }

  // Badge variant
  const healthColors = {
    healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    unknown: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  const healthIcons = {
    healthy: CheckCircle2,
    warning: Circle,
    error: XCircle,
    unknown: Sparkles,
  };

  const Icon = healthIcons[automationState.health];

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium ${healthColors[automationState.health]}`}
    >
      <Icon className={`h-3 w-3 shrink-0 ${
        automationState.status === 'running' ? 'animate-pulse' : ''
      }`} />
      <span>
        {automationState.count > 1 ? `${automationState.count} automations` : 'Automated'}
      </span>
    </div>
  );
}

