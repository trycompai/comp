'use client'

import { SearchAndLinkList, type SearchableItemForLinking } from '@/app/components/SearchAndLinkList';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@comp/ui/dialog";

interface ManageLinksDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string; // e.g., "Manage Associated Requirements"
  itemTypeLabel: string; // e.g., "Requirement"
  linkedItemIds: Set<string>;
  currentLinkedItemsDetails: SearchableItemForLinking[];
  getAllItemsFunction: () => Promise<SearchableItemForLinking[]>;
  onLinkItem: (item: SearchableItemForLinking) => Promise<void>;
  onUnlinkItem: (item: SearchableItemForLinking) => Promise<void>;
  renderItemDisplay?: (item: SearchableItemForLinking) => React.ReactNode;
}

export function ManageLinksDialog({
  isOpen,
  onOpenChange,
  title,
  itemTypeLabel,
  linkedItemIds,
  currentLinkedItemsDetails,
  getAllItemsFunction,
  onLinkItem,
  onUnlinkItem,
  renderItemDisplay,
}: ManageLinksDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col rounded-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            View currently linked {itemTypeLabel.toLowerCase()}s, or search all available {itemTypeLabel.toLowerCase()}s to link/unlink new ones.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow py-4"> {/* Allow this div to scroll if SearchAndLinkList content exceeds dialog height */} 
          <SearchAndLinkList 
            itemTypeLabel={itemTypeLabel}
            linkedItemIds={linkedItemIds}
            currentLinkedItemsDetails={currentLinkedItemsDetails}
            getAllItemsFunction={getAllItemsFunction}
            onLinkItem={onLinkItem}
            onUnlinkItem={onUnlinkItem}
            renderItemDisplay={renderItemDisplay}
          />
        </div>

      </DialogContent>
    </Dialog>
  );
} 