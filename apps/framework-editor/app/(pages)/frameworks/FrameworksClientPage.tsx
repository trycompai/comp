'use client';

import { DataTable } from '@/app/components/DataTable';
import PageLayout from '@/app/components/PageLayout';
import type { FrameworkEditorFramework } from '@/db';
import { Button } from '@trycompai/ui/button';
import { Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { columns } from './components/columns';
import { CreateFrameworkDialog } from './components/CreateFrameworkDialog';
import { ImportFrameworkDialog } from './components/ImportFrameworkDialog';

export interface FrameworkWithCounts extends Omit<FrameworkEditorFramework, 'requirements'> {
  requirementsCount: number;
  controlsCount: number;
}

interface FrameworksClientPageProps {
  initialFrameworks: FrameworkWithCounts[];
}

export function FrameworksClientPage({ initialFrameworks }: FrameworksClientPageProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const router = useRouter();

  const handleRowClick = (framework: FrameworkWithCounts) => {
    router.push(`/frameworks/${framework.id}`);
  };

  return (
    <PageLayout breadcrumbs={[{ label: 'Frameworks', href: '/frameworks' }]}>
      <DataTable
        data={initialFrameworks}
        columns={columns}
        searchPlaceholder="Search frameworks..."
        onCreateClick={() => setIsCreateDialogOpen(true)}
        createButtonLabel="Create New Framework"
        onRowClick={handleRowClick}
        additionalActions={
          <Button
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Framework
          </Button>
        }
      />
      <CreateFrameworkDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onFrameworkCreated={() => setIsCreateDialogOpen(false)}
      />
      <ImportFrameworkDialog
        isOpen={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />
    </PageLayout>
  );
}
