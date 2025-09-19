'use client';

import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  FileText,
  GitBranch,
  Globe,
  Key,
  Shield,
  Webhook,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSandboxStore } from '../../state';
import { WorkflowLoading } from './workflow-loading';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  type: 'trigger' | 'action' | 'condition' | 'output';
  status?: 'pending' | 'running' | 'completed' | 'error';
  icon: React.ReactNode;
  metadata?: {
    method?: string;
    url?: string;
    condition?: string;
    output?: string;
  };
}

interface Props {
  className?: string;
}

// Analyze script content to extract workflow steps
function analyzeScript(content: string): WorkflowStep[] {
  const steps: WorkflowStep[] = [];
  let stepId = 0;

  // Always start with a trigger
  steps.push({
    id: `step-${stepId++}`,
    title: 'Automation Triggered',
    description: 'Lambda function invoked with event data',
    type: 'trigger',
    icon: <Zap className="w-4 h-4" />,
    metadata: {
      method: 'EVENT',
      output: 'event.orgId, event.taskId',
    },
  });

  // Analyze fetch calls
  const fetchMatches = content.matchAll(/fetch\s*\(\s*['"`]([^'"`]+)['"`]|fetch\s*\(\s*([^,\)]+)/g);
  for (const match of fetchMatches) {
    const url = match[1] || match[2];
    let title = 'API Call';
    let description = 'Making HTTP request';
    let icon = <Globe className="w-4 h-4" />;

    // Identify specific API types
    if (url?.includes('github.com')) {
      title = 'GitHub API Call';
      description = 'Fetching data from GitHub';
      icon = <GitBranch className="w-4 h-4" />;
    } else if (url?.includes('vulnerability') || url?.includes('security')) {
      title = 'Security Check';
      description = 'Checking for vulnerabilities';
      icon = <Shield className="w-4 h-4" />;
    } else if (url?.includes('webhook')) {
      title = 'Webhook Call';
      description = 'Sending webhook notification';
      icon = <Webhook className="w-4 h-4" />;
    }

    // Extract method if available
    const methodMatch = content.match(
      new RegExp(`fetch[^}]*method:\\s*['"\`]?(GET|POST|PUT|DELETE|PATCH)['"\`]?`, 'i'),
    );

    steps.push({
      id: `step-${stepId++}`,
      title,
      description,
      type: 'action',
      icon,
      metadata: {
        method: methodMatch?.[1] || 'GET',
        url: url?.replace(/['"`]/g, '').substring(0, 50) + '...',
      },
    });
  }

  // Analyze credential usage
  if (content.includes('getOrgCredentials') || content.includes('getCredentials')) {
    steps.push({
      id: `step-${stepId++}`,
      title: 'Fetch Credentials',
      description: 'Retrieving organization credentials securely',
      type: 'action',
      icon: <Key className="w-4 h-4" />,
      metadata: {
        method: 'SECURE',
        output: 'username, password',
      },
    });
  }

  // Analyze conditions
  const ifMatches = content.matchAll(/if\s*\(\s*([^)]+)\s*\)/g);
  let conditionCount = 0;
  for (const match of ifMatches) {
    const condition = match[1];
    if (condition && !condition.includes('!') && conditionCount < 3) {
      // Limit to 3 conditions
      conditionCount++;
      steps.push({
        id: `step-${stepId++}`,
        title: 'Conditional Check',
        description: 'Evaluating condition',
        type: 'condition',
        icon: <AlertCircle className="w-4 h-4" />,
        metadata: {
          condition: condition.substring(0, 40) + '...',
        },
      });
    }
  }

  // Analyze data processing
  if (content.includes('.json()')) {
    steps.push({
      id: `step-${stepId++}`,
      title: 'Parse Response',
      description: 'Processing JSON response data',
      type: 'action',
      icon: <FileText className="w-4 h-4" />,
    });
  }

  // Analyze return statement
  const returnMatch = content.match(/return\s*{([^}]+)}/);
  if (returnMatch) {
    const returnContent = returnMatch[1];
    let outputDesc = 'Returning processed data';

    if (returnContent.includes('vulnerabilities')) {
      outputDesc = 'Returning vulnerability report';
    } else if (returnContent.includes('error')) {
      outputDesc = 'Returning error details';
    } else if (returnContent.includes('success')) {
      outputDesc = 'Returning success status';
    }

    steps.push({
      id: `step-${stepId++}`,
      title: 'Return Results',
      description: outputDesc,
      type: 'output',
      icon: <CheckCircle2 className="w-4 h-4" />,
      metadata: {
        output: 'JSON response',
      },
    });
  }

  return steps;
}

export function WorkflowVisualizer({ className }: Props) {
  const { paths, sandboxId } = useSandboxStore();
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [scriptContent, setScriptContent] = useState<string>('');
  const generatingDepth = useRef(0);

  console.log('[WorkflowVisualizer] Render:', {
    sandboxId,
    pathsCount: paths?.length || 0,
    stepsCount: steps.length,
    isGenerating,
    isInitializing,
  });

  // Fetch the lambda file content when paths change
  useEffect(() => {
    console.log('[WorkflowVisualizer] useEffect triggered', { sandboxId, paths });

    if (!sandboxId) {
      console.log('[WorkflowVisualizer] No sandboxId, setting isInitializing to false');
      setIsInitializing(false);
      return;
    }

    if (!paths || paths.length === 0) {
      console.log('[WorkflowVisualizer] No paths yet, still waiting...');
      // Still initializing, waiting for paths
      return;
    }

    // Find the lambda file path
    console.log('[WorkflowVisualizer] All paths:', paths);
    const lambdaPath = paths.find(
      (path) => path.endsWith('.js') && (path.includes('lambdas/') || path.includes('/lambdas/')),
    );
    console.log('[WorkflowVisualizer] Found lambda path:', lambdaPath);

    if (!lambdaPath) {
      setIsInitializing(false);
      return;
    }

    // Fetch the file content
    const fetchFileContent = async () => {
      try {
        // Use GET request with path as query parameter
        const response = await fetch(
          `/api/tasks-automations/sandboxes/${sandboxId}/files?path=${encodeURIComponent(lambdaPath.startsWith('/') ? lambdaPath.slice(1) : lambdaPath)}`,
        );

        if (response.ok) {
          const content = await response.text();
          console.log('[WorkflowVisualizer] Fetched content:', content.substring(0, 100) + '...');
          if (content) {
            setScriptContent(content);
            const analyzedSteps = analyzeScript(content);
            console.log('[WorkflowVisualizer] Analyzed steps:', analyzedSteps);
            setSteps(analyzedSteps);
          }
        } else {
          console.error('[WorkflowVisualizer] Failed to fetch file:', response.status);
        }
      } catch (error) {
        console.error('Error fetching file content:', error);
      } finally {
        setIsInitializing(false);
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
        // Add a small delay to prevent flickering
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

  // Show loading state while generating or initializing
  if (isGenerating || isInitializing) {
    return <WorkflowLoading className={className} />;
  }

  if (!sandboxId || (steps.length === 0 && !isGenerating)) {
    return (
      <div className={cn('flex flex-col h-full overflow-hidden bg-background', className)}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Workflow Overview
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Visual representation of your automation steps
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Code2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Workflow will appear here once you generate an automation
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full overflow-hidden bg-background', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Workflow Overview
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Visual representation of your automation steps
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
              <div
                className={cn(
                  'relative p-4 rounded-sm border bg-card transition-all duration-200',
                  step.type === 'trigger' && 'border-green-200 dark:border-green-800',
                  step.type === 'action' && 'border-border',
                  step.type === 'condition' && 'border-blue-200 dark:border-blue-800',
                  step.type === 'output' && 'border-purple-200 dark:border-purple-800',
                  'hover:shadow-md',
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      'p-2.5 rounded-sm',
                      step.type === 'trigger' &&
                        'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
                      step.type === 'action' && 'bg-muted text-muted-foreground',
                      step.type === 'condition' &&
                        'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
                      step.type === 'output' &&
                        'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
                    )}
                  >
                    {step.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>

                    {/* Metadata */}
                    {step.metadata && (
                      <div className="mt-2 space-y-1">
                        {step.metadata.method && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Method:</span>
                            <code className="px-1.5 py-0.5 bg-muted rounded text-foreground">
                              {step.metadata.method}
                            </code>
                          </div>
                        )}
                        {step.metadata.url && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">URL:</span>
                            <code className="px-1.5 py-0.5 bg-muted rounded text-foreground truncate">
                              {step.metadata.url}
                            </code>
                          </div>
                        )}
                        {step.metadata.condition && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Condition:</span>
                            <code className="px-1.5 py-0.5 bg-muted rounded text-foreground truncate">
                              {step.metadata.condition}
                            </code>
                          </div>
                        )}
                        {step.metadata.output && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Output:</span>
                            <code className="px-1.5 py-0.5 bg-muted rounded text-foreground">
                              {step.metadata.output}
                            </code>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Step Number */}
                  <div className="text-xs font-mono text-muted-foreground/60">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
