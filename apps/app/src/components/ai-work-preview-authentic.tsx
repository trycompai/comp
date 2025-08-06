'use client';

import { cn } from '@comp/ui/cn';
import { Progress } from '@comp/ui/progress';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  Search,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { MiniDataStream } from './mini-data-stream';
import { T, useGT } from 'gt-next';

interface WorkItem {
  id: string;
  title: string;
  type: 'policy' | 'vendor' | 'risk' | 'control' | 'evidence';
  status: 'waiting' | 'processing' | 'complete' | 'error';
  progress: number;
  subtitle?: string;
}

const getWorkItems = (t: (content: string) => string): WorkItem[] => [
  {
    id: '1',
    title: t('Analyzing your tech stack'),
    subtitle: t('AWS, GitHub, Stripe detected'),
    type: 'evidence',
    status: 'waiting' as const,
    progress: 0,
  },
  {
    id: '2',
    title: t('Researching vendor compliance'),
    subtitle: t('Checking SOC 2 & security certifications'),
    type: 'vendor',
    status: 'waiting' as const,
    progress: 0,
  },
  {
    id: '3',
    title: t('Drafting security policies'),
    subtitle: t('Based on your infrastructure'),
    type: 'policy',
    status: 'waiting' as const,
    progress: 0,
  },
  {
    id: '4',
    title: t('Identifying compliance risks'),
    subtitle: t('Scanning for gaps and vulnerabilities'),
    type: 'risk',
    status: 'waiting' as const,
    progress: 0,
  },
  {
    id: '5',
    title: t('Setting up monitoring'),
    subtitle: t('Continuous compliance tracking'),
    type: 'control',
    status: 'waiting' as const,
    progress: 0,
  },
];

const StatusIcon = ({ status, progress }: { status: string; progress: number }) => {
  const baseClass = 'w-4 h-4 flex-shrink-0';

  if (status === 'processing') {
    return <Loader2 className={cn(baseClass, 'text-primary animate-spin')} />;
  }

  if (status === 'complete') {
    return <CheckCircle2 className={cn(baseClass, 'text-green-600 dark:text-green-400')} />;
  }

  if (status === 'error') {
    return <AlertCircle className={cn(baseClass, 'text-amber-600 dark:text-amber-400')} />;
  }

  return <Circle className={cn(baseClass, 'text-muted-foreground/50')} />;
};

const getIcon = (type: WorkItem['type']) => {
  switch (type) {
    case 'policy':
      return FileText;
    case 'vendor':
      return Search;
    case 'risk':
      return Shield;
    case 'control':
      return Shield;
    case 'evidence':
      return Search;
    default:
      return FileText;
  }
};

