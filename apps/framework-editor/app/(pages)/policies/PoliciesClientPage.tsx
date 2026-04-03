'use client';

import { apiClient } from '@/app/lib/api-client';
import { DataTable } from '@/app/components/DataTable';
import type { FrameworkEditorPolicyTemplate } from '@/db';
import { Button } from '@trycompai/ui';
import { Link } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import {
  AddExistingItemDialog,
  type ExistingItemRaw,
} from '../../components/AddExistingItemDialog';
import { columns } from './components/columns';
import { CreatePolicyDialog } from './components/CreatePolicyDialog';

interface PoliciesClientPageProps {
  initialPolicies: FrameworkEditorPolicyTemplate[];
  emptyMessage?: string;
  frameworkId?: string;
}

export function PoliciesClientPage({ initialPolicies, emptyMessage, frameworkId }: PoliciesClientPageProps) {
  const [isCreatePolicyDialogOpen, setIsCreatePolicyDialogOpen] = useState(false);
  const [isAddExistingOpen, setIsAddExistingOpen] = useState(false);
  const router = useRouter();

  const existingPolicyIds = useMemo(
    () => new Set(initialPolicies.map((p) => p.id)),
    [initialPolicies],
  );

  const fetchAllPolicies = useCallback(
    () => apiClient<ExistingItemRaw[]>('/policy-template'),
    [],
  );

  const handleRowClick = (policy: FrameworkEditorPolicyTemplate) => {
    router.push(`/policies/${policy.id}`);
  };

  return (
    <>
      <DataTable
        data={initialPolicies}
        columns={columns}
        createButtonLabel="Create Policy"
        onCreateClick={() => setIsCreatePolicyDialogOpen(true)}
        onRowClick={handleRowClick}
        emptyMessage={emptyMessage}
        additionalActions={
          frameworkId ? (
            <Button
              variant="outline"
              onClick={() => setIsAddExistingOpen(true)}
              size="default"
            >
              <Link className="mr-2 h-4 w-4" />
              Add Existing Policy
            </Button>
          ) : undefined
        }
      />
      <CreatePolicyDialog
        isOpen={isCreatePolicyDialogOpen}
        onOpenChange={setIsCreatePolicyDialogOpen}
        frameworkId={frameworkId}
      />
      {frameworkId && (
        <AddExistingItemDialog
          isOpen={isAddExistingOpen}
          onOpenChange={setIsAddExistingOpen}
          frameworkId={frameworkId}
          itemType="policy"
          existingItemIds={existingPolicyIds}
          fetchAllItems={fetchAllPolicies}
        />
      )}
    </>
  );
}
