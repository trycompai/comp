'use client';

import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@trycompai/ui/alert';
import { Button } from '@trycompai/ui/button';
import { Card, CardContent } from '@trycompai/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  Database,
  FileText,
  Globe,
  Key,
  Play,
  Shield,
  Webhook,
  Zap,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSandboxStore } from '../../state';
import { WorkflowLoading } from './workflow-loading';

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

interface TestResult {
  status: 'success' | 'error';
  message?: string;
  data?: any;
  error?: string;
}

interface Props {
  className?: string;
}

// Map icon types to React components
function getIconForType(iconType: WorkflowStep['iconType']): React.ReactNode {
  switch (iconType) {
    case 'start':
      return <Zap className="w-4 h-4" />;
    case 'fetch':
      return <Globe className="w-4 h-4" />;
    case 'login':
      return <Key className="w-4 h-4" />;
    case 'check':
      return <Shield className="w-4 h-4" />;
    case 'process':
      return <FileText className="w-4 h-4" />;
    case 'filter':
      return <Database className="w-4 h-4" />;
    case 'notify':
      return <Webhook className="w-4 h-4" />;
    case 'complete':
      return <CheckCircle2 className="w-4 h-4" />;
    case 'error':
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Code2 className="w-4 h-4" />;
  }
}

export function WorkflowVisualizerNew({ className }: Props) {
  const { paths, sandboxId } = useSandboxStore();
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [lambdaPath, setLambdaPath] = useState<string | null>(null);
  const generatingDepth = useRef(0);
  const { orgId, taskId } = useParams<{ orgId: string; taskId: string }>();

  // Fetch the lambda file content when paths change
  useEffect(() => {
    if (!sandboxId) {
      setIsInitializing(false);
      return;
    }

    if (!paths || paths.length === 0) {
      return;
    }

    // Find the lambda file path
    const foundLambdaPath = paths.find(
      (path) => path.endsWith('.js') && (path.includes('lambdas/') || path.includes('/lambdas/')),
    );

    if (!foundLambdaPath) {
      setIsInitializing(false);
      setLambdaPath(null);
      return;
    }

    setLambdaPath(foundLambdaPath);

    // Fetch the file content
    const fetchFileContent = async () => {
      try {
        setIsAnalyzing(true);

        // Use GET request with path as query parameter
        const response = await fetch(
          `/api/tasks-automations/sandboxes/${sandboxId}/files?path=${encodeURIComponent(foundLambdaPath.startsWith('/') ? foundLambdaPath.slice(1) : foundLambdaPath)}`,
        );

        if (response.ok) {
          const content = await response.text();
          if (content) {
            // Call GPT to analyze the script
            const analyzeResponse = await fetch('/api/workflow/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ scriptContent: content }),
            });

            if (analyzeResponse.ok) {
              const { steps: analyzedSteps } = await analyzeResponse.json();

              // Add IDs to the steps
              const stepsWithIds = analyzedSteps.map((step: any, index: number) => ({
                ...step,
                id: `step-${index}`,
              }));

              setSteps(stepsWithIds);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching/analyzing file content:', error);
      } finally {
        setIsInitializing(false);
        setIsAnalyzing(false);
      }
    };

    fetchFileContent();
  }, [sandboxId, paths]);

  // Listen for file generation events
  useEffect(() => {
    const handleFilesStart = () => {
      generatingDepth.current++;
      setIsGenerating(true);
    };

    const handleFilesFinish = () => {
      generatingDepth.current = Math.max(0, generatingDepth.current - 1);
      if (generatingDepth.current === 0) {
        setTimeout(() => {
          setIsGenerating(false);
        }, 300);
      }
    };

    window.addEventListener('sandbox:files-start', handleFilesStart);
    window.addEventListener('sandbox:files-finish', handleFilesFinish);

    return () => {
      window.removeEventListener('sandbox:files-start', handleFilesStart);
      window.removeEventListener('sandbox:files-finish', handleFilesFinish);
    };
  }, []);

  async function handleTest() {
    if (!sandboxId || !lambdaPath) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      // First, fetch the Lambda script content from the sandbox
      const scriptResponse = await fetch(
        `/api/tasks-automations/sandboxes/${sandboxId}/files?path=${encodeURIComponent(lambdaPath.startsWith('/') ? lambdaPath.slice(1) : lambdaPath)}`,
      );

      if (!scriptResponse.ok) {
        throw new Error('Failed to fetch Lambda script from sandbox');
      }

      const scriptContent = await scriptResponse.text();

      // Upload the script to S3
      const uploadResponse = await fetch('/api/s3/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          taskId,
          content: scriptContent,
          type: 'lambda',
        }),
      });

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json();
        throw new Error(uploadError.error || 'Failed to upload script to S3');
      }

      // Now execute the Lambda
      const response = await fetch('/api/tasks-automations/lambda/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sandboxId,
          orgId,
          taskId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setTestResult({
          status: 'error',
          message: 'Failed to execute automation',
          error: result.error || result.details || result.message || 'Unknown error occurred',
        });
      } else {
        setTestResult({
          status: 'success',
          message: 'Automation completed successfully',
          data: result.data || result,
        });
      }
    } catch (error) {
      console.error('Test execution error:', error);
      setTestResult({
        status: 'error',
        message: 'Failed to execute automation',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsTesting(false);
    }
  }

  // Show loading state while generating, initializing, or analyzing
  if (isGenerating || isInitializing || isAnalyzing) {
    return <WorkflowLoading className={className} />;
  }

  if (!sandboxId || steps.length === 0) {
    return (
      <div className={cn('flex flex-col h-full overflow-hidden bg-background', className)}>
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Workflow Overview
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Visual representation of your automation steps
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Code2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Workflow will appear here once you generate an automation
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn('flex flex-col h-full overflow-hidden bg-background', className)}>
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Workflow Overview
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Your automation broken down into simple steps
          </p>
        </div>

        {/* Workflow Steps */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4 max-w-2xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="relative">
                {/* Connection Line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-6 top-14 w-0.5 h-12 bg-border" />
                )}

                {/* Step Card */}
                <Card className="relative z-10 bg-card transition-all duration-200 hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div
                        className={cn(
                          'p-2 rounded-sm shrink-0',
                          step.type === 'trigger' &&
                            'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
                          step.type === 'action' && 'bg-muted text-muted-foreground',
                          step.type === 'condition' &&
                            'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
                          step.type === 'output' &&
                            'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
                        )}
                      >
                        {getIconForType(step.iconType)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium">{step.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                      </div>

                      {/* Step Number */}
                      <div className="text-xs font-mono text-muted-foreground/50">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}

            {/* Test Button */}
            <div className="pt-6 pb-2">
              <div className="relative">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-lg" />
                <Button
                  onClick={handleTest}
                  disabled={isTesting || !lambdaPath}
                  size="lg"
                  className="relative w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:hover:scale-100 transition-all duration-200"
                >
                  {isTesting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current opacity-25 border-t-transparent rounded-full animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Test Automation</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Result Modal */}
      <Dialog open={!!testResult} onOpenChange={(open) => !open && setTestResult(null)}>
        <DialogContent
          className={cn(
            'max-w-md',
            testResult?.status === 'success'
              ? '[&>*]:border-green-200 dark:[&>*]:border-green-800'
              : '[&>*]:border-red-200 dark:[&>*]:border-red-800',
          )}
        >
          <DialogHeader>
            <div className="flex justify-center mb-4">
              {testResult?.status === 'success' ? (
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              )}
            </div>
            <DialogTitle className="text-center">
              {testResult?.status === 'success' ? 'Test Successful!' : 'Test Failed'}
            </DialogTitle>
            {testResult?.message && (
              <DialogDescription className="text-center">{testResult.message}</DialogDescription>
            )}
          </DialogHeader>

          {/* Result Data */}
          {testResult?.data && (
            <Alert className="bg-muted/50 border-muted">
              <AlertDescription>
                <p className="text-xs font-medium text-muted-foreground mb-2">RESULT</p>
                <pre className="text-xs text-foreground overflow-x-auto">
                  {JSON.stringify(testResult.data, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Details */}
          {testResult?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="text-xs font-medium mb-1">ERROR DETAILS</p>
                <p className="text-xs font-mono">{testResult.error}</p>
              </AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
