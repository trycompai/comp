import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Stub the design-system Select family so we can assert how its overlay is configured.
// The affected modal is a legacy Radix dialog while DS Select is Base UI; rendering
// the popup inline keeps it inside the dialog focus boundary.
vi.mock('@trycompai/design-system', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
  Spinner: () => <span data-testid="spinner" />,
  Select: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="ds-select">{children}</div>
  ),
  SelectTrigger: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <div data-trigger-id={id}>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({
    children,
    portal,
    alignItemWithTrigger,
    style,
  }: {
    children: React.ReactNode;
    portal?: boolean;
    alignItemWithTrigger?: boolean;
    style?: React.CSSProperties;
  }) => (
    <div
      data-testid="select-content"
      data-portal={portal === undefined ? undefined : String(portal)}
      data-align-item-with-trigger={
        alignItemWithTrigger === undefined ? undefined : String(alignItemWithTrigger)
      }
      style={style}
    >
      {children}
    </div>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid="select-item" data-value={value}>
      {children}
    </div>
  ),
}));

// The multi-select field pulls in @trycompai/ui MultipleSelector — not relevant
// to these select/boolean dropdown tests, so stub it out.
vi.mock('./ConnectionVariableMultiSelect', () => ({
  ConnectionVariableMultiSelect: () => <div data-testid="multi-select" />,
}));

import {
  ConnectionVariablesFields,
  type ConnectionVariable,
  type ConnectionVariableSelectContentOptions,
} from './ConnectionVariablesForm';

const noop = () => {};

function renderFields(
  variables: ConnectionVariable[],
  selectContentOptions?: ConnectionVariableSelectContentOptions,
) {
  return render(
    <ConnectionVariablesFields
      variables={variables}
      variableValues={{}}
      setVariableValues={noop}
      dynamicOptions={{}}
      loadingOptions={{}}
      fetchOptions={noop}
      selectContentOptions={selectContentOptions}
    />,
  );
}

describe('ConnectionVariablesFields dropdown clickability inside a modal', () => {
  const modalSelectContentOptions = {
    portal: false,
    alignItemWithTrigger: false,
  } satisfies ConnectionVariableSelectContentOptions;

  it('renders a select-type dropdown popup inline when the legacy modal opts in', () => {
    renderFields(
      [
        {
          id: 'alert_severity_threshold',
          label: 'Fail on open alerts at severity',
          type: 'select',
          required: false,
          options: [
            { value: 'low', label: 'Low' },
            { value: 'critical', label: 'Critical' },
          ],
        },
      ],
      modalSelectContentOptions,
    );

    const content = screen.getByTestId('select-content');
    expect(content).toHaveAttribute('data-portal', 'false');
    expect(content).toHaveAttribute('data-align-item-with-trigger', 'false');
    expect(content).toHaveStyle({ pointerEvents: 'auto' });
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('renders a boolean-type dropdown popup inline when the legacy modal opts in', () => {
    renderFields(
      [
        {
          id: 'enabled',
          label: 'Enabled',
          type: 'boolean',
          required: false,
          default: false,
        },
      ],
      modalSelectContentOptions,
    );

    const content = screen.getByTestId('select-content');
    expect(content).toHaveAttribute('data-portal', 'false');
    expect(content).toHaveAttribute('data-align-item-with-trigger', 'false');
    expect(content).toHaveStyle({ pointerEvents: 'auto' });
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('applies modal overlay settings to every dropdown for mixed select + boolean fields', () => {
    renderFields(
      [
        {
          id: 'mode',
          label: 'Mode',
          type: 'select',
          required: false,
          options: [{ value: 'all', label: 'All' }],
        },
        { id: 'enabled', label: 'Enabled', type: 'boolean', required: false },
      ],
      modalSelectContentOptions,
    );

    const contents = screen.getAllByTestId('select-content');
    expect(contents).toHaveLength(2);
    for (const content of contents) {
      expect(content).toHaveAttribute('data-portal', 'false');
      expect(content).toHaveAttribute('data-align-item-with-trigger', 'false');
      expect(content).toHaveStyle({ pointerEvents: 'auto' });
    }
  });

  it('keeps the default DS portal behavior unless a caller opts into modal-safe rendering', () => {
    renderFields([
      {
        id: 'mode',
        label: 'Mode',
        type: 'select',
        required: false,
        options: [{ value: 'all', label: 'All' }],
      },
    ]);

    const content = screen.getByTestId('select-content');
    expect(content).not.toHaveAttribute('data-portal');
    expect(content).not.toHaveAttribute('data-align-item-with-trigger');
    expect(content).toHaveStyle({ pointerEvents: 'auto' });
  });
});
