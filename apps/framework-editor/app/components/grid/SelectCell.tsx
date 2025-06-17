import React, { useLayoutEffect, useRef } from 'react';
import type { CellProps, Column } from 'react-datasheet-grid';
import Select, { GroupBase, SelectInstance, StylesConfig, type SingleValue } from 'react-select';

export interface Choice {
  label: string;
  value: string;
}

export interface SelectOptions {
  choices: Choice[];
  disabled?: boolean;
  placeholder?: string;
}

// Type for the internal component's props, using CellProps from react-datasheet-grid
type SelectCellComponentProps = CellProps<string | null, SelectOptions>;

const SelectCellComponentInternal = React.memo(
  ({ active, rowData, setRowData, focus, stopEditing, columnData }: SelectCellComponentProps) => {
    const ref = useRef<SelectInstance<Choice, false, GroupBase<Choice>>>(null);

    useLayoutEffect(() => {
      if (focus) {
        ref.current?.focus();
      } else {
        ref.current?.blur();
      }
    }, [focus]);

    const currentChoice = columnData.choices.find(({ value }) => value === rowData) ?? null;

    const selectStyles: StylesConfig<Choice, false, GroupBase<Choice>> = {
      container: (provided) => ({
        ...provided,
        flex: 1,
        alignSelf: 'stretch',
        pointerEvents: focus ? undefined : 'none',
      }),
      control: (provided) => ({
        ...provided,
        height: '100%',
        border: 'none',
        boxShadow: 'none',
        background: 'transparent', // Ensure background is transparent
      }),
      indicatorSeparator: () => ({
        display: 'none', // Hide separator
      }),
      indicatorsContainer: (provided) => ({
        ...provided,
        opacity: active ? 1 : 0, // Show indicators only when active
      }),
      placeholder: (provided) => ({
        ...provided,
        opacity: active ? 1 : 0, // Show placeholder only when active
      }),
      singleValue: (provided) => ({
        // Ensure selected value is visible
        ...provided,
        opacity: 1,
      }),
      menuPortal: (provided) => ({
        // Ensure portal is above other elements
        ...provided,
        zIndex: 9999,
      }),
    };

    return (
      <Select<Choice, false, GroupBase<Choice>>
        ref={ref}
        styles={selectStyles}
        isDisabled={columnData.disabled}
        value={currentChoice}
        menuPortalTarget={document.body}
        menuIsOpen={focus} // Open menu when cell is focused
        onChange={(choice: SingleValue<Choice>) => {
          setRowData(choice ? choice.value : null);
          // Use setTimeout to allow react-select to finish its internal updates
          setTimeout(() => stopEditing?.({ nextRow: true }), 0);
        }}
        onMenuClose={() => stopEditing?.({ nextRow: false })} // Don't navigate on menu close
        options={columnData.choices}
        placeholder={columnData.placeholder ?? 'Select...'}
      />
    );
  },
);

SelectCellComponentInternal.displayName = 'SelectCellComponentInternal';

export const SelectCell = SelectCellComponentInternal;

// Factory function to create a column definition for use with keyColumn
export const selectColumnDefinition = (
  options: SelectOptions,
): Omit<Column<string | null, SelectOptions, string>, 'id'> => ({
  component: SelectCellComponentInternal,
  columnData: options,
  disableKeys: true, // react-select handles arrow keys for menu navigation
  keepFocus: true, // Important for menu portal interaction
  disabled: options.disabled,
  deleteValue: () => null, // For keyColumn, this operates on cell's value, setting it to null
  copyValue: ({ rowData }) => {
    // rowData is cell's value (string | null)
    const choice = options.choices.find((c) => c.value === rowData);
    return choice ? choice.label : ''; // Return empty string instead of null
  },
  pasteValue: ({ value: pastedStringValue }: { value: string }) => {
    // value is pasted string, return new cell value
    // If an empty string was pasted (potentially from our new copyValue logic for nulls),
    // and an empty string label doesn't map to a choice, treat as null or no change.
    if (pastedStringValue === '') {
      const emptyLabelChoice = options.choices.find((c) => c.label === '');
      return emptyLabelChoice ? emptyLabelChoice.value : null;
    }
    const choice = options.choices.find(
      (c) => c.label.toLowerCase() === pastedStringValue.toLowerCase(),
    );
    return choice ? choice.value : null; // Return value or null if no label matches
  },
});
