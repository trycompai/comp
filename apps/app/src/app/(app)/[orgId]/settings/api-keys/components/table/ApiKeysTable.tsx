'use client';

import { useApiKeys } from '@/hooks/use-api-keys';
import type { ApiKey } from '@/hooks/use-api-keys';
import { usePermissions } from '@/hooks/use-permissions';
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
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HStack,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Add, OverflowMenuVertical, Search, TrashCan } from '@trycompai/design-system/icons';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CreateApiKeySheet } from './CreateApiKeySheet';

function LegacyKeysBanner() {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
      <Text size="sm">
        You have legacy API keys with unrestricted access. We recommend creating
        new scoped keys and revoking legacy ones for better security.
      </Text>
    </div>
  );
}

function ScopeBadge({ apiKey }: { apiKey: ApiKey }) {
  const isLegacy = !apiKey.scopes || apiKey.scopes.length === 0;

  if (isLegacy) {
    return <Badge variant="destructive">Full Access (Legacy)</Badge>;
  }

  return (
    <Badge variant="outline">
      {apiKey.scopes.length} {apiKey.scopes.length === 1 ? 'scope' : 'scopes'}
    </Badge>
  );
}

function ActionsCell({ apiKey }: { apiKey: ApiKey }) {
  const { revokeApiKey } = useApiKeys();
  const { hasPermission } = usePermissions();
  const canDeleteApiKey = hasPermission('apiKey', 'delete');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      await revokeApiKey(apiKey.id);
      setDeleteOpen(false);
      toast.success('API key revoked');
    } catch {
      toast.error('Failed to revoke API key');
    } finally {
      setIsRevoking(false);
    }
  };

  if (!canDeleteApiKey) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger variant="ellipsis">
          <OverflowMenuVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <TrashCan size={16} />
            Revoke
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this API key? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleRevoke}
              disabled={isRevoking}
            >
              {isRevoking ? 'Revoking...' : 'Revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ApiKeysTable({ initialApiKeys }: { initialApiKeys: ApiKey[] }) {
  const { apiKeys } = useApiKeys({ initialData: initialApiKeys });
  const [search, setSearch] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const hasLegacyKeys = useMemo(
    () => apiKeys.some((k) => !k.scopes || k.scopes.length === 0),
    [apiKeys],
  );

  const filteredApiKeys = useMemo(() => {
    if (!search.trim()) return apiKeys;
    const lowerSearch = search.toLowerCase();
    return apiKeys.filter((key) => key.name.toLowerCase().includes(lowerSearch));
  }, [apiKeys, search]);

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Never';
    return new Date(date).toISOString().slice(0, 10);
  };

  return (
    <Stack gap="md">
      {/* Legacy keys warning */}
      {hasLegacyKeys && <LegacyKeysBanner />}

      {/* Toolbar */}
      <HStack justify="between" align="center" wrap="wrap" gap="3">
        <div className="w-full md:max-w-[300px]">
          <InputGroup>
            <InputGroupAddon>
              <Search size={16} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search API keys..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </div>
        <Button onClick={() => setIsSheetOpen(true)}>
          <Add size={16} />
          Add API Key
        </Button>
      </HStack>

      {/* Table */}
      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>NAME</TableHead>
            <TableHead>ACCESS</TableHead>
            <TableHead>CREATED</TableHead>
            <TableHead>EXPIRES</TableHead>
            <TableHead>LAST USED</TableHead>
            <TableHead style={{ width: 80 }}>ACTIONS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredApiKeys.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>
                <div className="flex items-center justify-center py-8">
                  <Text variant="muted">
                    {search ? 'No API keys match your search' : 'No API keys yet'}
                  </Text>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filteredApiKeys.map((apiKey) => (
              <TableRow key={apiKey.id}>
                <TableCell>
                  <Text size="sm">{apiKey.name}</Text>
                </TableCell>
                <TableCell>
                  <ScopeBadge apiKey={apiKey} />
                </TableCell>
                <TableCell>
                  <Text size="sm" variant="muted">
                    {formatDate(apiKey.createdAt)}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text size="sm" variant="muted">
                    {formatDate(apiKey.expiresAt)}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text size="sm" variant="muted">
                    {formatDate(apiKey.lastUsedAt)}
                  </Text>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <ActionsCell apiKey={apiKey} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Create Sheet */}
      <CreateApiKeySheet open={isSheetOpen} onOpenChange={setIsSheetOpen} />
    </Stack>
  );
}
