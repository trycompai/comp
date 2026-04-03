'use client';

import { apiClient } from '@/app/lib/api-client';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  ScrollArea,
} from '@trycompai/ui';
import { Loader2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface ControlTemplateWithFrameworks {
  id: string;
  name: string;
  requirements?: Array<{
    framework?: { id: string; name: string | null } | null;
  }>;
}

export interface ExistingItemRaw {
  id: string;
  name: string;
  controlTemplates?: ControlTemplateWithFrameworks[];
  requirements?: Array<{
    framework?: { id: string; name: string | null } | null;
  }>;
}

interface ExistingItemDisplay {
  id: string;
  name: string;
  frameworkNames: string[];
}

type ItemType = 'task' | 'control' | 'policy';

const ITEM_TYPE_CONFIG: Record<ItemType, { label: string; linkPath: string }> =
  {
    task: { label: 'Task', linkPath: 'link-task' },
    control: { label: 'Control', linkPath: 'link-control' },
    policy: { label: 'Policy', linkPath: 'link-policy' },
  };

interface AddExistingItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  frameworkId: string;
  itemType: ItemType;
  existingItemIds: Set<string>;
  fetchAllItems: () => Promise<ExistingItemRaw[]>;
}

function extractFrameworkNames(item: ExistingItemRaw): string[] {
  const names = new Set<string>();

  if (item.controlTemplates) {
    for (const ct of item.controlTemplates) {
      if (ct.requirements) {
        for (const req of ct.requirements) {
          if (req.framework?.name) names.add(req.framework.name);
        }
      }
    }
  }

  if (item.requirements) {
    for (const req of item.requirements) {
      if (req.framework?.name) names.add(req.framework.name);
    }
  }

  return Array.from(names);
}

export function AddExistingItemDialog({
  isOpen,
  onOpenChange,
  frameworkId,
  itemType,
  existingItemIds,
  fetchAllItems,
}: AddExistingItemDialogProps) {
  const router = useRouter();
  const config = ITEM_TYPE_CONFIG[itemType];

  const [allItems, setAllItems] = useState<ExistingItemDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setAllItems([]);
      setLinkedIds(new Set());
      return;
    }

    setIsLoading(true);
    fetchAllItems()
      .then((items) => {
        setAllItems(
          items.map((item) => ({
            id: item.id,
            name: item.name,
            frameworkNames: extractFrameworkNames(item),
          })),
        );
      })
      .catch(() => toast.error(`Failed to load ${config.label.toLowerCase()}s`))
      .finally(() => setIsLoading(false));
  }, [isOpen, fetchAllItems, config.label]);

  const availableItems = useMemo(() => {
    const term = search.toLowerCase().trim();
    return allItems
      .filter((item) => !existingItemIds.has(item.id) && !linkedIds.has(item.id))
      .filter(
        (item) =>
          !term ||
          item.name.toLowerCase().includes(term) ||
          item.frameworkNames.some((fn) => fn.toLowerCase().includes(term)),
      );
  }, [allItems, existingItemIds, linkedIds, search]);

  const handleLink = useCallback(
    async (item: ExistingItemDisplay) => {
      setLinkingId(item.id);
      try {
        await apiClient(`/framework/${frameworkId}/${config.linkPath}/${item.id}`, {
          method: 'POST',
        });
        setLinkedIds((prev) => new Set(prev).add(item.id));
        toast.success(`${config.label} "${item.name}" linked successfully`);
        router.refresh();
      } catch {
        toast.error(`Failed to link ${config.label.toLowerCase()}`);
      } finally {
        setLinkingId(null);
      }
    },
    [frameworkId, config, router],
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add Existing {config.label}</DialogTitle>
          <DialogDescription>
            Search and link an existing {config.label.toLowerCase()} from
            another framework.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
          <Input
            placeholder={`Search by name or framework...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-sm pl-8"
            autoFocus
          />
        </div>

        <ScrollArea className="h-[340px] rounded-sm border">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          ) : availableItems.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              {search
                ? `No ${config.label.toLowerCase()}s matching "${search}"`
                : `No unlinked ${config.label.toLowerCase()}s available`}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {availableItems.map((item) => (
                <div
                  key={item.id}
                  className="hover:bg-muted/50 flex items-center justify-between gap-2 rounded-sm p-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {item.name}
                    </div>
                    {item.frameworkNames.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {item.frameworkNames.map((fn) => (
                          <Badge
                            key={fn}
                            variant="secondary"
                            className="text-xs"
                          >
                            {fn}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 rounded-sm"
                    disabled={linkingId === item.id}
                    onClick={() => handleLink(item)}
                  >
                    {linkingId === item.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : null}
                    Link
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
