'use client';

import { deleteContextEntryAction } from '@/actions/context-hub/delete-context-entry-action';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@comp/ui/dialog';
import type { Context } from '@db';
import { T, useGT } from 'gt-next';
import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ContextForm } from './context-form';

export function ContextList({ entries, locale }: { entries: Context[]; locale: string }) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState<Record<string, boolean>>({});
  const t = useGT();

  const handleEditOpen = (id: string, open: boolean) => {
    setEditDialogOpen((prev) => ({ ...prev, [id]: open }));
  };

  return (
    <div className="relative">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <T>
                <CardTitle>Context Entries</CardTitle>
              </T>
              <T>
                <CardDescription>
                  Add, edit, or remove context entries for your organization.
                </CardDescription>
              </T>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <T>
                  <Button
                    onClick={() => setAddDialogOpen(true)}
                    className="flex items-center gap-1 self-start"
                  >
                    <Plus className="h-4 w-4" />
                    Add Entry
                  </Button>
                </T>
              </DialogTrigger>
              <DialogContent className="w-full max-w-lg">
                <DialogHeader>
                  <T>
                    <DialogTitle>Add New Entry</DialogTitle>
                  </T>
                  <T>
                    <DialogDescription>Create a new context entry</DialogDescription>
                  </T>
                </DialogHeader>
                <ContextForm onSuccess={() => setAddDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <T>
                <p className="text-muted-foreground mb-6">No context entries yet</p>
              </T>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {entries.map((entry) => (
                <Card key={entry.id} className="flex h-full flex-col">
                  <CardHeader className="flex-none pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-2 text-base">{entry.question}</CardTitle>
                      <Dialog
                        open={!!editDialogOpen[entry.id]}
                        onOpenChange={(open) => handleEditOpen(entry.id, open)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-sm"
                            aria-label={t('Edit')}
                            onClick={() => handleEditOpen(entry.id, true)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-full max-w-lg">
                          <DialogHeader>
                            <T>
                              <DialogTitle>Edit Entry</DialogTitle>
                            </T>
                            <T>
                              <DialogDescription>Update your context entry</DialogDescription>
                            </T>
                          </DialogHeader>
                          <ContextForm
                            entry={entry}
                            onSuccess={() => handleEditOpen(entry.id, false)}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mt-1 line-clamp-2 text-sm">
                      {entry.answer}
                    </CardDescription>
                  </CardContent>
                  <CardFooter>
                    <div className="flex w-full justify-end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <T>
                            <Button variant="destructive" className="rounded-sm">
                              Delete
                            </Button>
                          </T>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <T>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            </T>
                            <T>
                              <AlertDialogDescription>
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </T>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <T>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                            </T>
                            <AlertDialogAction
                              onClick={async () => {
                                try {
                                  const result = await deleteContextEntryAction({
                                    id: entry.id,
                                  });
                                  if (result?.data?.success) {
                                    toast.success(t('Context entry deleted'));
                                  }
                                } catch (error) {
                                  toast.error(t('Something went wrong'));
                                }
                              }}
                            >
                              <T>Delete</T>
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
