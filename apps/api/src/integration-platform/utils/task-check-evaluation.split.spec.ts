import {
  splitFailuresByDisposition,
  ClassifiableFailure,
} from './task-check-evaluation';

const f = (over: Partial<ClassifiableFailure>): ClassifiableFailure => ({
  connectionId: 'icn_1',
  checkId: 'chk',
  resourceId: 'res',
  ...over,
});

describe('splitFailuresByDisposition', () => {
  it('keeps a genuine compliance finding (no error signal) as effective', () => {
    const { effective, held } = splitFailuresByDisposition([f({})]);
    expect(effective).toHaveLength(1);
    expect(held).toHaveLength(0);
  });

  it('holds our-side failures (404 / unhandled endpoint)', () => {
    const { effective, held } = splitFailuresByDisposition([
      f({ httpStatus: 404 }),
      f({ errorText: 'not allowed ... scoped to' }),
    ]);
    expect(effective).toHaveLength(0);
    expect(held).toHaveLength(2);
  });

  it('holds transient failures (5xx / timeout)', () => {
    const { held } = splitFailuresByDisposition([
      f({ httpStatus: 503 }),
      f({ errorText: 'request timed out' }),
    ]);
    expect(held).toHaveLength(2);
  });

  it('shows proven customer-side failures (401)', () => {
    const { effective, held } = splitFailuresByDisposition([f({ httpStatus: 401 })]);
    expect(effective).toHaveLength(1);
    expect(held).toHaveLength(0);
  });

  it('splits a mixed batch correctly', () => {
    const { effective, held } = splitFailuresByDisposition([
      f({}), // compliance -> effective
      f({ httpStatus: 401 }), // customer -> effective
      f({ httpStatus: 404 }), // our-side -> held
      f({ errorText: 'fetch failed' }), // transient -> held
    ]);
    expect(effective).toHaveLength(2);
    expect(held).toHaveLength(2);
  });

  it('holds a customer-looking failure when the whole fleet is failing', () => {
    const { effective, held } = splitFailuresByDisposition(
      [f({ httpStatus: 403 })],
      { passing: 0, failing: 6 },
    );
    expect(effective).toHaveLength(0);
    expect(held).toHaveLength(1);
  });
});
