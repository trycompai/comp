'use client';

import { DataTable } from '@/app/components/DataTable';
import PageLayout from '@/app/components/PageLayout';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import type { FrameworkEditorFramework, FrameworkEditorRequirement } from '@prisma/client';
import { FileText, PencilIcon, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AddRequirementDialog } from './components/AddRequirementDialog';
import { getColumns } from './components/columns';
import { DeleteFrameworkDialog } from './components/DeleteFrameworkDialog';
import { DeleteRequirementDialog } from './components/DeleteRequirementDialog';
import { EditFrameworkDialog } from './components/EditFrameworkDialog';
import { EditRequirementDialog } from './components/EditRequirementDialog';

interface FrameworkDetails
  extends Pick<FrameworkEditorFramework, 'id' | 'name' | 'version' | 'description' | 'visible'> {}

interface FrameworkRequirementsClientPageProps {
  frameworkDetails: FrameworkDetails;
  initialRequirements: FrameworkEditorRequirement[];
}

interface SelectedRequirementToEdit extends FrameworkEditorRequirement {
  frameworkId: string;
}

export function FrameworkRequirementsClientPage({
  frameworkDetails,
  initialRequirements,
}: FrameworkRequirementsClientPageProps) {
  const router = useRouter();
  const [isFrameworkEditDialogOpen, setIsFrameworkEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddRequirementDialogOpen, setIsAddRequirementDialogOpen] = useState(false);
  const [isDeleteRequirementDialogOpen, setIsDeleteRequirementDialogOpen] = useState(false);
  const [requirementToDelete, setRequirementToDelete] = useState<FrameworkEditorRequirement | null>(
    null,
  );

  const [requirementsList, setRequirementsList] =
    useState<FrameworkEditorRequirement[]>(initialRequirements);

  const [isEditRequirementDialogOpen, setIsEditRequirementDialogOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<SelectedRequirementToEdit | null>(
    null,
  );

  useEffect(() => {
    setRequirementsList(initialRequirements);
  }, [initialRequirements]);

  const handleFrameworkUpdated = () => {
    setIsFrameworkEditDialogOpen(false);
    router.refresh();
  };

  const handleOpenEditRequirementDialog = (requirement: FrameworkEditorRequirement) => {
    setSelectedRequirement({
      ...requirement,
      frameworkId: frameworkDetails.id,
    });
    setIsEditRequirementDialogOpen(true);
  };

  const handleRequirementUpdated = (
    updatedRequirement: Pick<
      FrameworkEditorRequirement,
      'id' | 'name' | 'description' | 'identifier'
    >,
  ) => {
    setRequirementsList((prevList) =>
      prevList.map((req) =>
        req.id === updatedRequirement.id ? { ...req, ...updatedRequirement } : req,
      ),
    );
    setIsEditRequirementDialogOpen(false);
    router.refresh();
  };

  const handleRequirementAdded = () => {
    setIsAddRequirementDialogOpen(false);
    router.refresh();
  };

  const handleOpenDeleteRequirementDialog = (requirement: FrameworkEditorRequirement) => {
    setRequirementToDelete(requirement);
    setIsDeleteRequirementDialogOpen(true);
  };

  const handleRequirementDeleted = () => {
    setRequirementToDelete(null);
    setIsDeleteRequirementDialogOpen(false);
    router.refresh();
  };

  const columns = getColumns(handleOpenEditRequirementDialog, handleOpenDeleteRequirementDialog);

  return (
    <PageLayout
      breadcrumbs={[
        { label: 'Frameworks', href: '/frameworks' },
        {
          label: frameworkDetails.name,
          href: `/frameworks/${frameworkDetails.id}`,
        },
      ]}
    >
      <Card className="w-full shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                {frameworkDetails.name}
                <Badge variant="outline" className="ml-2 text-sm font-normal">
                  Version: {frameworkDetails.version}
                </Badge>
                <Badge
                  variant={frameworkDetails.visible ? 'default' : 'secondary'}
                  className="ml-2 text-sm font-normal"
                >
                  {frameworkDetails.visible ? 'Visible' : 'Hidden'}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-2 text-base">
                {frameworkDetails.description}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFrameworkEditDialogOpen(true)}
                className="gap-1"
              >
                <PencilIcon className="h-4 w-4" />
                Edit Details
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Delete Framework
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            <span className="font-medium">ID:</span> {frameworkDetails.id}
          </div>
        </CardContent>
      </Card>

      <DataTable
        data={requirementsList}
        columns={columns}
        searchQueryParamName={`${frameworkDetails.id}-requirements-search`}
        searchPlaceholder="Search requirements..."
        createButtonLabel="Add New Requirement"
        onCreateClick={() => setIsAddRequirementDialogOpen(true)}
      />
      {isFrameworkEditDialogOpen && (
        <EditFrameworkDialog
          isOpen={isFrameworkEditDialogOpen}
          onOpenChange={setIsFrameworkEditDialogOpen}
          framework={frameworkDetails}
          onFrameworkUpdated={handleFrameworkUpdated}
        />
      )}
      {isDeleteDialogOpen && (
        <DeleteFrameworkDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          frameworkId={frameworkDetails.id}
          frameworkName={frameworkDetails.name}
        />
      )}
      {isAddRequirementDialogOpen && (
        <AddRequirementDialog
          isOpen={isAddRequirementDialogOpen}
          onOpenChange={setIsAddRequirementDialogOpen}
          frameworkId={frameworkDetails.id}
          onRequirementAdded={handleRequirementAdded}
        />
      )}
      {isEditRequirementDialogOpen && selectedRequirement && (
        <EditRequirementDialog
          isOpen={isEditRequirementDialogOpen}
          onOpenChange={setIsEditRequirementDialogOpen}
          requirement={selectedRequirement}
          onRequirementUpdated={handleRequirementUpdated}
        />
      )}
      {isDeleteRequirementDialogOpen && requirementToDelete && (
        <DeleteRequirementDialog
          isOpen={isDeleteRequirementDialogOpen}
          onOpenChange={setIsDeleteRequirementDialogOpen}
          requirementId={requirementToDelete.id}
          requirementName={requirementToDelete.name}
          frameworkId={frameworkDetails.id}
          onRequirementDeleted={handleRequirementDeleted}
        />
      )}
    </PageLayout>
  );
}
