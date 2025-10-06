'use client';

import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Button } from '@comp/ui/button';
import { CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { EvidenceAutomation } from '@db';
import { ArrowRight, Code, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTaskAutomations } from '../hooks/use-task-automations';

export const TaskAutomations = ({ automations }: { automations: EvidenceAutomation[] }) => {
  const { orgId, taskId } = useParams<{ orgId: string; taskId: string }>();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const { mutate: mutateAutomations } = useTaskAutomations();

  const handleCreateAutomation = async () => {
    setIsCreating(true);

    try {
      const response = await api.post<{
        success: boolean;
        automation: {
          id: string;
          name: string;
        };
      }>(`/v1/tasks/${taskId}/automations`, {}, orgId);

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data?.success) {
        throw new Error('Failed to create automation');
      }

      toast.success('Automation created successfully!');

      // Refresh automations list
      await mutateAutomations();

      // Keep loading state during redirect
      await router.push(`/${orgId}/tasks/${taskId}/automation/${response.data.automation.id}`);

      // Don't set loading to false here - let the new page handle it
    } catch (error) {
      console.error('Failed to create automation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create automation');
      setIsCreating(false); // Only stop loading on error
    }
  };

  return (
    <>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          Automated Evidence
        </CardTitle>
      </CardHeader>

      <CardContent>
        {automations.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Code className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">No automations yet</h4>
              <p className="text-sm text-muted-foreground">
                Create an AI automation to collect evidence for this task
              </p>
            </div>
            <Button onClick={handleCreateAutomation} disabled={isCreating} className="w-full">
              {isCreating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {isCreating ? 'Creating...' : 'Create Automation'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {automations.map((automation) => (
              <Link
                href={`/${orgId}/tasks/${taskId}/automation/${automation.id}`}
                key={automation.id}
                className={cn(
                  'flex flex-row items-center justify-between p-3 rounded-lg border border-border',
                  'hover:scale-102 transition-all duration-300',
                  'cursor-pointer',
                )}
              >
                <p className="font-medium text-foreground text-xs">{automation.name}</p>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={handleCreateAutomation}
              disabled={isCreating}
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {isCreating ? 'Creating...' : 'Create Another'}
            </Button>
          </div>
        )}
      </CardContent>
    </>
  );
};
