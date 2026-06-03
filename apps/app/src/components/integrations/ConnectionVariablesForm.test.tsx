import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Stub the design-system Select family so we can assert how it is configured.
// SelectContent forwards its `style` to the popup — this is the crux of the fix:
// the DS Select is built on @base-ui/react and portals its popup to document.body.
// Inside the Radix (@trycompai/ui) modal Dialog it is rendered in (ManageIntegrationDialog),
// Radix sets `body { pointer-events: none }`, so the portaled popup is unclickable and
// the open is cancelled ("insta-closes"). pointer-events:auto re-enables the popup while
// keeping it portaled (so it stays anchored to the trigger instead of being mis-positioned
// by the dialog's CSS transform, as rendering inline would do).
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
    style,
  }: {
    children: React.ReactNode;
    style?: React.CSSProperties;
  }) => (
    <div data-testid="select-content" style={style}>
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

import { ConnectionVariablesFields, type ConnectionVariable } from './ConnectionVariablesForm';

const noop = () => {};

function renderFields(variables: ConnectionVariable[]) {
  return render(
    <ConnectionVariablesFields
      variables={variables}
      variableValues={{}}
      setVariableValues={noop}
      dynamicOptions={{}}
      loadingOptions={{}}
      fetchOptions={noop}
    />,
  );
}

describe('ConnectionVariablesFields dropdown clickability inside a modal', () => {
  it('renders a select-type dropdown popup with pointer-events:auto so it works inside a Radix modal', () => {
    renderFields([
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
    ]);

    const content = screen.getByTestId('select-content');
    expect(content).toHaveStyle({ pointerEvents: 'auto' });
    // Options still render
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('renders a boolean-type dropdown popup with pointer-events:auto', () => {
    renderFields([
      {
        id: 'enabled',
        label: 'Enabled',
        type: 'boolean',
        required: false,
        default: false,
      },
    ]);

    const content = screen.getByTestId('select-content');
    expect(content).toHaveStyle({ pointerEvents: 'auto' });
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('applies pointer-events:auto to every dropdown for mixed select + boolean fields', () => {
    renderFields([
      {
        id: 'mode',
        label: 'Mode',
        type: 'select',
        required: false,
        options: [{ value: 'all', label: 'All' }],
      },
      { id: 'enabled', label: 'Enabled', type: 'boolean', required: false },
    ]);

    const contents = screen.getAllByTestId('select-content');
    expect(contents).toHaveLength(2);
    for (const content of contents) {
      expect(content).toHaveStyle({ pointerEvents: 'auto' });
    }
  });
});
