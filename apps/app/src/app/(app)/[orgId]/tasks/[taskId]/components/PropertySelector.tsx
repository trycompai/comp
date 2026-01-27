import { cn } from '@comp/ui/cn';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@comp/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@comp/ui/popover';
import { Check } from 'lucide-react';
import { ReactNode, useState } from 'react';

export interface PropertySelectorProps<T> {
  trigger: ReactNode;
  value: string | null | undefined;
  options: T[];
  getKey: (option: T) => string;
  renderOption: (option: T) => ReactNode;
  onSelect: (selectedValue: string | null) => void;
  searchPlaceholder?: string;
  emptyText?: string;
  contentWidth?: string;
  disabled?: boolean;
  allowUnassign?: boolean; // Specific flag for assignee-like scenarios
  unassignValue?: string;
  unassignLabel?: string;
  getSearchValue?: (option: T) => string; // Optional function to get searchable text for filtering
  showCheck?: boolean; // Whether to show check icon (default: true)
}

export function PropertySelector<T>({
  trigger,
  value,
  options,
  getKey,
  renderOption,
  onSelect,
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  contentWidth = 'w-56', // Default width
  disabled = false,
  allowUnassign = false,
  unassignValue = 'unassigned',
  unassignLabel = 'Unassigned',
  getSearchValue,
  showCheck = true,
}: PropertySelectorProps<T>) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className={`${contentWidth} p-0`} side="left">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {/* Optional Unassign Item */}
              {allowUnassign && (
                <CommandItem
                  key={unassignValue}
                  value={unassignValue} // Use a consistent value for filtering
                  onSelect={() => {
                    onSelect(null); // Pass null for unassignment
                    setPopoverOpen(false);
                  }}
                  className="flex items-center cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {showCheck && (
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value === null || value === undefined ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  )}
                  <span className="text-muted-foreground flex-1">{unassignLabel}</span>
                </CommandItem>
              )}
              {/* Dynamic Options */}
              {options.map((option) => {
                const key = getKey(option);
                // Use searchable value if provided, otherwise fall back to key
                const searchValue = getSearchValue ? getSearchValue(option) : key;
                return (
                  <CommandItem
                    key={key}
                    value={searchValue} // Used for filtering/searching
                    onSelect={() => {
                      onSelect(key); // Always use the key for selection
                      setPopoverOpen(false);
                    }}
                    className="flex items-center cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {showCheck && (
                      <Check
                        className={cn('mr-2 h-4 w-4 shrink-0', value === key ? 'opacity-100' : 'opacity-0')}
                      />
                    )}
                    <div className={cn('flex-1 min-w-0 overflow-hidden', !showCheck && 'w-full')}>
                      {renderOption(option)}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
