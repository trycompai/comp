import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Stub the design-system Select family so we can assert how it is configured.
// SelectContent exposes its `portal` prop as a data attribute — this is the
// crux of the fix: the DS Select is built on @base-ui/react and portals to
// document.body by default, which escapes the Radix (@trycompai/ui) modal
// Dialog it is rendered inside (ManageIntegrationDialog) and makes the dropdown
// unclickable ("insta-closes"). Rendering inline (portal={false}) keeps the
// popup inside the modal's pointer-events/focus scope.
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
  SelectContent: ({ children, portal }: { children: React.ReactNode; portal?: boolean }) => (
    <div data-testid="select-content" data-portal={String(portal)}>
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

describe('ConnectionVariablesFields dropdown portal behavior', () => {
  it('renders a select-type dropdown inline (portal={false}) so it survives inside a Radix modal', () => {
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
    expect(content).toHaveAttribute('data-portal', 'false');
    // Options still render
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('renders a boolean-type dropdown inline (portal={false})', () => {
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
    expect(content).toHaveAttribute('data-portal', 'false');
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('does not portal any dropdown to document.body for mixed select + boolean fields', () => {
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
      expect(content).toHaveAttribute('data-portal', 'false');
    }
  });
});
