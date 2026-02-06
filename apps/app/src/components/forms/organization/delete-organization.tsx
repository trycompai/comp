'use client';

import { useApi } from '@/hooks/use-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
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
  Button,
} from '@trycompai/design-system';
import { Loader2 } from 'lucide-react';
import { redirect } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export function DeleteOrganization({
  organizationId,
  isOwner,
}: {
  organizationId: string;
  isOwner: boolean;
}) {
  const api = useApi();
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    setIsSubmitting(true);
    const response = await api.delete('/v1/organization');
    setIsSubmitting(false);

    if (response.error) {
      toast.error('Error deleting organization');
      return;
    }

    toast.success('Organization deleted');
    redirect('/');
  };

  // Only show delete organization section to the owner
  if (!isOwner) {
    return null;
  }

  return (
    <Card className="border-destructive border border-2">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{'Delete organization'}</CardTitle>
            <CardDescription>
              <div className="max-w-[600px]">
                {
                  'Permanently remove your organization and all of its contents from the Comp AI platform. This action is not reversible - please continue with caution.'
                }
              </div>
            </CardDescription>
          </div>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive">{'Delete'}</Button>} />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{'Are you absolutely sure?'}</AlertDialogTitle>
                <AlertDialogDescription>
                  {
                    'This action cannot be undone. This will permanently delete your organization and remove your data from our servers.'
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="mt-2 flex flex-col gap-2">
                <Label htmlFor="confirm-delete">{"Type 'delete' to confirm"}</Label>
                <Input
                  id="confirm-delete"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel>{'Cancel'}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={value !== 'delete' || isSubmitting}
                  variant="destructive"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : null}
                  {'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
