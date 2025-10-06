'use client';

import { api } from '@/lib/api-client';
import { Button } from '@comp/ui/button';
import { CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { EvidenceAutomation } from '@db';
import { ArrowRight, Loader2, Plus, Zap } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export const TaskAutomations = ({ automations }: { automations: EvidenceAutomation[] }) => {
  const { orgId, taskId } = useParams<{ orgId: string; taskId: string }>();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateAutomation = async () => {
    setIsCreating(true);

    try {
      const response = await api.post<{
        success: boolean;
        automation: {
          id: string;
          name: string;
        };
      }>('/v1/automations', { taskId }, orgId);

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data?.success) {
        throw new Error('Failed to create automation');
      }

      toast.success('Automation created successfully!');

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
              <Zap className="w-6 h-6 text-primary" />
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
          <div className="space-y-3">
            {automations.map((automation) => (
              <div
                key={automation.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <h4 className="font-medium text-foreground text-sm">{automation.name}</h4>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/${orgId}/tasks/${taskId}/automation/${automation.id}`}>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
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
