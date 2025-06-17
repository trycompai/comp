'use client';

import { Button } from '@comp/ui/button';
import { Input } from '@comp/ui/input';
import { ScrollArea } from '@comp/ui/scroll-area';
import { Separator } from '@comp/ui/separator';
import { Link2OffIcon, Loader2, PlusCircleIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

// Base item structure expected by this component
export interface SearchableItemForLinking {
  id: string;
  name: string;
  frameworkName?: string; // Make frameworkName optional and explicit for type safety
  framework?: { id: string; name: string | null }; // Keep original nested structure if needed
  [key: string]: any; // Allow other properties
}

interface SearchAndLinkListProps {
  itemTypeLabel: string; // e.g., "requirement"
  linkedItemIds: Set<string>; // IDs of currently linked items
  currentLinkedItemsDetails: SearchableItemForLinking[]; // Full details of currently linked items for display
  getAllItemsFunction: () => Promise<SearchableItemForLinking[]>; // Changed from searchFunction
  onLinkItem: (item: SearchableItemForLinking) => Promise<void>;
  onUnlinkItem: (item: SearchableItemForLinking) => Promise<void>;
  renderItemDisplay?: (item: SearchableItemForLinking) => React.ReactNode; // For custom item rendering (name + badge)
}

export function SearchAndLinkList({
  itemTypeLabel,
  linkedItemIds,
  currentLinkedItemsDetails,
  getAllItemsFunction, // Changed from searchFunction
  onLinkItem,
  onUnlinkItem,
  renderItemDisplay,
}: SearchAndLinkListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [availableItems, setAvailableItems] = useState<SearchableItemForLinking[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true); // For the initial fetch of all items
  const [isLoadingAction, setIsLoadingAction] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoadingInitial(true);
      try {
        const results = await getAllItemsFunction();
        setAvailableItems(results);
      } catch (error) {
        console.error(`Error fetching all ${itemTypeLabel}s:`, error);
        setAvailableItems([]);
      }
      setIsLoadingInitial(false);
    };
    fetchAll();
  }, [getAllItemsFunction, itemTypeLabel]); // getAllItemsFunction identity is important

  const filteredAvailableItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      return availableItems;
    }
    return availableItems.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(term);
      // Compound search: check frameworkName if it exists (itemTypeLabel check is an alternative here too)
      const frameworkNameMatch =
        item.frameworkName && item.frameworkName.toLowerCase().includes(term);
      return nameMatch || frameworkNameMatch;
    });
  }, [availableItems, searchTerm]);

  const unlinkedItemsToDisplay = useMemo(() => {
    return filteredAvailableItems.filter((item) => !linkedItemIds.has(item.id));
  }, [filteredAvailableItems, linkedItemIds]);

  const defaultItemDisplay = (item: SearchableItemForLinking) => (
    <span className="truncate" title={item.name}>
      {item.name}
    </span>
  );

  const handleLink = async (item: SearchableItemForLinking) => {
    setIsLoadingAction(item.id);
    try {
      await onLinkItem(item);
    } catch (error) {
      console.error(`Error linking ${itemTypeLabel}:`, error);
    }
    setIsLoadingAction(null);
  };

  const handleUnlink = async (item: SearchableItemForLinking) => {
    setIsLoadingAction(item.id);
    try {
      await onUnlinkItem(item);
    } catch (error) {
      console.error(`Error unlinking ${itemTypeLabel}:`, error);
    }
    setIsLoadingAction(null);
  };

  return (
    <div className="flex min-h-0 flex-col space-y-4">
      <div>
        <h3 className="text-md text-muted-foreground mb-2 font-medium">
          Currently Linked {itemTypeLabel}s ({currentLinkedItemsDetails.length})
        </h3>
        {currentLinkedItemsDetails.length > 0 ? (
          <ScrollArea className="h-[150px] shrink-0 rounded-sm border pr-3">
            <ul className="space-y-1 p-2">
              {currentLinkedItemsDetails.map((item) => (
                <li
                  key={item.id}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-sm p-1.5 text-sm"
                >
                  {renderItemDisplay ? renderItemDisplay(item) : defaultItemDisplay(item)}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnlink(item)}
                    disabled={isLoadingAction === item.id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-2 flex h-auto shrink-0 items-center gap-1 rounded-sm px-2 py-1"
                  >
                    <span className="flex h-4 w-4 items-center justify-center">
                      {isLoadingAction === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Link2OffIcon className="h-4 w-4" />
                      )}
                    </span>
                    Unlink
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground bg-muted/20 flex h-[150px] items-center justify-center rounded-sm border p-2 text-center text-sm">
            No {itemTypeLabel}s are currently linked.
          </p>
        )}
      </div>

      <Separator />

      <div className="flex min-h-0 flex-col">
        <h3 className="text-md text-muted-foreground mb-2 font-medium">
          Find & Link New {itemTypeLabel}s
        </h3>

        <>
          <Input
            type="search"
            placeholder={`Search ${availableItems.length} ${itemTypeLabel.toLowerCase()}s by name or framework...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-3 shrink-0 rounded-sm"
          />
          {unlinkedItemsToDisplay.length === 0 && searchTerm.trim() && (
            <p className="text-muted-foreground flex h-[150px] shrink-0 items-center justify-center rounded-sm border p-2 text-center text-sm">
              No unlinked {itemTypeLabel}s found matching "{searchTerm}".
            </p>
          )}
          {unlinkedItemsToDisplay.length === 0 &&
            !searchTerm.trim() &&
            availableItems.length === 0 && (
              <p className="text-muted-foreground flex h-[150px] shrink-0 items-center justify-center rounded-sm border p-2 text-center text-sm">
                No available {itemTypeLabel}s found in the database.
              </p>
            )}
          {unlinkedItemsToDisplay.length === 0 &&
            !searchTerm.trim() &&
            availableItems.length > 0 && (
              <p className="text-muted-foreground flex h-[150px] shrink-0 items-center justify-center rounded-sm border p-2 text-center text-sm">
                All available {itemTypeLabel}s are already linked.
              </p>
            )}

          {unlinkedItemsToDisplay.length > 0 && (
            <ScrollArea className="h-[150px] shrink-0 rounded-sm border pr-3">
              <ul className="space-y-1 p-2">
                {unlinkedItemsToDisplay.map((item) => (
                  <li
                    key={item.id}
                    className="hover:bg-muted/50 flex items-center justify-between rounded-sm p-1.5 text-sm"
                  >
                    {renderItemDisplay ? renderItemDisplay(item) : defaultItemDisplay(item)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLink(item)}
                      disabled={isLoadingAction === item.id || linkedItemIds.has(item.id)}
                      className="text-primary hover:text-primary hover:bg-primary/10 ml-2 flex h-auto shrink-0 items-center gap-1 rounded-sm px-2 py-1"
                    >
                      <span className="flex h-4 w-4 items-center justify-center">
                        {isLoadingAction === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <PlusCircleIcon className="h-4 w-4" />
                        )}
                      </span>
                      Link
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </>
      </div>
    </div>
  );
}
