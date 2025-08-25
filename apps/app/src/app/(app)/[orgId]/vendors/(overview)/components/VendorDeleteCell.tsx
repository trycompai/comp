import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@comp/ui/alert-dialog';
import { Button } from '@comp/ui/button';
import { Trash2 } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { deleteVendor } from '../actions/deleteVendor';
import type { GetVendorsResult } from '../data/queries';

type VendorRow = GetVendorsResult['data'][number];

interface VendorDeleteCellProps {
  vendor: VendorRow;
}

export const VendorDeleteCell: React.FC<VendorDeleteCellProps> = ({ vendor }) => {
  const [isRemoveAlertOpen, setIsRemoveAlertOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDeleteClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsDeleting(true);

    const response = await deleteVendor({ vendorId: vendor.id });

    if (response?.data?.success) {
      toast.success(`Vendor "${vendor.name}" has been deleted.`);
      setIsRemoveAlertOpen(false);
    } else {
      toast.error(String(response?.data?.error) || 'Failed to delete vendor.');
    }

    setIsDeleting(false);
  };

  return (
    <>
      <div className="flex items-center justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setIsRemoveAlertOpen(true);
          }}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete {vendor.name}</span>
        </Button>
      </div>
      <AlertDialog open={isRemoveAlertOpen} onOpenChange={setIsRemoveAlertOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{vendor.name}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClick} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
