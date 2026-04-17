import { describe, expect, it } from 'vitest';
import { orderServicesForConnectionGrid } from './connection-services-display-order';

const manifest = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Bravo' },
  { id: 'c', name: 'Charlie' },
  { id: 'd', name: 'Delta' },
];

describe('orderServicesForConnectionGrid', () => {
  it('treats missing connectionServices as none enabled (manifest order only)', () => {
    const ordered = orderServicesForConnectionGrid({
      manifestServices: manifest,
      connectionServices: undefined,
      search: '',
    });

    expect(ordered.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('places enabled services before disabled, preserving manifest order in each group', () => {
    const ordered = orderServicesForConnectionGrid({
      manifestServices: manifest,
      connectionServices: [
        { id: 'a', enabled: false },
        { id: 'b', enabled: true },
        { id: 'c', enabled: true },
        { id: 'd', enabled: false },
      ],
      search: '',
    });

    expect(ordered.map((s) => s.id)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('places tailEnabledIds after manifest-ordered enabled services', () => {
    const ordered = orderServicesForConnectionGrid({
      manifestServices: manifest,
      connectionServices: [
        { id: 'a', enabled: true },
        { id: 'b', enabled: true },
        { id: 'c', enabled: true },
        { id: 'd', enabled: false },
      ],
      search: '',
      tailEnabledIds: ['b'],
    });

    expect(ordered.map((s) => s.id)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('treats tail ids as enabled for sorting before server reflects the toggle', () => {
    const ordered = orderServicesForConnectionGrid({
      manifestServices: manifest,
      connectionServices: [
        { id: 'a', enabled: true },
        { id: 'b', enabled: false },
        { id: 'c', enabled: true },
        { id: 'd', enabled: false },
      ],
      search: '',
      tailEnabledIds: ['b'],
    });

    expect(ordered.map((s) => s.id)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('filters by search then applies enabled-first within matching rows', () => {
    const svc = [
      { id: 'a', name: 'Service One' },
      { id: 'b', name: 'Service Two' },
    ];
    const ordered = orderServicesForConnectionGrid({
      manifestServices: svc,
      connectionServices: [
        { id: 'a', enabled: false },
        { id: 'b', enabled: true },
      ],
      search: 'service',
    });

    expect(ordered.map((s) => s.id)).toEqual(['b', 'a']);
  });
});
