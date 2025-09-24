'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@comp/ui/card';
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  Database,
  FileText,
  Globe,
  Key,
  Shield,
  Webhook,
  Zap,
} from 'lucide-react';
import React from 'react';

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
  step: WorkflowStep;
  index: number;
  showConnection: boolean;
}

function getIconForType(iconType: WorkflowStep['iconType']): React.ReactNode {
  switch (iconType) {
    case 'start':
      return <Zap className="w-5 h-5" />;
    case 'fetch':
      return <Globe className="w-5 h-5" />;
    case 'login':
      return <Key className="w-5 h-5" />;
    case 'check':
      return <Shield className="w-5 h-5" />;
    case 'process':
      return <FileText className="w-5 h-5" />;
    case 'filter':
      return <Database className="w-5 h-5" />;
    case 'notify':
      return <Webhook className="w-5 h-5" />;
    case 'complete':
      return <CheckCircle2 className="w-5 h-5" />;
    case 'error':
      return <AlertCircle className="w-5 h-5" />;
    default:
      return <Code2 className="w-5 h-5" />;
  }
}

export function WorkflowStepCard({ step, index, showConnection }: Props) {
  return (
    <div className="relative">
      {/* Connection line */}
      {showConnection && (
        <div className="absolute -top-6 left-6 flex flex-col items-center">
          <div className="w-px h-6 bg-gradient-to-b from-transparent via-border/50 to-border/50" />
        </div>
      )}

      {/* Step card */}
      <div className="group relative">
        {/* Subtle glow effect */}
        <div className="absolute -inset-px bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <Card className="relative overflow-hidden border-0 bg-background shadow-sm hover:shadow-md transition-all duration-300">
          <CardContent className="relative p-5">
            <div className="flex items-center gap-4">
              {/* Icon container */}
              <div className="relative">
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300',
                    'shadow-sm group-hover:shadow-md',
                    step.type === 'trigger' &&
                      'bg-gradient-to-br from-primary/20 to-primary/10 text-primary',
                    step.type === 'action' &&
                      'bg-gradient-to-br from-blue-500/20 to-blue-500/10 text-blue-600 dark:text-blue-400',
                    step.type === 'condition' &&
                      'bg-gradient-to-br from-amber-500/20 to-amber-500/10 text-amber-600 dark:text-amber-400',
                    step.type === 'output' &&
                      'bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                  )}
                >
                  {getIconForType(step.iconType)}
                </div>

                {/* Step number badge */}
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background shadow-md border border-border/50 flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-foreground/70">{index + 1}</span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <h3 className="font-semibold text-sm text-foreground">{step.title}</h3>
                  {/* Type indicator */}
                  <div
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium',
                      step.type === 'trigger' && 'bg-primary/10 text-primary',
                      step.type === 'action' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                      step.type === 'condition' &&
                        'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                      step.type === 'output' &&
                        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                    )}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                    {step.type}
                  </div>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
