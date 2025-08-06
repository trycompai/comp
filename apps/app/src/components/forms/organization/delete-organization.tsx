'use client';

import { deleteOrganizationAction } from '@/actions/organization/delete-organization-action';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@comp/ui/alert-dialog';
import { Button } from '@comp/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@comp/ui/card';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import { T, useGT } from 'gt-next';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { redirect } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export function DeleteOrganization({ organizationId }: { organizationId: string }) {
  const [value, setValue] = useState('');
  const t = useGT();
  const deleteOrganization = useAction(deleteOrganizationAction, {
    onSuccess: () => {
      toast.success(t('Organization deleted'));
      redirect('/');
    },
    onError: () => {
      toast.error(t('Error deleting organization'));
    },
  });

  return (
    <Card className="border-destructive border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <T>
            <CardTitle>Delete organization</CardTitle>
          </T>
        </div>
        <T>
          <CardDescription>
            <div className="max-w-[600px]">
              Permanently remove your organization and all of its contents from the Comp AI platform. This action is not reversible - please continue with caution.
            </div>
          </CardDescription>
        </T>
      </CardHeader>
      <CardContent />
      <CardFooter className="flex justify-between">
        <div />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <T>
              <Button variant="destructive" size="sm" className="hover:bg-destructive/90">
                Delete
              </Button>
            </T>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <T>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              </T>
              <T>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your organization and remove your data from our servers.
                </AlertDialogDescription>
              </T>
            </AlertDialogHeader>

            <div className="mt-2 flex flex-col gap-2">
              <T>
                <Label htmlFor="confirm-delete">Type 'delete' to confirm</Label>
              </T>
              <Input id="confirm-delete" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>

            <AlertDialogFooter className="mt-4">
              <T>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
              </T>
              <AlertDialogAction
                onClick={() =>
                  deleteOrganization.execute({
                    id: organizationId,
                    organizationId,
                  })
                }
                disabled={value !== 'delete'}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteOrganization.status === 'executing' ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : null}
                <T>Delete</T>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
