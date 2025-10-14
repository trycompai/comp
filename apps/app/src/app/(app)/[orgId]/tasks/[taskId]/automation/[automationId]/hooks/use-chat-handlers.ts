import { api } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';

interface UseChatHandlersProps {
  sendMessage: (message: { text: string }, options?: any) => void;
  setInput: (value: string) => void;
  orgId: string;
  taskId: string;
  automationId: string;
  isEphemeral: boolean;
  updateAutomationId: (newId: string) => void;
}

export function useChatHandlers({
  sendMessage,
  setInput,
  orgId,
  taskId,
  automationId,
  isEphemeral,
  updateAutomationId,
}: UseChatHandlersProps) {
  const router = useRouter();

  const validateAndSubmitMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      let realAutomationId = automationId;

      // If ephemeral, create the automation first (but don't redirect)
      if (isEphemeral) {
        try {
          const response = await api.post<{
            success: boolean;
            automation: {
              id: string;
              name: string;
            };
          }>(`/v1/tasks/${taskId}/automations`, {}, orgId);

          if (response.error || !response.data?.success) {
            throw new Error(response.error || 'Failed to create automation');
          }

          realAutomationId = response.data.automation.id;

          // Update the automation ID in ChatProvider immediately
          updateAutomationId(realAutomationId);

          // Invalidate automations list cache so task page updates
          mutate([`task-automations-${taskId}`, orgId, taskId]);

          // Invalidate the automation cache so breadcrumb updates
          mutate([`automation-${realAutomationId}`, orgId, taskId, realAutomationId]);

          // Silently replace the URL without navigation/reload
          window.history.replaceState(
            null,
            '',
            `/${orgId}/tasks/${taskId}/automation/${realAutomationId}`,
          );
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to create automation');
          return;
        }
      }

      // Send the message with the real (or existing) automation ID
      sendMessage(
        { text },
        {
          body: {
            modelId: 'openai/gpt-5-mini',
            reasoningEffort: 'medium',
            orgId,
            taskId,
            automationId: realAutomationId,
          },
        },
      );

      setInput('');
    },
    [sendMessage, setInput, orgId, taskId, automationId, isEphemeral, updateAutomationId],
  );

  const handleSecretAdded = useCallback(
    (secretName: string) => {
      sendMessage(
        {
          text: `I've added the secret "${secretName}". You can now use it in the automation script.`,
        },
        {
          body: {
            modelId: 'openai/gpt-5-mini',
            reasoningEffort: 'medium',
            orgId,
            taskId,
            automationId,
          },
        },
      );
    },
    [sendMessage, orgId, taskId, automationId],
  );

  const handleInfoProvided = useCallback(
    (info: Record<string, string>) => {
      const infoText = Object.entries(info)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      sendMessage(
        {
          text: `I've provided the following information:\n\n${infoText}\n\nYou can now continue with creating the automation script.`,
        },
        {
          body: {
            modelId: 'openai/gpt-5-mini',
            reasoningEffort: 'medium',
            orgId,
            taskId,
            automationId,
          },
        },
      );
    },
    [sendMessage, orgId, taskId, automationId],
  );

  return {
    validateAndSubmitMessage,
    handleSecretAdded,
    handleInfoProvided,
  };
}
