'use client';

import { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';
import { Plus, X, Info } from 'lucide-react';
import { Button } from '@comp/ui/button';
import { Input } from '@comp/ui/input';
import { Badge } from '@comp/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@comp/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@comp/ui/tooltip';
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
import { updateAllowedDomainsAction } from '../actions/update-allowed-domains';

interface AllowedDomainsManagerProps {
  initialDomains: string[];
  orgId: string;
}

const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;

export function AllowedDomainsManager({
  initialDomains,
  orgId,
}: AllowedDomainsManagerProps) {
  const [domains, setDomains] = useState<string[]>(initialDomains);
  const [lastSavedDomains, setLastSavedDomains] =
    useState<string[]>(initialDomains);
  const [newDomain, setNewDomain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [domainToDelete, setDomainToDelete] = useState<string | null>(null);

  const updateDomains = useAction(updateAllowedDomainsAction, {
    onSuccess: ({ data }) => {
      toast.success('Allowed domains updated');
      // Update last saved state from server response
      if (data?.allowedDomains) {
        setLastSavedDomains(data.allowedDomains);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to update allowed domains');
      // Revert to last successfully saved state
      setDomains(lastSavedDomains);
    },
  });

  const normalizeDomain = (domain: string): string => {
    let normalized = domain.toLowerCase().trim();
    // Remove protocol if present
    normalized = normalized.replace(/^https?:\/\//i, '');
    // Remove path
    normalized = normalized.split('/')[0] ?? normalized;
    // Remove www prefix
    normalized = normalized.replace(/^www\./i, '');
    return normalized;
  };

  const handleAddDomain = () => {
    setError(null);
    const normalized = normalizeDomain(newDomain);

    if (!normalized) {
      setError('Please enter a domain');
      return;
    }

    if (!domainRegex.test(normalized)) {
      setError('Invalid domain format (e.g., example.com)');
      return;
    }

    if (domains.includes(normalized)) {
      setError('Domain already in list');
      return;
    }

    const updatedDomains = [...domains, normalized];
    setDomains(updatedDomains);
    setNewDomain('');
    updateDomains.execute({ allowedDomains: updatedDomains });
  };

  const handleRemoveDomain = (domainToRemove: string) => {
    const updatedDomains = domains.filter((d) => d !== domainToRemove);
    setDomains(updatedDomains);
    updateDomains.execute({ allowedDomains: updatedDomains });
    setDomainToDelete(null);
  };

  const handleConfirmDelete = () => {
    if (domainToDelete) {
      handleRemoveDomain(domainToDelete);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDomain();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">NDA Bypass - Allowed Domains</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Users with email addresses from these domains will receive
                  direct access to the trust portal without needing to sign an
                  NDA when their request is approved.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription>
          Email domains that bypass NDA signing for trust portal access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="example.com"
              value={newDomain}
              onChange={(e) => {
                setNewDomain(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              disabled={updateDomains.status === 'executing'}
            />
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAddDomain}
            disabled={updateDomains.status === 'executing' || !newDomain.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {domains.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {domains.map((domain) => (
              <Badge
                key={domain}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                {domain}
                <button
                  type="button"
                  onClick={() => setDomainToDelete(domain)}
                  disabled={updateDomains.status === 'executing'}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog
        open={domainToDelete !== null}
        onOpenChange={(open) => !open && setDomainToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{domainToDelete}</strong>{' '}
              from the allowed domains list? Users from this domain will need to
              sign an NDA when requesting access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
