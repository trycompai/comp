import { describe, expect, it } from 'bun:test';
import { expandStatRows, hidOf, normalizeHid, pageRows } from '../client';

describe('msp360-rmm client parsing', () => {
  it('normalizes braced and mixed-case hids', () => {
    expect(normalizeHid('{3C934B6B-A47B-43F7-A458-C4D5610468B7}')).toBe(
      '3c934b6b-a47b-43f7-a458-c4d5610468b7',
    );
    expect(hidOf({ header: { hid: '{ABC}' } })).toBe('abc');
  });

  it('reads page rows from items (live RMM shape)', () => {
    const { rows, total } = pageRows({ items: [{ hid: 'h1' }], total: 1, pageNumber: 1, pageSize: 100 });
    expect(rows).toHaveLength(1);
    expect(total).toBe(1);
  });

  it('flattens header/data envelopes onto plugin rows', () => {
    const expanded = expandStatRows([
      {
        header: { hid: '{H1}', computerName: 'hetzner' },
        data: [{ osName: 'Debian', network: { ip4Address: '10.0.0.1', macAddress: 'aa' } }],
      },
    ]);
    expect(expanded).toHaveLength(1);
    expect(expanded[0]?.hid).toBe('h1');
    expect(expanded[0]?.computerName).toBe('hetzner');
    expect(expanded[0]?.osName).toBe('Debian');
    expect(expanded[0]?.ip).toBe('10.0.0.1');
  });
});
