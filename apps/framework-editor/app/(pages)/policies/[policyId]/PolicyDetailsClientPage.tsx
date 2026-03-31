'use client';

import type { FrameworkEditorPolicyTemplate } from '@/db';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@trycompai/ui';
import { PencilIcon, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DeletePolicyDialog } from './components/DeletePolicyDialog';
import { EditPolicyDialog } from './components/EditPolicyDialog';

interface PolicyDetailsClientPageProps {
  policy: FrameworkEditorPolicyTemplate;
}

export function PolicyDetailsClientPage({ policy }: PolicyDetailsClientPageProps) {
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handlePolicyUpdated = () => {
    setIsEditDialogOpen(false);
    router.refresh();
  };

  const handlePolicyDeleted = () => {
    setIsDeleteDialogOpen(false);
    router.push('/frameworks');
  };

  return (
    <>
      <Card className="w-full rounded-sm shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                {policy.name}
              </CardTitle>
              {policy.description && (
                <CardDescription className="mt-2 text-base">{policy.description}</CardDescription>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                className="gap-1 rounded-sm"
              >
                <PencilIcon className="h-4 w-4" />
                Edit Details
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="gap-1 rounded-sm"
              >
                <Trash2 className="h-4 w-4" />
                Delete Policy
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>
              <strong>Frequency:</strong> {policy.frequency || 'N/A'}
            </p>
            <p>
              <strong>Department:</strong> {policy.department || 'N/A'}
            </p>
            {/* <p><strong>ID:</strong> {policy.id}</p> */}
          </div>
        </CardContent>
      </Card>

      {/* Render Edit Dialog */}
      {isEditDialogOpen && (
        <EditPolicyDialog
          policy={policy}
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onPolicyUpdated={handlePolicyUpdated}
        />
      )}

      {/* Render Delete Dialog */}
      {isDeleteDialogOpen && (
        <DeletePolicyDialog
          policyId={policy.id}
          policyName={policy.name}
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onPolicyDeleted={handlePolicyDeleted}
        />
      )}
    </>
  );
}
