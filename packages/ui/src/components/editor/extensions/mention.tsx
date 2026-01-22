import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
import Mention from '@tiptap/extension-mention';
import { ReactRenderer } from '@tiptap/react';
import type { SuggestionOptions } from '@tiptap/suggestion';
import { useEffect, useRef, useState } from 'react';

export interface MentionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  // Optional display label used by the mention node (we persist it into node attrs)
  label?: string;
}

export interface MentionListProps {
  items: MentionUser[];
  command: (item: MentionUser) => void;
  onSelect?: () => void;
  // Callback to register the onKeyDown handler for parent access
  onKeyDownRef?: React.MutableRefObject<((props: { event: KeyboardEvent }) => boolean) | null>;
}

function MentionList({ items, command, onSelect, onKeyDownRef }: MentionListProps) {
  const safeItems = items || [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Store current state in refs for the keydown handler
  const selectedIndexRef = useRef(selectedIndex);
  const safeItemsRef = useRef(safeItems);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    safeItemsRef.current = safeItems;
  }, [safeItems]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [safeItems.length]);

  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  const handleSelect = (item: MentionUser) => {
    // Pass the item with label for display
    command({
      ...item,
      label: item.name || item.email || item.id,
    });
    // Call onSelect callback if provided
    if (onSelect) {
      onSelect();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (safeItems.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % safeItems.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + safeItems.length) % safeItems.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (safeItems[selectedIndex]) {
        handleSelect(safeItems[selectedIndex]);
      }
    }
  };

  // Register the onKeyDown handler for external access
  useEffect(() => {
    if (onKeyDownRef) {
      onKeyDownRef.current = (props: { event: KeyboardEvent }) => {
        const { event } = props;
        const currentItems = safeItemsRef.current;
        const currentIndex = selectedIndexRef.current;

        if (currentItems.length === 0) return false;

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % currentItems.length);
          return true;
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + currentItems.length) % currentItems.length);
          return true;
        } else if (event.key === 'Enter') {
          event.preventDefault();
          if (currentItems[currentIndex]) {
            handleSelect(currentItems[currentIndex]);
          }
          return true;
        }
        return false;
      };
    }

    return () => {
      if (onKeyDownRef) {
        onKeyDownRef.current = null;
      }
    };
  }, [onKeyDownRef, command, onSelect]);

  if (safeItems.length === 0) {
    return (
      <div className="bg-popover border border-border rounded-md shadow-md p-1 min-w-[200px]">
        <div className="px-2 py-1.5 text-sm text-muted-foreground">No members found</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-popover border border-border rounded-md shadow-md p-1 max-h-[300px] overflow-y-auto min-w-[200px]"
      onKeyDown={handleKeyDown}
      role="listbox"
      onClick={(e) => {
        // Prevent editor from capturing click events
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        // Prevent editor from capturing mousedown events
        e.stopPropagation();
      }}
      style={{ pointerEvents: 'auto' }}
    >
      {safeItems.map((item, index) => (
        <button
          key={item.id}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleSelect(item);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm transition-colors text-left ${
            index === selectedIndex
              ? 'bg-accent text-accent-foreground'
              : 'hover:bg-accent hover:text-accent-foreground'
          }`}
          type="button"
          role="option"
          aria-selected={index === selectedIndex}
        >
          {item.image ? (
            <img src={item.image} alt={item.name} className="w-6 h-6 rounded-full" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              {item.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-medium truncate">{item.name}</span>
            <span className="text-xs text-muted-foreground truncate">{item.email}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

export interface CreateMentionExtensionOptions {
  suggestion: Omit<SuggestionOptions<MentionUser>, 'editor'> & {
    onSelect?: () => void;
  };
}

export function createMentionExtension({ suggestion }: CreateMentionExtensionOptions) {
  return Mention.configure({
    HTMLAttributes: {
      class: 'mention bg-primary/10 text-primary px-1 rounded',
    },
    renderText({ options, node }) {
      // Display the label (name/email) instead of id
      return `@${node.attrs.label || node.attrs.id || ''}`;
    },
    suggestion: {
      ...suggestion,
      items: ({ query, editor }) => {
        try {
          if (!suggestion.items) return [];
          const result = suggestion.items({ query, editor });
          return Array.isArray(result) ? result : [];
        } catch (error) {
          console.error('Error in mention items:', error);
          return [];
        }
      },
      render: () => {
        let component: ReactRenderer;
        let popup: HTMLDivElement | null = null;
        let cleanup: (() => void) | null = null;
        // Mutable ref to store the keydown handler from the component
        const keyDownHandlerRef: {
          current: ((props: { event: KeyboardEvent }) => boolean) | null;
        } = { current: null };

        return {
          onStart: (props) => {
            // Ensure items is always an array
            const items = Array.isArray(props.items) ? props.items : [];

            component = new ReactRenderer(MentionList, {
              props: {
                ...props,
                items,
                onSelect: suggestion.onSelect,
                onKeyDownRef: keyDownHandlerRef,
              },
              editor: props.editor,
            });

            if (!props.clientRect) {
              return;
            }

            popup = document.createElement('div');
            popup.style.position = 'absolute';
            popup.style.top = '0';
            popup.style.left = '0';
            popup.style.zIndex = '9999';
            popup.style.pointerEvents = 'auto';
            popup.appendChild(component.element);
            document.body.appendChild(popup);

            const virtualElement = {
              getBoundingClientRect: () => props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
            };

            const updatePosition = () => {
              if (!popup) return;
              computePosition(virtualElement, popup, {
                placement: 'bottom-start',
                middleware: [offset(6), flip(), shift({ padding: 8 })],
              }).then(({ x, y }) => {
                if (!popup) return;
                popup.style.transform = `translate(${x}px, ${y}px)`;
              });
            };

            updatePosition();
            cleanup = autoUpdate(virtualElement, popup, updatePosition);
          },

          onUpdate(props) {
            // Ensure items is always an array
            const items = Array.isArray(props.items) ? props.items : [];

            // Include onSelect and onKeyDownRef to preserve keyboard navigation
            component.updateProps({
              ...props,
              items,
              onSelect: suggestion.onSelect,
              onKeyDownRef: keyDownHandlerRef,
            });

            if (!popup || !props.clientRect) {
              return;
            }

            const virtualElement = {
              getBoundingClientRect: () => props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
            };

            computePosition(virtualElement, popup, {
              placement: 'bottom-start',
              middleware: [offset(6), flip(), shift({ padding: 8 })],
            }).then(({ x, y }) => {
              if (!popup) return;
              popup.style.transform = `translate(${x}px, ${y}px)`;
            });
          },

          onKeyDown(props) {
            if (props.event.key === 'Escape') {
              if (popup) {
                popup.style.display = 'none';
              }
              return true;
            }

            // Use the registered keydown handler from the component
            if (keyDownHandlerRef.current) {
              return keyDownHandlerRef.current(props);
            }

            return false;
          },

          onExit() {
            cleanup?.();
            cleanup = null;
            if (popup) {
              popup.remove();
            }
            popup = null;

            try {
              component.destroy();
            } catch (e) {
              // Component already destroyed, ignore
            }
          },
        };
      },
    },
  });
}
