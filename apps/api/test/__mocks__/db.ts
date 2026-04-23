/**
 * Stub for @db and @trycompai/db — returns a Proxy-based mockDb.
 * Any table / method access returns a jest.fn() so untouched entities
 * don't crash with "cannot read properties of undefined". Tests that need
 * specific return values still should override with their own jest.mock().
 */
function createTableMock() {
  return new Proxy(
    {},
    {
      get: () => jest.fn(),
    },
  );
}

export const db: Record<string, unknown> = new Proxy(
  {},
  {
    get: () => createTableMock(),
  },
);

export const Prisma = {
  PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message: string, { code }: { code: string }) {
      super(message);
      this.code = code;
    }
  },
};
