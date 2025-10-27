'use client';

import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@comp/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comp/ui/tooltip';
import { format } from 'date-fns';
import { Copy, Edit, Eye, EyeOff, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AddSecretDialog } from '../AddSecretDialog';
import { EditSecretDialog } from '../EditSecretDialog';

interface Secret {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
}

interface SecretsTableProps {
  secrets: Secret[];
}

export function SecretsTable({ secrets }: SecretsTableProps) {
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [loadingSecrets, setLoadingSecrets] = useState<Record<string, boolean>>({});
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);

  const handleRevealSecret = async (secretId: string) => {
    if (revealedSecrets[secretId]) {
      // Hide the secret
      setRevealedSecrets((prev) => {
        const next = { ...prev };
        delete next[secretId];
        return next;
      });
      return;
    }

    // Reveal the secret
    setLoadingSecrets((prev) => ({ ...prev, [secretId]: true }));

    try {
      // Get organizationId from the URL path
      const pathSegments = window.location.pathname.split('/');
      const orgId = pathSegments[1]; // Assuming path is /{orgId}/settings/secrets

      const response = await fetch(`/api/secrets/${secretId}?organizationId=${orgId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch secret');
      }

      const data = await response.json();
      setRevealedSecrets((prev) => ({ ...prev, [secretId]: data.secret.value }));
    } catch (error) {
      toast.error('Failed to reveal secret');
      console.error('Error revealing secret:', error);
    } finally {
      setLoadingSecrets((prev) => ({ ...prev, [secretId]: false }));
    }
  };

  const handleDeleteSecret = async (secretId: string) => {
    if (!confirm('Are you sure you want to delete this secret? This action cannot be undone.')) {
      return;
    }

    try {
      // Get organizationId from the URL path
      const pathSegments = window.location.pathname.split('/');
      const orgId = pathSegments[1]; // Assuming path is /{orgId}/settings/secrets

      const response = await fetch(`/api/secrets/${secretId}?organizationId=${orgId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete secret');
      }

      toast.success('Secret deleted successfully');
      // Reload the page to refresh the list
      window.location.reload();
    } catch (error) {
      toast.error('Failed to delete secret');
      console.error('Error deleting secret:', error);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Organization Secrets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Secure storage for API keys and credentials used by AI automations
          </p>
        </div>
        <AddSecretDialog />
      </div>

      {/* Table */}
      <div className="rounded-md border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/50">
              <TableHead className="font-medium text-xs uppercase tracking-wider text-muted-foreground pl-6">
                Name
              </TableHead>
              <TableHead className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
                Value
              </TableHead>
              <TableHead className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
                Category
              </TableHead>
              <TableHead className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
                Description
              </TableHead>
              <TableHead className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
                Last Used
              </TableHead>
              <TableHead className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
                Created
              </TableHead>
              <TableHead className="text-right font-medium text-xs uppercase tracking-wider text-muted-foreground pr-6">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {secrets.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">No secrets yet</p>
                      <p className="text-xs text-muted-foreground">
                        Create your first secret to enable AI automations
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              secrets.map((secret) => (
                <TableRow key={secret.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-sm font-medium pl-6">
                    {secret.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {loadingSecrets[secret.id] ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading...</span>
                        </div>
                      ) : revealedSecrets[secret.id] ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(revealedSecrets[secret.id]);
                                  toast.success('Secret copied to clipboard');
                                }}
                                className="inline-flex items-center gap-1.5 text-sm bg-primary/10 px-3 py-1.5 rounded-md font-mono hover:bg-primary/20 transition-all max-w-[240px] group border border-primary/20"
                              >
                                <span className="truncate text-primary">
                                  {revealedSecrets[secret.id]}
                                </span>
                                <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0 text-primary" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Click to copy</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="font-mono text-sm text-muted-foreground/70">
                          ••••••••••••
                        </span>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-primary/10"
                              onClick={() => handleRevealSecret(secret.id)}
                              disabled={loadingSecrets[secret.id]}
                            >
                              {revealedSecrets[secret.id] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{revealedSecrets[secret.id] ? 'Hide' : 'Reveal'} secret</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell>
                    {secret.category ? (
                      <Badge
                        variant="outline"
                        className="text-xs font-normal border-border/50 bg-muted/30"
                      >
                        {secret.category.replace('_', ' ')}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {secret.description ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm max-w-xs truncate block text-muted-foreground cursor-help">
                              {secret.description}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md">
                            <p className="text-sm whitespace-pre-wrap">{secret.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {secret.lastUsedAt
                        ? format(new Date(secret.lastUsedAt), 'MMM d, yyyy')
                        : 'Never'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(secret.createdAt), 'MMM d, yyyy')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-all"
                              onClick={() => setEditingSecret(secret)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit secret</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all"
                              onClick={() => handleDeleteSecret(secret.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete secret</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Secret Dialog */}
      {editingSecret && (
        <EditSecretDialog
          secret={editingSecret}
          open={!!editingSecret}
          onOpenChange={(open) => !open && setEditingSecret(null)}
          onSecretUpdated={() => window.location.reload()}
        />
      )}
    </div>
  );
}
