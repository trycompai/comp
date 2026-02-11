'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  HStack,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Spinner,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import {
  Edit,
  OverflowMenuVertical,
  Search,
  TrashCan,
  View,
  ViewOff,
} from '@trycompai/design-system/icons';
import { Copy } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { usePermissions } from '@/hooks/use-permissions';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { Secret } from '../../hooks/useSecrets';
import { useSecrets } from '../../hooks/useSecrets';
import { EditSecretDialog } from '../EditSecretDialog';

interface SecretsTableProps {
  initialSecrets: Secret[];
}

const CATEGORY_MAP: Record<string, string> = {
  api_keys: 'API Keys',
  database: 'Database',
  authentication: 'Authentication',
  integration: 'Integration',
  other: 'Other',
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function SecretsTable({ initialSecrets }: SecretsTableProps) {
  const { secrets, deleteSecret } = useSecrets({ initialData: initialSecrets });
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('organization', 'update');

  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [loadingSecrets, setLoadingSecrets] = useState<Record<string, boolean>>({});
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [secretToDelete, setSecretToDelete] = useState<Secret | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const pageSizeOptions = [10, 25, 50, 100];

  const handleRevealSecret = async (secretId: string) => {
    if (revealedSecrets[secretId]) {
      setRevealedSecrets((prev) => {
        const next = { ...prev };
        delete next[secretId];
        return next;
      });
      return;
    }

    setLoadingSecrets((prev) => ({ ...prev, [secretId]: true }));

    try {
      const response = await apiClient.get<{ secret: { value: string } }>(
        `/v1/secrets/${secretId}`,
      );
      if (response.error || !response.data?.secret?.value) {
        throw new Error(response.error || 'Failed to fetch secret');
      }

      setRevealedSecrets((prev) => ({ ...prev, [secretId]: response.data!.secret.value }));
    } catch (error) {
      toast.error('Failed to reveal secret');
      console.error('Error revealing secret:', error);
    } finally {
      setLoadingSecrets((prev) => ({ ...prev, [secretId]: false }));
    }
  };

  const handleCopySecret = (secretId: string) => {
    const value = revealedSecrets[secretId];
    if (value) {
      navigator.clipboard.writeText(value);
      toast.success('Secret copied to clipboard');
    }
  };

  const handleDeleteClick = (secret: Secret) => {
    setSecretToDelete(secret);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!secretToDelete) return;

    setIsDeleting(true);
    try {
      await deleteSecret(secretToDelete.id);
      toast.success('Secret deleted successfully');
      setDeleteDialogOpen(false);
      setSecretToDelete(null);
    } catch (error) {
      toast.error('Failed to delete secret');
      console.error('Error deleting secret:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSecrets = useMemo(() => {
    if (!searchQuery) return secrets;
    const query = searchQuery.toLowerCase();
    return secrets.filter(
      (secret) =>
        secret.name.toLowerCase().includes(query) ||
        secret.description?.toLowerCase().includes(query),
    );
  }, [secrets, searchQuery]);

  const pageCount = Math.max(1, Math.ceil(filteredSecrets.length / perPage));
  const paginatedSecrets = filteredSecrets.slice((page - 1) * perPage, page * perPage);

  const isEmpty = secrets.length === 0;
  const isSearchEmpty = filteredSecrets.length === 0 && searchQuery;

  return (
    <Stack gap="4">
      {/* Search Bar */}
      <div className="w-full md:max-w-[300px]">
        <InputGroup>
          <InputGroupAddon>
            <Search size={16} />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search secrets..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </InputGroup>
      </div>

      {/* Table */}
      {isEmpty || isSearchEmpty ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {searchQuery ? 'No secrets found' : 'No secrets yet'}
            </EmptyTitle>
            <EmptyDescription>
              {searchQuery
                ? 'Try adjusting your search.'
                : 'Create your first secret to enable AI automations.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table
          variant="bordered"
          pagination={{
            page,
            pageCount,
            onPageChange: setPage,
            pageSize: perPage,
            pageSizeOptions,
            onPageSizeChange: (size) => {
              setPerPage(size);
              setPage(1);
            },
          }}
        >
          <TableHeader>
            <TableRow>
              <TableHead>NAME</TableHead>
              <TableHead>VALUE</TableHead>
              <TableHead>CATEGORY</TableHead>
              <TableHead>LAST USED</TableHead>
              <TableHead>CREATED</TableHead>
              {canUpdate && <TableHead>ACTIONS</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSecrets.map((secret) => (
              <TableRow key={secret.id}>
                <TableCell>
                  <span className="font-mono text-sm font-medium">{secret.name}</span>
                </TableCell>
                <TableCell>
                  <HStack gap="2" align="center">
                    {loadingSecrets[secret.id] ? (
                      <HStack gap="2" align="center">
                        <Spinner />
                        <Text variant="muted" size="sm">
                          Loading...
                        </Text>
                      </HStack>
                    ) : revealedSecrets[secret.id] ? (
                      <button
                        type="button"
                        onClick={() => handleCopySecret(secret.id)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 font-mono text-sm transition-colors hover:bg-muted/80"
                      >
                        <span className="max-w-[200px] truncate">
                          {revealedSecrets[secret.id]}
                        </span>
                        <Copy className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </button>
                    ) : (
                      <span className="font-mono text-sm text-muted-foreground">
                        ••••••••••••
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRevealSecret(secret.id)}
                      disabled={loadingSecrets[secret.id]}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                    >
                      {revealedSecrets[secret.id] ? (
                        <ViewOff size={16} />
                      ) : (
                        <View size={16} />
                      )}
                    </button>
                  </HStack>
                </TableCell>
                <TableCell>
                  {secret.category ? (
                    <Badge variant="secondary">
                      {CATEGORY_MAP[secret.category] || secret.category.replace('_', ' ')}
                    </Badge>
                  ) : (
                    <Text variant="muted" size="sm">
                      —
                    </Text>
                  )}
                </TableCell>
                <TableCell>
                  <Text variant="muted" size="sm">
                    {secret.lastUsedAt ? formatDate(secret.lastUsedAt) : 'Never'}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text variant="muted" size="sm">
                    {formatDate(secret.createdAt)}
                  </Text>
                </TableCell>
                {canUpdate && (
                  <TableCell>
                    <div className="flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          variant="ellipsis"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <OverflowMenuVertical />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSecret(secret);
                            }}
                          >
                            <Edit size={16} />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(secret);
                            }}
                          >
                            <TrashCan size={16} />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Secret</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{secretToDelete?.name}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Secret Dialog */}
      {editingSecret && (
        <EditSecretDialog
          secret={editingSecret}
          open={!!editingSecret}
          onOpenChange={(open) => !open && setEditingSecret(null)}
        />
      )}
    </Stack>
  );
}
