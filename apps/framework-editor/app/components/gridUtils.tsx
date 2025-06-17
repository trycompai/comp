import type { CellProps, Column } from 'react-datasheet-grid';

// Helper function to format dates in a friendly way
export const formatFriendlyDate = (date: Date | string | number | null | undefined): string => {
  if (date === null || date === undefined) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date'; // Handle invalid date objects
  return new Intl.DateTimeFormat(undefined, {
    // 'undefined' uses the browser's default locale
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
};

// Custom base column configuration for displaying friendly dates
export const friendlyDateColumnBase: Partial<Column<Date | null, any, string>> = {
  component: ({ rowData }: CellProps<Date | null, any>) => (
    <div
      style={{
        padding: '5px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
      }}
      title={formatFriendlyDate(rowData)}
    >
      {formatFriendlyDate(rowData)}
    </div>
  ),
  // copyValue can be added if needed: ({ rowData }) => formatFriendlyDate(rowData),
};
