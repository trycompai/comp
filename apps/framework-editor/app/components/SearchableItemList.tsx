'use client';

import { useState, useMemo } from 'react';
import { Input } from '@comp/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';

export interface SearchableItem {
  id: string;
  name: string;
  [key: string]: any; // Allow other properties for flexible rendering
}

interface SearchableItemListProps {
  items: SearchableItem[];
  title: string;
  searchPlaceholder: string;
  itemTypeLabel: string; // e.g., "requirement", "policy template"
  renderItem?: (item: SearchableItem) => React.ReactNode;
  // We could add an onItemClick handler here if needed in the future
  // onItemClick?: (item: SearchableItem) => void;
}

export function SearchableItemList({
  items,
  title,
  searchPlaceholder,
  itemTypeLabel,
  renderItem,
}: SearchableItemListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm) {
      return items;
    }
    return items.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [items, searchTerm]);

  const defaultRenderItem = (item: SearchableItem) => (
    <li key={item.id} className="bg-muted/20 rounded-sm border p-2 text-sm">
      {item.name}
    </li>
  );

  return (
    <Card className="w-full rounded-sm shadow-none">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <>
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4 rounded-sm"
            />
            {filteredItems.length > 0 ? (
              <ul className="space-y-2">
                {filteredItems.map((item) =>
                  renderItem ? renderItem(item) : defaultRenderItem(item),
                )}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                No {itemTypeLabel}s found matching your search.
              </p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">No {itemTypeLabel}s associated.</p>
        )}
      </CardContent>
    </Card>
  );
}
