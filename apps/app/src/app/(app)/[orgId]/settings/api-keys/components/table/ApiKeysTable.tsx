'use client';

import { useApi } from '@/hooks/use-api';
import type { ApiKey } from '@/hooks/use-api-keys';
import { useMediaQuery } from '@comp/ui/hooks';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HStack,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Add, Close, Copy, OverflowMenuVertical, Search, TrashCan } from '@trycompai/design-system/icons';
import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

function ActionsCell({ apiKey }: { apiKey: ApiKey }) {
  const api = useApi();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      const response = await api.post('/v1/organization/api-keys/revoke', { id: apiKey.id });
      if (response.error) throw new Error(response.error);
      setDeleteOpen(false);
      toast.success('API key revoked');
      router.refresh();
    } catch {
      toast.error('Failed to revoke API key');
    } finally {
      setIsRevoking(false);
    }
  };

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

function CreateApiKeySheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const api = useApi();
  const router = useRouter();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [name, setName] = useState('');
  const [expiration, setExpiration] = useState<'never' | '30days' | '90days' | '1year'>('never');
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async () => {
    setIsCreating(true);
    try {
      const response = await api.post<{ key: string }>('/v1/organization/api-keys', {
        name,
        expiresAt: expiration,
      });
      if (response.error) throw new Error(response.error);
      if (response.data?.key) {
        setCreatedApiKey(response.data.key);
      }
      router.refresh();
    } catch {
      toast.error('Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setName('');
      setExpiration('never');
      setCreatedApiKey(null);
      setCopied(false);
      onOpenChange(false);
    }
  };

  const copyToClipboard = async () => {
    if (createdApiKey) {
      try {
        await navigator.clipboard.writeText(createdApiKey);
        setCopied(true);
        toast.success('API key copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error('Failed to copy');
      }
    }
  };

  const renderForm = () => (
    <Stack gap="md">
      <Stack gap="xs">
        <Text size="sm" weight="medium">
          Name
        </Text>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name for this API key"
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </Stack>
      <Stack gap="xs">
        <Text size="sm" weight="medium">
          Expiration
        </Text>
        <Select
          value={expiration}
          onValueChange={(value) =>
            setExpiration(value as 'never' | '30days' | '90days' | '1year')
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select expiration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="never">Never</SelectItem>
            <SelectItem value="30days">30 days</SelectItem>
            <SelectItem value="90days">90 days</SelectItem>
            <SelectItem value="1year">1 year</SelectItem>
          </SelectContent>
        </Select>
      </Stack>
      <Button
        onClick={handleSubmit}
        disabled={isCreating || !name.trim()}
        width="full"
      >
        {isCreating ? 'Creating...' : 'Create'}
      </Button>
    </Stack>
  );

  const renderCreatedKey = () => (
    <Stack gap="md">
      <Stack gap="xs">
        <Text size="sm" weight="medium">
          API Key
        </Text>
        <div className="relative w-full">
          <div className="overflow-hidden rounded-md bg-muted p-3 pr-10">
            <code className="break-all text-sm">{createdApiKey}</code>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={copyToClipboard}
            style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy size={16} />}
          </Button>
        </div>
        <Text size="xs" variant="muted">
          This key will only be shown once. Make sure to copy it now.
        </Text>
      </Stack>
      <Button onClick={handleClose} width="full">
        Done
      </Button>
    </Stack>
  );

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent>
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>{createdApiKey ? 'API Key Created' : 'New API Key'}</SheetTitle>
              <Button size="icon" variant="ghost" onClick={handleClose}>
                <Close size={20} />
              </Button>
            </div>
            <SheetDescription>
              {createdApiKey
                ? "Your API key has been created. Make sure to copy it now as you won't be able to see it again."
                : "Create a new API key for programmatic access to your organization's data."}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            {createdApiKey ? renderCreatedKey() : renderForm()}
          </SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{createdApiKey ? 'API Key Created' : 'New API Key'}</DrawerTitle>
          <DrawerDescription>
            {createdApiKey
              ? "Your API key has been created. Make sure to copy it now as you won't be able to see it again."
              : "Create a new API key for programmatic access to your organization's data."}
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4">{createdApiKey ? renderCreatedKey() : renderForm()}</div>
      </DrawerContent>
    </Drawer>
  );
}

export function ApiKeysTable({ apiKeys }: { apiKeys: ApiKey[] }) {
  const [search, setSearch] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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
            <TableHead>CREATED</TableHead>
            <TableHead>EXPIRES</TableHead>
            <TableHead>LAST USED</TableHead>
            <TableHead style={{ width: 80 }}>ACTIONS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredApiKeys.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
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
