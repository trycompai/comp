'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FrameworkEditorPolicyTemplate } from '@prisma/client';
import PageLayout from '@/app/components/PageLayout';
import { DataTable } from '@/app/components/DataTable';
import { columns } from './components/columns';
import { CreatePolicyDialog } from './components/CreatePolicyDialog';

interface PoliciesClientPageProps {
  initialPolicies: FrameworkEditorPolicyTemplate[];
}

export function PoliciesClientPage({ initialPolicies }: PoliciesClientPageProps) {
  const [isCreatePolicyDialogOpen, setIsCreatePolicyDialogOpen] = useState(false);
  const router = useRouter();

  const handleRowClick = (policy: FrameworkEditorPolicyTemplate) => {
    router.push(`/policies/${policy.id}`);
  };

  return (
    <PageLayout breadcrumbs={[{ label: 'Policies', href: '/policies' }]}>
      <DataTable
        data={initialPolicies}
        columns={columns}
        searchQueryParamName="policies-search"
        createButtonLabel="Create Policy"
        onCreateClick={() => setIsCreatePolicyDialogOpen(true)}
        onRowClick={handleRowClick}
      />
      <CreatePolicyDialog
        isOpen={isCreatePolicyDialogOpen}
        onOpenChange={setIsCreatePolicyDialogOpen}
      />
    </PageLayout>
  );
}
