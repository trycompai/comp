import { Button } from '@comp/ui/button';
import { Plus, XIcon } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import type { CellProps, Column } from 'react-datasheet-grid';
import ReactDOM from 'react-dom'; // Import ReactDOM for createPortal

// Interface for items that can be displayed as pills
export interface ItemWithName {
  id: string;
  name: string; // Primary display label (e.g., identifier for requirements)
  sublabel?: string; // Optional secondary display label (e.g., framework name for requirements)
  description?: string; // Keep for potential future use or other item types
}

// TRowDataType is the type of the entire row object (e.g., ControlsPageGridData)
// TItemsKey is a key of TRowDataType that points to ItemWithName[] (e.g., 'policyTemplates')
interface RelationalCellComponentProps<
  TRowDataType extends { id?: string },
  TItemsKey extends keyof TRowDataType,
> extends CellProps<TRowDataType, TRowDataType> {
  itemsKey: TItemsKey;
  getAllSearchableItems: () => Promise<ItemWithName[]>;
  linkItemAction: (controlId: string, itemId: string) => Promise<void>;
  unlinkItemAction: (controlId: string, itemId: string) => Promise<void>;
  itemTypeLabel: string;
  createdRowIds?: Set<string>;
}

/**
 * RelationalCellComponent is the inner implementation for the cell.
 * It displays items as pills. When inactive, it shows a clipped single line.
 * When active (and not pending creation), it uses a portal for an expanded view.
 */
const RelationalCellComponent = <
  TRowDataType extends { id?: string },
  TItemsKey extends keyof TRowDataType,
