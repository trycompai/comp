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
    // the table's own horizontal scroll. The inline "2FA source ·" prefix inside
    // the trigger mirrors the Onboarded/Offboarded chips.
    <div className="hidden w-fit max-w-[280px] sm:block">
      <Select
        value={selectedSource ?? NONE_VALUE}
        onValueChange={(value) => {
          if (value) void handleSourceChange(value);
        }}
      >
        {/* combobox takes its accessible name from author attrs only — the
            inline prefix text alone can't name it, hence the aria-label. */}
        <SelectTrigger aria-label="2FA status from">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-muted-foreground">2FA status from</span>
            <span className="font-medium">·</span>
            {selected ? (
              <>
                {selected.logoUrl && (
                  <Image
                    src={selected.logoUrl}
                    alt=""
                    width={16}
                    height={16}
                    className="rounded-sm"
                    unoptimized
                  />
                )}
                <span className="truncate">{selected.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground">None</span>
            )}
          </div>
        </SelectTrigger>
        <SelectContent>
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Shows each person&apos;s 2FA status from the selected integration&apos;s latest check
          </div>
          <SelectItem value={NONE_VALUE}>Don&apos;t show 2FA status</SelectItem>
          {connectedSources.map((p) => (
            <SelectItem key={p.slug} value={p.slug}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
