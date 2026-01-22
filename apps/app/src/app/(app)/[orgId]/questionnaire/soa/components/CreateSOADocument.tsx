'use client';

import { Button } from '@comp/ui/button';
import { Card } from '@comp/ui';
import { Plus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';

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
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);

    try {
      const response = await api.post<{ success: boolean; data?: { id: string } }>(
        '/v1/soa/create-document',
        {
          frameworkId,
          organizationId,
        },
        organizationId,
      );

      if (response.error) {
        toast.error(response.error || 'Failed to create SOA document');
      } else if (response.data?.success && response.data?.data) {
        toast.success('SOA document created successfully');
        router.push(`/${organizationId}/questionnaire/soa/${response.data.data.id}`);
        router.refresh();
      } else {
        toast.error('Failed to create SOA document');
      }
    } catch (error) {
      toast.error('An error occurred while creating the SOA document');
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
      </div>
    </Card>
  );
}

