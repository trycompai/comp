/**
 * Stub for @db and @trycompai/db — returns a no-op mockDb.
 * The real mock handles are wired by jest.mock() in the test file.
 * This file is only here so the moduleNameMapper has something to resolve.
 */
export const db = {};
export const Prisma = {
  PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message: string, { code }: { code: string }) {
      super(message);
      this.code = code;
    }
  },
};
