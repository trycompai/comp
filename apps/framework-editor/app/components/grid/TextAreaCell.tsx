import React, { useEffect, useRef, useState } from 'react';
import { type Column } from 'react-datasheet-grid';
import ReactDOM from 'react-dom';

interface TextAreaCellProps {
  active: boolean;
  focus: boolean;
  rowData: string | null;
  setRowData: (value: string | null) => void;
  stopEditing?: (opts?: { nextRow?: boolean }) => void;
  disabled?: boolean;
}

const TextAreaCellComponent: React.FC<TextAreaCellProps> = ({
  active,
  focus,
  rowData,
  setRowData,
  stopEditing,
  disabled,
}) => {
  const cellRef = useRef<HTMLDivElement>(null);
  const [isPortalVisible, setIsPortalVisible] = useState(false);
  const [internalValue, setInternalValue] = useState(rowData || '');
  const [popoverStyles, setPopoverStyles] = useState<React.CSSProperties>({});

  // Update internal value when rowData changes
  useEffect(() => {
    setInternalValue(rowData || '');
  }, [rowData]);

  // Handle portal visibility
  useEffect(() => {
    if (focus && cellRef.current && !disabled) {
      const rect = cellRef.current.getBoundingClientRect();
      setPopoverStyles({
        position: 'absolute',
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        minWidth: Math.max(rect.width, 250),
        maxWidth: Math.max(rect.width * 1.5, 400),
        backgroundColor: 'white',
        border: '1px solid #dee2e6',
        borderRadius: '2px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1050,
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        height: '200px',
      });
      setIsPortalVisible(true);
    } else {
      setIsPortalVisible(false);
    }
  }, [focus, disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    setRowData(newValue || null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setInternalValue(rowData || '');
      setRowData(rowData);
      stopEditing?.({ nextRow: false });
    }
    // Let Enter create newlines naturally
    e.stopPropagation();
  };

  return (
    <>
      <div
        ref={cellRef}
        style={{
          width: '100%',
          height: '100%',
          padding: '0 8px',
          display: 'flex',
          alignItems: 'center',
          cursor: disabled ? 'not-allowed' : 'text',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            width: '100%',
          }}
        >
          {rowData || (active ? '' : <span style={{ color: '#999' }}>Empty</span>)}
        </span>
      </div>

      {isPortalVisible &&
        ReactDOM.createPortal(
          <div style={popoverStyles} onMouseDown={(e) => e.stopPropagation()}>
            <textarea
              value={internalValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                height: '100%',
                border: '1px solid #ced4da',
                borderRadius: '2px',
                padding: '8px',
                fontFamily: 'inherit',
                fontSize: '0.875em',
                resize: 'none',
                overflowY: 'auto',
                boxSizing: 'border-box',
              }}
              autoFocus
            />
          </div>,
          document.body,
        )}
    </>
  );
};

// Export a column definition that works with keyColumn
export const textAreaColumn: Column<string | null, any, string> = {
  component: TextAreaCellComponent as any,
  deleteValue: () => null,
  copyValue: ({ rowData }) => rowData ?? '',
  pasteValue: ({ value }) => value || null,
  minWidth: 150,
  keepFocus: true,
  disableKeys: true, // Prevent grid from intercepting Enter key
};
