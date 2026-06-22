import type { FrameworkEditorRequirement } from '@db';
import { describe, expect, it } from 'vitest';
import type { FrameworkInstanceWithControls } from '@/lib/types/framework';
import {
  buildControlItems,
  buildRequirementMap,
  compareRequirementsByOrder,
  getStatusBadge,
  groupByFamily,
  groupRequirementsByFamily,
  UNCATEGORIZED_FAMILY,
  type ControlItem,
  type RequirementItem,
} from './framework-controls-shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ControlEntry = FrameworkInstanceWithControls['controls'][number];

function makeControlItem(overrides: {
  id?: string;
  name: string;
  controlFamily?: string | null;
}): ControlItem {
  return {
    control: {
      id: overrides.id ?? `ctrl_${overrides.name}`,
      name: overrides.name,
      controlFamily: overrides.controlFamily ?? null,
      policies: [],
      requirementsMapped: [],
    } as unknown as ControlEntry,
    requirements: [],
  };
}

function makeRequirement(overrides: Partial<FrameworkEditorRequirement> = {}) {
  return {
    id: overrides.id ?? 'req_1',
    frameworkId: 'fw_1',
    name: overrides.name ?? 'Requirement 1',
    identifier: overrides.identifier ?? 'R-1',
    description: 'desc',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as FrameworkEditorRequirement;
}

// ---------------------------------------------------------------------------
// getStatusBadge
// ---------------------------------------------------------------------------

describe('getStatusBadge', () => {
  it('returns Satisfied / default for completed', () => {
    expect(getStatusBadge('completed')).toEqual({
      label: 'Satisfied',
      variant: 'default',
    });
  });

  it('returns In Progress / secondary for in_progress', () => {
    expect(getStatusBadge('in_progress')).toEqual({
      label: 'In Progress',
      variant: 'secondary',
    });
  });

  it('returns Not Relevant / secondary for not_relevant', () => {
    expect(getStatusBadge('not_relevant')).toEqual({
      label: 'Not Relevant',
      variant: 'secondary',
    });
  });

  it('returns Not Started / destructive for not_started', () => {
    expect(getStatusBadge('not_started')).toEqual({
      label: 'Not Started',
      variant: 'destructive',
    });
  });

  it('returns Not Started / destructive for any unrecognized status', () => {
    expect(getStatusBadge('draft')).toEqual({
      label: 'Not Started',
      variant: 'destructive',
    });
  });
});

// ---------------------------------------------------------------------------
// buildRequirementMap
// ---------------------------------------------------------------------------

describe('buildRequirementMap', () => {
  it('builds a map keyed by requirement id', () => {
    const reqs = [
      makeRequirement({ id: 'r1', name: 'Privacy', identifier: 'cc1-1' }),
      makeRequirement({ id: 'r2', name: 'Security', identifier: 'cc2-1' }),
    ];

    const map = buildRequirementMap(reqs);

    expect(map.size).toBe(2);
    expect(map.get('r1')).toEqual({ id: 'r1', name: 'Privacy', identifier: 'cc1-1' });
    expect(map.get('r2')).toEqual({ id: 'r2', name: 'Security', identifier: 'cc2-1' });
  });

  it('defaults identifier to empty string when null', () => {
    const reqs = [makeRequirement({ id: 'r1', identifier: null as unknown as string })];
    const map = buildRequirementMap(reqs);

    expect(map.get('r1')?.identifier).toBe('');
  });

  it('returns empty map for empty input', () => {
    expect(buildRequirementMap([]).size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildControlItems
// ---------------------------------------------------------------------------

describe('buildControlItems', () => {
  it('maps controls to items with resolved requirements', () => {
    const reqMap = new Map([
      ['r1', { id: 'r1', name: 'Privacy', identifier: 'cc1-1' }],
      ['r2', { id: 'r2', name: 'Security', identifier: 'cc2-1' }],
    ]);

    const controls = [
      {
        id: 'c1',
        name: 'Control 1',
        policies: [],
        requirementsMapped: [{ requirementId: 'r1' }, { requirementId: 'r2' }],
      },
    ] as unknown as Parameters<typeof buildControlItems>[0];

    const items = buildControlItems(controls, reqMap);

    expect(items).toHaveLength(1);
    expect(items[0].requirements).toEqual([
      { id: 'r1', name: 'Privacy', identifier: 'cc1-1' },
      { id: 'r2', name: 'Security', identifier: 'cc2-1' },
    ]);
  });

  it('filters out requirementIds that are not in the map', () => {
    const reqMap = new Map([['r1', { id: 'r1', name: 'Privacy', identifier: 'cc1-1' }]]);

    const controls = [
      {
        id: 'c1',
        name: 'Control 1',
        policies: [],
        requirementsMapped: [{ requirementId: 'r1' }, { requirementId: 'r_missing' }],
      },
    ] as unknown as Parameters<typeof buildControlItems>[0];

    const items = buildControlItems(controls, reqMap);

    expect(items[0].requirements).toHaveLength(1);
    expect(items[0].requirements[0].id).toBe('r1');
  });

  it('handles controls with no requirementsMapped', () => {
    const controls = [
      { id: 'c1', name: 'Control 1', policies: [], requirementsMapped: undefined },
    ] as unknown as Parameters<typeof buildControlItems>[0];

    const items = buildControlItems(controls, new Map());

    expect(items[0].requirements).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// groupByFamily
// ---------------------------------------------------------------------------

describe('groupByFamily', () => {
  it('groups controls by controlFamily field', () => {
    const items = [
      makeControlItem({ name: 'C1', controlFamily: 'Access Control' }),
      makeControlItem({ name: 'C2', controlFamily: 'Audit' }),
      makeControlItem({ name: 'C3', controlFamily: 'Access Control' }),
    ];

    const groups = groupByFamily(items);

    expect(groups).toHaveLength(2);
    expect(groups[0].family).toBe('Access Control');
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].family).toBe('Audit');
    expect(groups[1].items).toHaveLength(1);
  });

  it('sorts groups alphabetically by family name', () => {
    const items = [
      makeControlItem({ name: 'C1', controlFamily: 'Zoning' }),
      makeControlItem({ name: 'C2', controlFamily: 'Access Control' }),
      makeControlItem({ name: 'C3', controlFamily: 'Media Protection' }),
    ];

    const families = groupByFamily(items).map((g) => g.family);

    expect(families).toEqual(['Access Control', 'Media Protection', 'Zoning']);
  });

  it('sorts controls within each group by name', () => {
    const items = [
      makeControlItem({ name: 'Zulu', controlFamily: 'Access Control' }),
      makeControlItem({ name: 'Alpha', controlFamily: 'Access Control' }),
      makeControlItem({ name: 'Mike', controlFamily: 'Access Control' }),
    ];

    const names = groupByFamily(items)[0].items.map((i) => i.control.name);

    expect(names).toEqual(['Alpha', 'Mike', 'Zulu']);
  });

  it('places controls without a family into "Other" at the bottom', () => {
    const items = [
      makeControlItem({ name: 'C1', controlFamily: 'Audit' }),
      makeControlItem({ name: 'C2', controlFamily: null }),
      makeControlItem({ name: 'C3', controlFamily: undefined }),
    ];

    const groups = groupByFamily(items);

    expect(groups).toHaveLength(2);
    expect(groups[0].family).toBe('Audit');
    expect(groups[1].family).toBe(UNCATEGORIZED_FAMILY);
    expect(groups[1].items).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(groupByFamily([])).toEqual([]);
  });

  it('returns single group when all controls share one family', () => {
    const items = [
      makeControlItem({ name: 'C1', controlFamily: 'Risk Assessment' }),
      makeControlItem({ name: 'C2', controlFamily: 'Risk Assessment' }),
    ];

    const groups = groupByFamily(items);

    expect(groups).toHaveLength(1);
    expect(groups[0].family).toBe('Risk Assessment');
  });

  it('returns single "Other" group when no controls have families', () => {
    const items = [
      makeControlItem({ name: 'C1', controlFamily: null }),
      makeControlItem({ name: 'C2', controlFamily: undefined }),
    ];

    const groups = groupByFamily(items);

    expect(groups).toHaveLength(1);
    expect(groups[0].family).toBe(UNCATEGORIZED_FAMILY);
    expect(groups[0].items).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// compareRequirementsByOrder (FRAME-18)
// ---------------------------------------------------------------------------

function reqItem(overrides: {
  name?: string;
  identifier?: string;
  sortOrder?: number | null;
  requirementFamily?: string | null;
}): RequirementItem {
  return makeRequirement(overrides as Partial<FrameworkEditorRequirement>) as unknown as RequirementItem;
}

describe('compareRequirementsByOrder', () => {
  const orderOf = (sortOrders: Array<number | null>) =>
    sortOrders
      .map((sortOrder, i) => reqItem({ identifier: `R-${i}`, sortOrder }))
      .sort(compareRequirementsByOrder)
      .map((r) => r.sortOrder ?? null);

  it('orders numbered requirements ascending', () => {
    expect(orderOf([3, 1, 2])).toEqual([1, 2, 3]);
  });

  it('places unset (null) rows after numbered rows', () => {
    expect(orderOf([null, 2, null, 1])).toEqual([1, 2, null, null]);
  });

  it('treats undefined sortOrder the same as null (sorts last)', () => {
    const items = [
      reqItem({ identifier: 'R-2', sortOrder: undefined }),
      reqItem({ identifier: 'R-1', sortOrder: 5 }),
    ];
    expect(items.sort(compareRequirementsByOrder).map((r) => r.identifier)).toEqual([
      'R-1',
      'R-2',
    ]);
  });

  it('falls back to numeric identifier order for unset rows', () => {
    const items = [
      reqItem({ identifier: 'R-10', sortOrder: null }),
      reqItem({ identifier: 'R-2', sortOrder: null }),
    ];
    expect(items.sort(compareRequirementsByOrder).map((r) => r.identifier)).toEqual([
      'R-2',
      'R-10',
    ]);
  });

  it('falls back to identifier when two rows share a sortOrder', () => {
    const items = [
      reqItem({ identifier: 'B', sortOrder: 1 }),
      reqItem({ identifier: 'A', sortOrder: 1 }),
    ];
    expect(items.sort(compareRequirementsByOrder).map((r) => r.identifier)).toEqual(['A', 'B']);
  });
});

// ---------------------------------------------------------------------------
// groupRequirementsByFamily (FRAME-18)
// ---------------------------------------------------------------------------

describe('groupRequirementsByFamily', () => {
  it('orders families by their lowest sortOrder (NIST CSF canonical order)', () => {
    // Canonical NIST CSF order is GV → ID → PR → DE → RS → RC, which is NOT
    // alphabetical. Numbering requirements drives the family order.
    const items = [
      reqItem({ identifier: 'PR.AA', sortOrder: 30, requirementFamily: 'Protect' }),
      reqItem({ identifier: 'GV.OC', sortOrder: 10, requirementFamily: 'Govern' }),
      reqItem({ identifier: 'ID.AM', sortOrder: 20, requirementFamily: 'Identify' }),
      reqItem({ identifier: 'DE.CM', sortOrder: 40, requirementFamily: 'Detect' }),
    ];

    const families = groupRequirementsByFamily(items).map((g) => g.family);

    expect(families).toEqual(['Govern', 'Identify', 'Protect', 'Detect']);
  });

  it('sorts requirements within a family by sortOrder', () => {
    const items = [
      reqItem({ identifier: 'GV.B', sortOrder: 12, requirementFamily: 'Govern' }),
      reqItem({ identifier: 'GV.A', sortOrder: 11, requirementFamily: 'Govern' }),
    ];

    const order = groupRequirementsByFamily(items)[0].items.map((r) => r.identifier);

    expect(order).toEqual(['GV.A', 'GV.B']);
  });

  it('falls back to alphabetical family order when no sortOrder is set', () => {
    // Every existing framework today has null sortOrder — behavior is unchanged.
    const items = [
      reqItem({ identifier: 'Z-1', sortOrder: null, requirementFamily: 'Zoning' }),
      reqItem({ identifier: 'A-1', sortOrder: null, requirementFamily: 'Access Control' }),
    ];

    const families = groupRequirementsByFamily(items).map((g) => g.family);

    expect(families).toEqual(['Access Control', 'Zoning']);
  });
});
