export type ModelMock = Record<string, jest.Mock>;

const MODEL_METHOD_DEFAULTS: Record<string, unknown> = {
  findMany: [],
  findUnique: null,
  findFirst: null,
  updateMany: { count: 0 },
  deleteMany: { count: 0 },
  count: 0,
};

function createModelMock(): ModelMock {
  const methods: ModelMock = {};
  return new Proxy(methods, {
    get: (target, prop) => {
      if (typeof prop !== 'string') return undefined;
      if (!target[prop]) {
        const hasDefault = Object.prototype.hasOwnProperty.call(
          MODEL_METHOD_DEFAULTS,
          prop,
        );
        target[prop] = jest
          .fn()
          .mockResolvedValue(hasDefault ? MODEL_METHOD_DEFAULTS[prop] : {});
      }
      return target[prop];
    },
  });
}

/**
 * Builds a `db`-shaped Proxy for tests: any model/method is auto-mocked on
 * first access with a harmless default (empty lists / zero counts) unless a
 * test overrides it. `$transaction` invokes its callback with the same
 * proxy as `tx`, so assertions against the returned object see calls made
 * inside a transaction too. Used from a `jest.mock('@db', ...)` factory via
 * `require`, since factories can't close over module-scope variables.
 */
export function createDbProxyMock(): Record<string, unknown> {
  const models: Record<string, ModelMock> = {};
  let dbProxy: Record<string, unknown>;
  const dbMock = {
    $transaction: jest.fn(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(dbProxy),
    ),
  };
  dbProxy = new Proxy(dbMock, {
    get: (target, prop) => {
      if (typeof prop !== 'string') return undefined;
      if (prop in target) return target[prop as keyof typeof target];
      if (!models[prop]) models[prop] = createModelMock();
      return models[prop];
    },
  });
  return dbProxy;
}
