/**
 * useTaskAutomationAnalyze Hook
 *
 * Analyzes task automation scripts to extract workflow steps and descriptions.
 * Provides both client-side parsing and future support for AI-powered analysis.
 *
 * @example
 * ```tsx
 * const { steps, description, isAnalyzing } = useTaskAutomationAnalyze({
 *   scriptContent: scriptContent,
 *   enabled: !!scriptContent
 * });
 * ```
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  TaskAutomationAnalyze,
  TaskAutomationAnalyzeStep,
  UseTaskAutomationAnalyzeOptions,
} from '../lib/types';

import { taskAutomationApi } from '../lib/task-automation-api';

export function useTaskAutomationAnalyze({
  scriptContent,
  enabled = true,
}: UseTaskAutomationAnalyzeOptions) {
  const [steps, setSteps] = useState<TaskAutomationAnalyzeStep[]>([]);
  const [title, setTitle] = useState<string>('');
  const [integrationsUsed, setIntegrationsUsed] = useState<
    TaskAutomationAnalyze['integrationsUsed']
  >([]);
  const [description, setDescription] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Analyze the script content using AI
   */
  const analyze = useCallback(async (content: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Call the AI-powered workflow analysis API
      const result = (await taskAutomationApi.workflow.analyzeWorkflow(
        content,
      )) as TaskAutomationAnalyze;

      // Map the API response to our workflow steps format
      const steps: TaskAutomationAnalyzeStep[] = result.steps.map((step, index) => ({
        id: `step-${index}`,
        title: step.title,
        description: step.description,
        type: step.type as TaskAutomationAnalyzeStep['type'],
        iconType: step.iconType as TaskAutomationAnalyzeStep['iconType'],
      }));

      setSteps(steps);
      setTitle(result.title);
      setIntegrationsUsed(result.integrationsUsed);
      setDescription('Automation workflow');

      return { steps, description: 'Automation workflow' };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to analyze workflow');
      setError(error);

      // Fallback to a generic workflow on error
      const fallbackSteps: TaskAutomationAnalyzeStep[] = [
        {
          id: 'start',
          title: 'Start Automation',
          description: 'Initialize the automation process',
          type: 'trigger',
          iconType: 'start',
        },
        {
          id: 'execute',
          title: 'Execute Script',
          description: 'Run the automation logic',
          type: 'action',
          iconType: 'process',
        },
        {
          id: 'complete',
          title: 'Complete',
          description: 'Automation finished successfully',
          type: 'output',
          iconType: 'complete',
        },
      ];

      setSteps(fallbackSteps);
      setDescription('Automation workflow');

      return { steps: fallbackSteps, description: 'Automation workflow' };
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Auto-analyze when content changes
  useEffect(() => {
    if (enabled && scriptContent) {
      analyze(scriptContent);
    }
  }, [scriptContent, enabled, analyze]);

  return {
    steps,
    integrationsUsed,
    title,
    description,
    isAnalyzing,
    error,
    analyze,
  };
}
