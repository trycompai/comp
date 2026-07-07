import type { ReactNode } from 'react';

/**
 * Shared mock factories for ISMS client component tests. The design-system,
 * icon, and shared-component surfaces are identical across every ISMS register
 * test, so the factory bodies live here once. Each test calls these inside its
 * own `vi.mock(..., factory)` so the per-module hoisting still applies.
 */

export function ismsDesignSystemMock() {
  return {
    Alert: ({ children, title }: { children?: ReactNode; title?: ReactNode }) => (
      <div role="alert">
        {title}
        {children}
      </div>
    ),
    AlertTitle: ({ children }: { children: ReactNode }) => <strong>{children}</strong>,
    AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
    Button: ({
      children,
      onClick,
      disabled,
      'aria-label': ariaLabel,
    }: {
      children?: ReactNode;
      onClick?: () => void;
      disabled?: boolean;
      'aria-label'?: string;
    }) => (
      <button onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
        {children}
      </button>
    ),
    Grid: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Heading: ({ children }: { children: ReactNode }) => <h4>{children}</h4>,
    Item: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    ItemGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    ItemMedia: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    ItemContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    ItemTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    ItemActions: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
    DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
    Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
    Section: ({ title, children }: { title?: ReactNode; children: ReactNode }) => (
      <section>
        {title ? <h2>{title}</h2> : null}
        {children}
      </section>
    ),
    Stack: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Spinner: () => <span role="status" aria-label="Loading" />,
    Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SelectValue: () => <span />,
    Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
    TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
    TableCell: ({ children }: { children: ReactNode }) => <td>{children}</td>,
    TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
    TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
    TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
    Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
    Textarea: (props: React.ComponentProps<'textarea'>) => <textarea {...props} />,
    HStack: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    Field: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    FieldError: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  };
}

export function ismsIconsMock() {
  const Icon = () => <span />;
  return {
    Add: () => <span data-testid="add-icon" />,
    Checkmark: Icon,
    CloseOutline: Icon,
    Document: Icon,
    Download: Icon,
    Edit: Icon,
    Time: Icon,
    Flag: Icon,
    ListChecked: Icon,
    MachineLearningModel: Icon,
    Renew: Icon,
    TrashCan: Icon,
    UserMultiple: Icon,
    WarningAlt: Icon,
  };
}

export function ismsSharedMock() {
  return {
    IsmsEmptyState: ({
      title,
      description,
    }: {
      title: ReactNode;
      description?: ReactNode;
    }) => (
      <div>
        <p>{title}</p>
        {description ? <p>{description}</p> : null}
      </div>
    ),
    IsmsPageHeader: ({
      clause,
      title,
      backHref,
      actions,
    }: {
      clause: string;
      title: string;
      backHref?: string;
      actions?: ReactNode;
    }) => (
      <div data-testid="page-header">
        {backHref ? <a href={backHref}>ISMS</a> : null}
        <h1>{`${clause} ${title}`}</h1>
        {actions}
      </div>
    ),
    IsmsRegisterShell: ({
      title,
      count,
      actions,
      emptyTitle,
      emptyDescription,
      children,
      footer,
    }: {
      title: ReactNode;
      count: number;
      actions?: ReactNode;
      emptyTitle: ReactNode;
      emptyDescription: ReactNode;
      children: ReactNode;
      footer?: ReactNode;
    }) => (
      <section>
        <h3>{title}</h3>
        <span>{count}</span>
        {actions}
        {count === 0 ? (
          <div>
            <p>{emptyTitle}</p>
            <p>{emptyDescription}</p>
          </div>
        ) : (
          children
        )}
        {footer}
      </section>
    ),
    IsmsSourceBadge: ({
      source,
      derivedFrom,
    }: {
      source: 'derived' | 'manual';
      derivedFrom?: string | null;
    }) => (
      <div>
        <span>{source === 'derived' ? 'Auto-derived' : 'Manual'}</span>
        {derivedFrom && <span>{derivedFrom}</span>}
      </div>
    ),
    IsmsRowActions: ({
      onSave,
      onDelete,
      deleteLabel,
    }: {
      onSave: () => void;
      onDelete: () => void;
      deleteLabel: string;
    }) => (
      <div>
        <button type="button" onClick={onSave}>
          Save
        </button>
        <button type="button" aria-label={deleteLabel} onClick={onDelete} />
      </div>
    ),
    IsmsRegisterCard: ({
      header,
      headerEnd,
      children,
    }: {
      header: ReactNode;
      headerEnd?: ReactNode;
      children: ReactNode;
    }) => (
      <div>
        {header}
        {headerEnd}
        {children}
      </div>
    ),
    IsmsRegisterField: ({ label, children }: { label: string; children: ReactNode }) => (
      <div>
        <span>{label}</span>
        <span>{children}</span>
      </div>
    ),
    IsmsFieldLabel: ({ label, children }: { label: string; children: ReactNode }) => (
      <div>
        <span>{label}</span>
        {children}
      </div>
    ),
    IsmsCardActions: ({
      isEditing,
      onEdit,
      onSave,
      onCancel,
      onDelete,
      editLabel,
      deleteLabel,
    }: {
      isEditing: boolean;
      onEdit: () => void;
      onSave: () => void;
      onCancel: () => void;
      onDelete: () => void;
      editLabel: string;
      deleteLabel: string;
    }) =>
      isEditing ? (
        <div>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" onClick={onSave}>
            Save
          </button>
        </div>
      ) : (
        <div>
          <button type="button" aria-label={editLabel} onClick={onEdit}>
            Edit
          </button>
          <button type="button" aria-label={deleteLabel} onClick={onDelete} />
        </div>
      ),
    IsmsAddCard: ({ addLabel }: { addLabel: string; children: unknown }) => (
      <div>
        <button type="button">{addLabel}</button>
      </div>
    ),
  };
}
