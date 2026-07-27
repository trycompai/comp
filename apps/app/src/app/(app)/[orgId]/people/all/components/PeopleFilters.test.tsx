import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PeopleFilters } from './PeopleFilters';

const noop = vi.fn();

function renderFilters(overrides: Partial<Parameters<typeof PeopleFilters>[0]> = {}) {
  return render(
    <PeopleFilters
      statusFilter=""
      hasOffboardFilter={false}
      onStatusChange={noop}
      roleFilter=""
      onRoleChange={noop}
      onboardFrom={undefined}
      onboardTo={undefined}
      onOnboardApply={noop}
      onOnboardClear={noop}
      offboardFrom={undefined}
      offboardTo={undefined}
      onOffboardApply={noop}
      onOffboardClear={noop}
      {...overrides}
    />,
  );
}

describe('PeopleFilters', () => {
  it('shows no count badge or chips when nothing is filtered', () => {
    renderFilters();
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.queryByText(/Status:/)).not.toBeInTheDocument();
  });

  it('shows the active count and a removable chip per applied filter', () => {
    const onStatusChange = vi.fn();
    renderFilters({
      statusFilter: 'deactivated',
      roleFilter: 'admin',
      onStatusChange,
    });

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Status: Deactivated')).toBeInTheDocument();
    expect(screen.getByText('Role: Admin')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Remove filter: Status: Deactivated'));
    expect(onStatusChange).toHaveBeenCalledWith(null);
  });

  it('shows a date chip that clears via its remove button', () => {
    const onOnboardClear = vi.fn();
    renderFilters({ onboardFrom: new Date('2026-06-01'), onOnboardClear });

    const chip = screen.getByText(/Onboarded from/);
    expect(chip).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Remove filter: Onboarded/));
    expect(onOnboardClear).toHaveBeenCalled();
  });
});
