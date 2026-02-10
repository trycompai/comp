'use client';

import { useApiKeys } from '@/hooks/use-api-keys';
import { useMediaQuery } from '@comp/ui/hooks';
import type { ScopePreset } from '../../lib/scope-presets';
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
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
  Text,
} from '@trycompai/design-system';
import { Close, Copy } from '@trycompai/design-system/icons';
import { Check } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { ScopeSelector } from './ScopeSelector';

interface CreateApiKeySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateApiKeySheet({ open, onOpenChange }: CreateApiKeySheetProps) {
  const { createApiKey } = useApiKeys();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [name, setName] = useState('');
  const [expiration, setExpiration] = useState<'never' | '30days' | '90days' | '1year'>('never');
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Scope state
  const [preset, setPreset] = useState<ScopePreset>('full');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);

  const handleScopesChange = useCallback((scopes: string[]) => {
    setSelectedScopes(scopes);
  }, []);

  const handleSubmit = async () => {
    setIsCreating(true);
    try {
      // Full access preset sends empty scopes (legacy behavior)
      const scopes = preset === 'full' ? [] : selectedScopes;
      const result = await createApiKey({ name, expiresAt: expiration, scopes });
      if (result.key) {
        setCreatedApiKey(result.key);
      }
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
      setPreset('full');
      setSelectedScopes([]);
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

      <ScopeSelector
        preset={preset}
        onPresetChange={setPreset}
        selectedScopes={selectedScopes}
        onScopesChange={handleScopesChange}
      />

      <Button
        onClick={handleSubmit}
        disabled={isCreating || !name.trim() || (preset !== 'full' && selectedScopes.length === 0)}
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