export function AiWorkPreviewAuthentic() {
  const t = useGT();
  const [workItems, setWorkItems] = useState<WorkItem[]>(getWorkItems(t));
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    // Start first task after a short delay
    setTimeout(() => {
      setWorkItems((items) =>
        items.map((item, index) => ({
          ...item,
          status: (index === 0 ? 'processing' : item.status) as WorkItem['status'],
        })),
      );
    }, 2000);

    // Simulate very slow progress for realism - actually takes 2-7 minutes
    const progressInterval = setInterval(() => {
      setWorkItems((items) => {
        let hasChanges = false;
        const updated = items.map((item, index) => {
          if (item.status === 'processing') {
            hasChanges = true;

            // Last task gets stuck at 94%
            if (index === 4 && item.progress >= 94) {
              return item;
            }

            // Progress rate calibrated for 2-7 minute completion
            const increment = Math.random() * 4.0 + 1.5; // 1.5-5.5% per interval for 2-7 minute completion
            const newProgress = Math.min(100, item.progress + increment);

            if (newProgress >= 100) {
              // Complete this task and start the next waiting one after a delay
              const nextWaitingIndex = items.findIndex((i) => i.status === 'waiting');
              if (nextWaitingIndex !== -1) {
                setTimeout(
                  () => {
                    setWorkItems((prev) =>
                      prev.map((i, idx) =>
                        idx === nextWaitingIndex ? { ...i, status: 'processing' as const } : i,
                      ),
                    );
                  },
                  Math.random() * 3000 + 2000, // 2-5 seconds between tasks
                );
              }

              return { ...item, progress: 100, status: 'complete' as const };
            }

            return { ...item, progress: newProgress };
          }
          return item;
        });

        // Calculate overall progress
        const totalProgress = updated.reduce((sum, item) => sum + item.progress, 0);
        setOverallProgress(Math.round(totalProgress / updated.length));

        return updated;
      });
    }, 2000); // Update every 2 seconds

    return () => {
      clearInterval(progressInterval);
    };
  }, []);

  const processingCount = workItems.filter((item) => item.status === 'processing').length;
  const completedCount = workItems.filter((item) => item.status === 'complete').length;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="relative">
          <Sparkles className="h-6 w-6 text-primary" />
          {processingCount > 0 && (
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
          )}
        </div>
        <div className="flex-1">
          <T>
            <h2 className="text-2xl font-semibold">AI is building your compliance program</h2>
          </T>
          <T>
            <p className="text-sm text-muted-foreground mt-1">
              This process typically takes 2-7 minutes to complete
            </p>
          </T>
          <T>
            <p className="text-xs text-muted-foreground/70 mt-1">
              We're thoroughly analyzing your infrastructure to create accurate, personalized policies
            </p>
          </T>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <T>
            <span className="text-sm text-muted-foreground">Background job progress</span>
          </T>
          <span className="text-lg font-semibold tabular-nums">{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
        <p className="text-xs text-muted-foreground/70">
          {t('{completedCount} of {totalTasks} tasks completed • Estimated time remaining: {timeRemaining}', {
            completedCount,
            totalTasks: workItems.length,
            timeRemaining: overallProgress < 10
              ? t('6-7 min')
              : overallProgress < 20
                ? t('5-6 min')
                : overallProgress < 40
                  ? t('4-5 min')
                  : overallProgress < 60
                    ? t('3-4 min')
                    : overallProgress < 80
                      ? t('2-3 min')
                      : overallProgress < 90
                        ? t('1-2 min')
                        : t('Almost done...')
          })}
        </p>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        <AnimatePresence mode="sync">
          {workItems.map((item, index) => {
            const Icon = getIcon(item.type);
            const isProcessing = item.status === 'processing';
            const isComplete = item.status === 'complete';
            const isWaiting = item.status === 'waiting';
            const isStuck = index === 4 && item.progress >= 94 && item.progress < 100;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className={cn(
                  'rounded-lg border p-4 transition-all duration-300',
                  isProcessing && 'border-primary/50 bg-primary/5 backdrop-blur-sm shadow-md',
                  isComplete &&
                    'border-green-500/30 bg-green-50/50 dark:bg-green-950/20 backdrop-blur-sm',
                  isWaiting && 'border-border/50 bg-muted/30 backdrop-blur-sm',
                )}
              >
                <div className="flex items-start gap-3">
                  <StatusIcon status={item.status} progress={item.progress} />

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                          <p
                            className={cn(
                              'font-medium text-sm',
                              isComplete && 'text-muted-foreground',
                            )}
                          >
                            {item.title}
                          </p>
                        </div>
                        {item.subtitle && !isProcessing && (
                          <p className="text-xs text-muted-foreground/60 pl-5">{item.subtitle}</p>
                        )}
                      </div>

                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium backdrop-blur-sm uppercase tracking-wider',
                          'bg-muted/50 dark:bg-muted/30 text-muted-foreground border border-border/50',
                        )}
                      >
                        {item.type.replace('_', ' ')}
                      </span>
                    </div>

                    {isProcessing && (
                      <div className="space-y-2 pl-5">
                        <MiniDataStream taskType={item.type} itemTitle={item.title} />
                        <div className="space-y-1">
                          <Progress value={item.progress} className="h-1" />
                          <p
                            className={cn(
                              'text-xs text-muted-foreground/60 tabular-nums',
                              isStuck && 'text-amber-600 dark:text-amber-400',
                            )}
                          >
                            {t('{progress}% complete{finalizingText}', {
                              progress: Math.round(item.progress),
                              finalizingText: isStuck ? t(' - Finalizing...') : ''
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
