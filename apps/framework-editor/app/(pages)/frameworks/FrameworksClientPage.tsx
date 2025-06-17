'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
// import { db } from "@comp/db";
import { DataTable } from '@/app/components/DataTable';
import PageLayout from '@/app/components/PageLayout';
import type { FrameworkEditorFramework } from '@prisma/client';
import { columns } from './components/columns';
import { CreateFrameworkDialog } from './components/CreateFrameworkDialog';

export interface FrameworkWithCounts extends Omit<FrameworkEditorFramework, 'requirements'> {
  requirementsCount: number;
  controlsCount: number;
}

interface FrameworksClientPageProps {
  initialFrameworks: FrameworkWithCounts[];
}

export function FrameworksClientPage({ initialFrameworks }: FrameworksClientPageProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const router = useRouter();

  const handleRowClick = (framework: FrameworkWithCounts) => {
    router.push(`/frameworks/${framework.id}`);
  };

  return (
    <PageLayout breadcrumbs={[{ label: 'Frameworks', href: '/frameworks' }]}>
      <DataTable
        data={initialFrameworks}
        columns={columns}
        searchQueryParamName="frameworks-search"
        searchPlaceholder="Search frameworks..."
        onCreateClick={() => setIsCreateDialogOpen(true)}
        createButtonLabel="Create New Framework"
        onRowClick={handleRowClick}
      />
      <CreateFrameworkDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onFrameworkCreated={() => setIsCreateDialogOpen(false)}
      />
    </PageLayout>
  );
}
