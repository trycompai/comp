'use client';

import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';

import { usePermissions } from '@/hooks/use-permissions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@trycompai/design-system';

import { use2faSource } from '../hooks/use2faSource';

const NONE_VALUE = 'none';

/**
 * Picks which connected integration (bound to the 2FA evidence task) supplies
 * the per-employee 2FA column. Hidden for users without integration:update and
 * for orgs with no eligible connected integration.
 */
export function TwoFactorSourceSelector() {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  // Selecting a source is an integration:update action. Gate the hook itself so
  // users without the permission never hit any 2FA-source API.
  const canManage = hasPermission('integration', 'update');
  const {
    selectedSource,
    availableSources,
    setSource,
    hasAnyConnection,
    isLoading,
  } = use2faSource({ organizationId: orgId, enabled: canManage });

  // Wait for BOTH the available sources and the current selection before
  // rendering, so the trigger never flashes the placeholder while the saved
  // selection is still resolving.
  if (!canManage || isLoading || !hasAnyConnection) {
    return null;
  }

  const connectedSources = availableSources.filter((p) => p.connected);
  const selected = connectedSources.find((p) => p.slug === selectedSource);

  const handleSourceChange = async (value: string) => {
    const provider = value === NONE_VALUE ? null : value;
    if (provider === selectedSource) return;
    const ok = await setSource(provider);
    if (ok) {
      // The 2FA column is server-computed; refresh so it reflects the new source.
      router.refresh();
    }
  };

  return (
    // hidden sm:block matches the other secondary toolbar controls (status/role/
    // date filters): config actions collapse on phones, where the toolbar row
    // doesn't wrap. The per-member 2FA status stays visible at every width via
    // the table's own horizontal scroll.
    <div className="hidden w-[200px] sm:block">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">2FA source</span>
        <Select
        value={selectedSource ?? NONE_VALUE}
        onValueChange={(value) => {
          if (value) void handleSourceChange(value);
        }}
      >
        <SelectTrigger>
          {selected ? (
            <div className="flex items-center gap-2">
              {selected.logoUrl && (
                <Image
                  src={selected.logoUrl}
                  alt={selected.name}
                  width={16}
                  height={16}
                  className="rounded-sm"
                  unoptimized
                />
              )}
              <span className="truncate">{selected.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">None</span>
          )}
        </SelectTrigger>
        <SelectContent>
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Shows each person&apos;s 2FA status from this integration
          </div>
          <SelectItem value={NONE_VALUE}>No 2FA source</SelectItem>
          {connectedSources.map((p) => (
            <SelectItem key={p.slug} value={p.slug}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
        </Select>
      </div>
    </div>
  );
}
