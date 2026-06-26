import { classifyCheckFailure } from './check-failure-classifier';

describe('classifyCheckFailure', () => {
  it('treats a runtime exception as our-side', () => {
    const r = classifyCheckFailure({ threw: true, errorText: 'x is not a function' });
    expect(r.class).toBe('our_side');
    expect(r.customerActionable).toBe(false);
  });

  it('treats a failure with no execution signal as a real compliance finding', () => {
    const r = classifyCheckFailure({});
    expect(r.class).toBe('compliance');
  });

  it.each([500, 502, 503, 408, 429])('treats HTTP %i as transient', (status) => {
    expect(classifyCheckFailure({ httpStatus: status }).class).toBe('transient');
  });

  it.each([
    'request timed out',
    'fetch failed',
    'ECONNRESET',
    'service unavailable',
  ])('treats network text "%s" as transient', (errorText) => {
    expect(classifyCheckFailure({ errorText }).class).toBe('transient');
  });

  it.each([401, 403])('treats HTTP %i as customer-side + actionable', (status) => {
    const r = classifyCheckFailure({ httpStatus: status });
    expect(r.class).toBe('customer_side');
    expect(r.customerActionable).toBe(true);
  });

  it.each([
    'Invalid API key',
    'token has expired',
    'your key was revoked',
    'organization is not entitled for api access',
    'please upgrade your plan',
  ])('treats creds/plan text "%s" as customer-side', (errorText) => {
    expect(classifyCheckFailure({ errorText }).class).toBe('customer_side');
  });

  it.each([
    'not allowed to perform actions outside the project this key is scoped to',
    'org_id is required',
    'not allowed for organization API keys',
    'this endpoint is deprecated',
    'res.text is not a function',
  ])('treats our-bug text "%s" as our-side', (errorText) => {
    expect(classifyCheckFailure({ errorText }).class).toBe('our_side');
  });

  it.each([404, 400, 405, 422])('treats HTTP %i as our-side', (status) => {
    expect(classifyCheckFailure({ httpStatus: status }).class).toBe('our_side');
  });

  it('never blames the customer for an ambiguous execution failure (defaults our-side)', () => {
    const r = classifyCheckFailure({ errorText: 'something weird happened' });
    expect(r.class).toBe('our_side');
    expect(r.customerActionable).toBe(false);
  });

  it('treats a customer-looking error as our-side when the whole fleet is failing', () => {
    const r = classifyCheckFailure({
      httpStatus: 403,
      fleet: { passing: 0, failing: 5 },
    });
    expect(r.class).toBe('our_side');
  });

  it('keeps a 401 as customer-side when other connections are passing', () => {
    const r = classifyCheckFailure({
      httpStatus: 401,
      fleet: { passing: 9, failing: 1 },
    });
    expect(r.class).toBe('customer_side');
    expect(r.customerActionable).toBe(true);
  });
});