>(
  props: RelationalCellComponentProps<TRowDataType, TItemsKey>,
) => {
  const {
    rowData, // This is now the full TRowDataType object
    active,
    itemsKey,
    getAllSearchableItems,
    linkItemAction,
    unlinkItemAction,
    itemTypeLabel,
    createdRowIds,
  } = props;

  // Extract ItemWithName[] from the full rowData using itemsKey
  const items: ItemWithName[] = (rowData?.[itemsKey] as unknown as ItemWithName[]) || [];

  const cellRef = useRef<HTMLDivElement>(null);
  const [popoverStyles, setPopoverStyles] = useState<React.CSSProperties>({});
  const [isPortalVisible, setIsPortalVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // State for search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [allSearchableItems, setAllSearchableItems] = useState<ItemWithName[]>([]);
  const [filteredItems, setFilteredItems] = useState<ItemWithName[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);

  // Access id from the full rowData object (which is props.rowData)
  const isPendingCreation = createdRowIds?.has(rowData?.id ?? '');

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Effect to fetch all items when search mode is activated
  useEffect(() => {
    if (isSearching && active && mounted) {
      if (allSearchableItems.length === 0) {
        // Fetch only if not already fetched
        setIsLoadingSearch(true);
        getAllSearchableItems()
          .then((fetchedItems) => {
            setAllSearchableItems(fetchedItems);
            setFilteredItems(fetchedItems); // Initially, all items are filtered
          })
          .catch(console.error) // Basic error handling
          .finally(() => setIsLoadingSearch(false));
      } else {
        // If already fetched, just ensure filteredItems is up-to-date with current search term (e.g. if term was persisted)
        setFilteredItems(
          allSearchableItems.filter(
            (item) =>
              item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (item.sublabel && item.sublabel.toLowerCase().includes(searchTerm.toLowerCase())),
          ),
        );
      }
    }
  }, [isSearching, active, mounted, getAllSearchableItems, allSearchableItems.length, searchTerm]); // Added allSearchableItems.length and searchTerm

  // Effect to filter items when searchTerm changes
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredItems(allSearchableItems);
    } else {
      setFilteredItems(
        allSearchableItems.filter(
          (item) =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.sublabel && item.sublabel.toLowerCase().includes(searchTerm.toLowerCase())),
        ),
      );
    }
  }, [searchTerm, allSearchableItems]);

  useEffect(() => {
    // Only open portal if active, mounted, and NOT pending creation
    if (active && cellRef.current && mounted && !isPendingCreation) {
      const rect = cellRef.current.getBoundingClientRect();
      setPopoverStyles({
        position: 'absolute',
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        minWidth: rect.width,
        maxWidth: Math.max(rect.width * 1.5, 350),
        backgroundColor: 'white',
        border: '1px solid #dee2e6',
        borderRadius: '2px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        zIndex: 1050,
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '8px',
        maxHeight: '300px',
      });
      setIsPortalVisible(true);
    } else {
      setIsPortalVisible(false);
      setIsSearching(false);
      setSearchTerm('');
    }
  }, [active, mounted, isPendingCreation]); // Added isPendingCreation to dependencies

  const pillBaseStyle: React.CSSProperties = {
    backgroundColor: '#f0f0f0',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.875em',
    whiteSpace: 'nowrap',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    flexShrink: 0,
  };

  const addButtonStyle: React.CSSProperties = {
    flexShrink: 0,
  };

  const InactiveView = () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        flexWrap: 'nowrap',
        overflow: 'hidden',
        gap: '4px',
        padding: '5px',
        opacity: isPendingCreation ? 0.5 : 1,
        cursor: isPendingCreation ? 'not-allowed' : 'default',
        backgroundColor: isPendingCreation ? '#f8f9fa' : 'transparent', // Optional: distinct background for pending
      }}
      // Prevent click propagation and default grid actions if pending creation
      onClickCapture={
        isPendingCreation
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
            }
          : undefined
      }
    >
      {isPendingCreation ? (
        // If pending creation, show only specific text
        <span style={{ fontStyle: 'italic', color: '#6c757d' }}>Save row to link items</span>
      ) : (
        // If not pending creation, show the item pills
        items.map((item) => (
          <span key={item.id} style={pillBaseStyle}>
            {item.name}
          </span>
        ))
        // No "Add" button here, it was removed previously for InactiveView
      )}
    </div>
  );

  const handleSelectItem = async (itemToLink: ItemWithName) => {
    if (rowData.id) {
      try {
        await linkItemAction(rowData.id, itemToLink.id);
        // Success will be handled by the caller (e.g., toast in ControlsClientPage)
      } catch (error) {
        console.error(
          `RelationalCell: Error linking ${itemTypeLabel} '${itemToLink.name}':`,
          error,
        );
        // Error notification (toast) will be handled by the caller
      }
    } else {
      console.warn(
        'Link action or control ID missing for handleSelectItem. Ensure rowData.id and linkItemAction prop are provided.',
      );
    }
    setSearchTerm('');
    setIsSearching(false);
  };

  const handleUnlinkItem = async (itemToUnlink: ItemWithName) => {
    if (rowData.id) {
      try {
        await unlinkItemAction(rowData.id, itemToUnlink.id);
        // Success will be handled by the caller
      } catch (error) {
        console.error(
          `RelationalCell: Error unlinking ${itemTypeLabel} '${itemToUnlink.name}':`,
          error,
        );
        // Error notification will be handled by the caller
      }
    } else {
      console.warn(
        'Unlink action or control ID missing for handleUnlinkItem. Ensure rowData.id and unlinkItemAction prop are provided.',
      );
    }
  };

  const ActivePortalContent = () => (
    <div
      style={{ ...popoverStyles, opacity: isPendingCreation ? 0.5 : 1 }}
      onMouseDown={(e) => {
        // If pending creation, stop propagation to prevent any interaction.
        // If not pending creation (i.e., portal is active and interactive),
        // also stop propagation to prevent clicks inside the portal from deactivating the grid cell.
        e.stopPropagation();
      }}
    >
      {isSearching ? (
        <>
          <input
            type="text"
            placeholder={`Search ${itemTypeLabel}s...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              marginBottom: '8px',
            }}
            autoFocus
          />
          {isLoadingSearch ? (
            <p>Loading...</p>
          ) : (
            <div style={{ flexGrow: 1, overflowY: 'auto', minHeight: '100px' }}>
              {filteredItems.length === 0 && searchTerm !== '' && <p>No {itemTypeLabel}s found.</p>}
              {filteredItems.map((item) => {
                const isLinked = items.some((linkedItem) => linkedItem.id === item.id);
                const buttonTitle = item.sublabel ? `${item.name} - ${item.sublabel}` : item.name;
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectItem(item)}
                    disabled={isLinked}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      marginBottom: '4px',
                      height: 'auto',
                      lineHeight: 'normal',
                      padding: '0.3rem 0.6rem',
                    }}
                    title={buttonTitle}
                  >
                    <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                    {item.sublabel && (
                      <div style={{ fontSize: '0.85em', color: '#555' }}>{item.sublabel}</div>
                    )}
                    {isLinked && (
                      <span
                        style={{
                          marginTop: '0.2em',
                          display: 'block',
                          fontSize: '0.85em',
                          color: '#888',
                        }}
                      >
                        (Linked)
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsSearching(false);
              setSearchTerm('');
            }}
            style={{ ...addButtonStyle, marginTop: '8px' }}
          >
            Back to Pills
          </Button>
        </>
      ) : (
        <>
          {items.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                alignItems: 'flex-start',
                overflowY: 'auto',
                maxHeight: 'calc(300px - 40px - 8px - 8px)',
              }}
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    ...pillBaseStyle,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.name}
                  </span>
                  {!isPendingCreation && rowData.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive h-5 w-5 shrink-0 p-0"
                      onClick={() => handleUnlinkItem(item)}
                      title={`Unlink ${item.name}`}
                      onMouseDown={(e) => e.stopPropagation()} // Prevent DSG from stealing focus
                    >
                      <XIcon className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {!isPendingCreation && ( // Conditionally render Add button
            <Button
              variant="outline"
              className=""
              size="sm"
              onClick={() => setIsSearching(true)}
              style={addButtonStyle}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          {isPendingCreation &&
            items.length === 0 && ( // Show placeholder if pending and empty in active view
              <span
                style={{
                  ...pillBaseStyle,
                  backgroundColor: '#e9ecef',
                  color: '#6c757d',
                  alignSelf: 'flex-start',
                }}
              >
                Save row to enable linking
              </span>
            )}
        </>
      )}
    </div>
  );

  return (
    <>
      <div ref={cellRef} style={{ height: '100%', width: '100%', position: 'relative' }}>
        <InactiveView />
      </div>
      {/* Portal is only rendered if conditions in useEffect (for popoverStyles) were met */}
      {mounted &&
        active &&
        isPortalVisible &&
        !isPendingCreation &&
        ReactDOM.createPortal(<ActivePortalContent />, document.body)}
    </>
  );
};

// Export the memoized component, letting React.memo infer types more directly
export const RelationalCell = React.memo(RelationalCellComponent) as {
  <TRowDataType extends { id?: string }, TItemsKey extends keyof TRowDataType>(
    props: RelationalCellComponentProps<TRowDataType, TItemsKey>,
  ): React.ReactElement; // Use React.ReactElement for JSX
  displayName?: string;
};

RelationalCell.displayName = 'RelationalCell';

/**
 * \`relationalColumn\` is a factory function that creates a \`react-datasheet-grid\` column configuration
 * for displaying a list of ItemWithName objects as pills using the RelationalCell component.
 */
// TRowDataType is the full row data type, TItemsKey is the key for the items array within TRowDataType
export const relationalColumn = <
  TRowDataType extends { id?: string },
  TItemsKey extends keyof TRowDataType,
>(
  customProps: Omit<
    RelationalCellComponentProps<TRowDataType, TItemsKey>,
    keyof CellProps<TRowDataType, TRowDataType>
  > & { itemsKey: TItemsKey },
): Partial<Column<TRowDataType, TRowDataType>> => ({
  // Column now operates on TRowDataType for its cell value
  // The \`component\` receives CellProps where \`rowData\` is TRowDataType
  component: (dsgCellProps: CellProps<TRowDataType, TRowDataType>) => (
    <RelationalCell {...dsgCellProps} {...customProps} />
  ),
  keepFocus: true,
  // The column-level disabled prop is removed as it was causing type issues and
  // the RelationalCell component itself handles its disabled state visually and interactively.
});
