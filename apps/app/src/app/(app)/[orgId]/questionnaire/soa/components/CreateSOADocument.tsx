'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@comp/ui/button';
import { Card } from '@comp/ui';
import { Plus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { createSOADocument } from '../../hooks/useSOADocument';

interface CreateSOADocumentProps {
  frameworkId: string;
  frameworkName: string;
  organizationId: string;
}

export function CreateSOADocument({
  frameworkId,
  frameworkName,
  organizationId,
}: CreateSOADocumentProps) {
  const { hasPermission } = usePermissions();
  const canCreateQuestionnaire = hasPermission('questionnaire', 'create');
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);

    try {
      const result = await createSOADocument({ frameworkId, organizationId });
      toast.success('SOA document created successfully');
      router.push(`/${organizationId}/questionnaire/soa/${result.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'An error occurred while creating the SOA document',
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{frameworkName}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create a new SOA document for this framework
          </p>
        </div>
        {canCreateQuestionnaire && (
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="shrink-0"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Document
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}
