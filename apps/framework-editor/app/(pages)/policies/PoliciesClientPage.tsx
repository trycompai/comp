'use client';

import { DataTable } from '@/app/components/DataTable';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { columns } from './components/columns';
import { CreatePolicyDialog } from './components/CreatePolicyDialog';

interface PolicyItem {
  id: string;
  name: string;
  description: string;
  frequency: string;
  department: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface PoliciesClientPageProps {
  initialPolicies: PolicyItem[];
  emptyMessage?: string;
  frameworkId?: string;
}

export function PoliciesClientPage({ initialPolicies, emptyMessage, frameworkId }: PoliciesClientPageProps) {
  const [isCreatePolicyDialogOpen, setIsCreatePolicyDialogOpen] = useState(false);
  const router = useRouter();

  const handleRowClick = (policy: PolicyItem) => {
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
      />
      <CreatePolicyDialog
        isOpen={isCreatePolicyDialogOpen}
        onOpenChange={setIsCreatePolicyDialogOpen}
        frameworkId={frameworkId}
      />
    </>
  );
}
