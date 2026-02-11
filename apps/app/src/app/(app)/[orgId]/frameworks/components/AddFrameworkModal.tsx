'use client';

import { FrameworkCard } from '@/components/framework-card';
import { Button } from '@comp/ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import type { FrameworkEditorFramework } from '@db';
import { usePermissions } from '@/hooks/use-permissions';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useFrameworks } from '../hooks/useFrameworks';

type Props = {
  onOpenChange: (isOpen: boolean) => void;
  availableFrameworks: Pick<
    FrameworkEditorFramework,
    'id' | 'name' | 'description' | 'version' | 'visible'
  >[];
  organizationId?: string;
};

export function AddFrameworkModal({
  onOpenChange,
  availableFrameworks,
}: Props) {
  const { addFrameworks } = useFrameworks();
  const { hasPermission } = usePermissions();
  const canCreateFramework = hasPermission('framework', 'create');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);

    try {
      const result = await addFrameworks(selectedIds);
      const count = result?.frameworksAdded ?? 0;
      toast.success(
        `Successfully added ${count} framework${count > 1 ? 's' : ''}`,
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to add frameworks',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (isSubmitting && !open) return;
    onOpenChange(open);
  };

  const toggleFramework = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((fid) => fid !== id),
    );
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader className="space-y-2">
        <DialogTitle className="text-base font-medium">
          Add Frameworks
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-sm">
          {availableFrameworks.length > 0
            ? 'Select the compliance frameworks to add to your organization.'
            : 'No new frameworks are available to add at this time.'}
        </DialogDescription>
      </DialogHeader>

      {!isSubmitting && availableFrameworks.length > 0 && (
        <div className="space-y-4">
          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {availableFrameworks
              .filter((framework) => framework.visible)
              .map((framework) => (
                <FrameworkCard
                  key={framework.id}
                  framework={framework}
                  isSelected={selectedIds.includes(framework.id)}
                  onSelectionChange={(checked) =>
                    toggleFramework(framework.id, checked)
                  }
                />
              ))}
          </div>

          <DialogFooter className="gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting || selectedIds.length === 0 || !canCreateFramework}
              onClick={handleSubmit}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              )}
              Add Selected
            </Button>
          </DialogFooter>
        </div>
      )}

      {!isSubmitting && availableFrameworks.length === 0 && (
        <div className="py-6 text-center">
          <div className="text-muted-foreground text-sm">
            All available frameworks are already enabled in your organization.
          </div>
          <DialogFooter className="mt-6 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </div>
      )}

      {isSubmitting && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          <span className="text-muted-foreground ml-3 text-sm">
            Adding frameworks...
          </span>
        </div>
      )}
    </DialogContent>
  );
}
