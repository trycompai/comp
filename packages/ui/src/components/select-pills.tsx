'use client';
import { useRef, useState, type FC } from 'react';

import { cn } from '../utils/cn';

import { Badge } from './badge';
import { Input } from './input';
import { Popover, PopoverAnchor, PopoverContent } from './popover';

import { X } from 'lucide-react';

interface DataItem {
  id?: string;
  value?: string;
  name: string;
}

interface SelectPillsProps {
  data: DataItem[];
  defaultValue?: string[];
  value?: string[];
  onValueChange?: (selectedValues: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  'data-testid'?: string;
}

export const SelectPills: FC<SelectPillsProps> = ({
  data,
  defaultValue = [],
  value,
  onValueChange,
  placeholder = 'Type to search...',
  disabled = false,
  'data-testid': dataTestId,
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedPills, setSelectedPills] = useState<string[]>(value || defaultValue);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const radioGroupRef = useRef<HTMLDivElement>(null);

  const filteredItems = data.filter(
    (item) =>
      item.name.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedPills.includes(item.name),
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setHighlightedIndex(-1);

    // Keep dropdown open whenever there's input or potential items to show
    if (newValue.trim()) {
      setIsOpen(true);
    } else {
      // Only show dropdown if there are unselected items when input is empty
      const hasUnselectedItems = data.some((item) => !(value || selectedPills).includes(item.name));
      setIsOpen(hasUnselectedItems);
    }

    // Maintain focus after state updates
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (inputValue.trim()) {
          // Add custom value
          const customItem = { name: inputValue.trim() };
          handleItemSelect(customItem);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (isOpen && filteredItems.length > 0) {
          // Move focus to first radio button
          const firstRadio = radioGroupRef.current?.querySelector(
            'input[type="radio"]',
          ) as HTMLElement;
          firstRadio?.focus();
          setHighlightedIndex(0);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleRadioKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (index < filteredItems.length - 1) {
          setHighlightedIndex(index + 1);
          const nextItem = radioGroupRef.current?.querySelector(
            `div:nth-child(${index + 2})`,
          ) as HTMLElement;
          if (nextItem) {
            nextItem.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
            });
          }
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (index > 0) {
          setHighlightedIndex(index - 1);
          const prevItem = radioGroupRef.current?.querySelector(
            `div:nth-child(${index})`,
          ) as HTMLElement;
          if (prevItem) {
            prevItem.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
            });
          }
        } else {
          inputRef.current?.focus();
          setHighlightedIndex(-1);
        }
        break;
      case 'Enter': {
        e.preventDefault();
        const itemToSelect = filteredItems[index];
        if (itemToSelect) {
          handleItemSelect(itemToSelect);
        }
        break;
      }
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.focus();
        break;
    }
  };

  const handleItemSelect = (item: DataItem) => {
    const newSelectedPills = [...selectedPills, item.name];
    setSelectedPills(newSelectedPills);
    setInputValue('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (onValueChange) {
      onValueChange(newSelectedPills);
    }

    // Blur the input to unfocus after selection
    inputRef.current?.blur();
  };

  const handlePillRemove = (pillToRemove: string) => {
    const newSelectedPills = selectedPills.filter((pill) => pill !== pillToRemove);
    setSelectedPills(newSelectedPills);
    if (onValueChange) {
      onValueChange(newSelectedPills);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <div className="flex min-h-12 flex-wrap gap-2">
        {(value || selectedPills).map((pill) => (
          <Badge
            key={pill}
            variant="secondary"
            onClick={() => !disabled && handlePillRemove(pill)}
            className={cn(
              'group gap-1 hover:cursor-pointer',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            {pill}
            {!disabled && (
              <button
                type="button"
                onClick={() => handlePillRemove(pill)}
                className="text-muted-foreground group-hover:text-foreground appearance-none transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </Badge>
        ))}
        <PopoverAnchor asChild>
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              // Show dropdown if there are unselected items or if typing
              const hasUnselectedItems = data.some(
                (item) => !(value || selectedPills).includes(item.name),
              );
              if (hasUnselectedItems || inputValue.trim()) {
                setIsOpen(true);
              }
            }}
            placeholder={
              isOpen && !inputValue ? 'Type to search or press Enter to add custom...' : placeholder
            }
            disabled={disabled}
            data-testid={dataTestId}
          />
        </PopoverAnchor>
      </div>

      <PopoverContent
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <div className="max-h-[200px] overflow-y-auto">
          {/* Show filtered items */}
          {filteredItems.length > 0 && (
            <div
              ref={radioGroupRef}
              role="radiogroup"
              aria-label="Pill options"
              onKeyDown={(e) => handleRadioKeyDown(e, highlightedIndex)}
            >
              {filteredItems.map((item, index) => (
                <div
                  key={item.id || item.value || item.name}
                  className={cn(
                    'hover:bg-accent/70 focus:bg-accent focus:text-accent-foreground relative flex cursor-pointer items-center gap-2 rounded-sm text-sm outline-hidden transition-colors select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0',
                    highlightedIndex === index && 'bg-accent',
                  )}
                  onClick={() => handleItemSelect(item)}
                  data-testid={`${dataTestId}-option-${item.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                >
                  <input
                    type="radio"
                    id={`pill-${item.name}`}
                    name="pill-selection"
                    value={item.name}
                    className="sr-only"
                    checked={highlightedIndex === index}
                    onChange={() => handleItemSelect(item)}
                    data-testid={`pill-option-${index}`}
                  />
                  <label
                    htmlFor={`pill-${item.name}`}
                    className="flex w-full cursor-pointer items-center px-2 py-1.5"
                  >
                    {item.name}
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* Show custom value hint when typing with no matches */}
          {inputValue.trim() && filteredItems.length === 0 && (
            <div
              className="border-t px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => {
                if (inputValue.trim()) {
                  handleItemSelect({ name: inputValue.trim() });
                }
              }}
            >
              <p className="text-xs text-muted-foreground">
                Press{' '}
                <kbd className="inline-flex h-4 select-none items-center rounded border bg-muted px-1 font-mono text-[10px] font-medium">
                  Enter
                </kbd>{' '}
                to add "{inputValue.trim()}"
              </p>
            </div>
          )}

          {/* Show hint at bottom when there are matches */}
          {inputValue.trim() && filteredItems.length > 0 && (
            <div className="border-t px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Press{' '}
                <kbd className="inline-flex h-4 select-none items-center rounded border bg-muted px-1 font-mono text-[10px] font-medium">
                  Enter
                </kbd>{' '}
                to add "{inputValue.trim()}"
              </p>
            </div>
          )}

          {/* Show empty state */}
          {!inputValue.trim() && filteredItems.length === 0 && (
            <div className="p-3 text-center text-sm text-muted-foreground">
              Type to search or add custom values
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
