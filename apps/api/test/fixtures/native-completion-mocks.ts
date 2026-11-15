import { db, type Prisma } from '@db';
import type { PrismaClient } from '@prisma/client';

const mocks = db as unknown as {
  task: { findUnique: jest.Mock; findMany: jest.Mock; updateMany: jest.Mock };
  integrationConnection: { findMany: jest.Mock };
  integrationCheckRun: { findFirst: jest.Mock };
  integrationCheckResult: { count: jest.Mock; findMany: jest.Mock };
  findingException: { findMany: jest.Mock };
  dynamicIntegration: { findUnique: jest.Mock };
  $transaction: jest.Mock;
};

export function bindCompletionDatabase({
  client,
  beforeWrite,
}: {
  client: PrismaClient;
  beforeWrite: () => Promise<unknown>;
}) {
  function wrap(target: Prisma.TransactionClient) {
    return new Proxy(target, {
      get(transaction, property) {
        if (property === 'task') {
          return new Proxy(transaction.task, {
            get(model, key) {
              if (key === 'updateMany') {
                return async (args: Prisma.TaskUpdateManyArgs) => {
                  await beforeWrite();
                  return model.updateMany(args);
                };
              }
              const value: unknown = Reflect.get(model, key);
              return typeof value === 'function' ? value.bind(model) : value;
            },
          });
        }
        const value: unknown = Reflect.get(transaction, property);
        return typeof value === 'function' ? value.bind(transaction) : value;
      },
    });
  }
  const wrapped = wrap(client);
  mocks.task.findUnique.mockImplementation((args: Prisma.TaskFindUniqueArgs) =>
    client.task.findUnique(args),
  );
  mocks.task.findMany.mockImplementation((args: Prisma.TaskFindManyArgs) =>
    client.task.findMany(args),
  );
  mocks.task.updateMany.mockImplementation((args: Prisma.TaskUpdateManyArgs) =>
    wrapped.task.updateMany(args),
  );
  mocks.integrationConnection.findMany.mockImplementation(
    (args: Prisma.IntegrationConnectionFindManyArgs) =>
      client.integrationConnection.findMany(args),
  );
  mocks.integrationCheckRun.findFirst.mockImplementation(
    (args: Prisma.IntegrationCheckRunFindFirstArgs) =>
      client.integrationCheckRun.findFirst(args),
  );
  mocks.integrationCheckResult.count.mockImplementation(
    (args: Prisma.IntegrationCheckResultCountArgs) =>
      client.integrationCheckResult.count(args),
  );
  mocks.integrationCheckResult.findMany.mockImplementation(
    (args: Prisma.IntegrationCheckResultFindManyArgs) =>
      client.integrationCheckResult.findMany(args),
  );
  mocks.findingException.findMany.mockImplementation(
    (args: Prisma.FindingExceptionFindManyArgs) =>
      client.findingException.findMany(args),
  );
  mocks.dynamicIntegration.findUnique.mockImplementation(
    (args: Prisma.DynamicIntegrationFindUniqueArgs) =>
      client.dynamicIntegration.findUnique(args),
  );
  mocks.$transaction.mockImplementation(
    (callback: (transaction: Prisma.TransactionClient) => Promise<unknown>) =>
      client.$transaction((transaction) => callback(wrap(transaction))),
  );
}
