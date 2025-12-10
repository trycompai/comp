/**
 * Universal logger that works in both NestJS and Trigger.dev runtime environments
 *
 * In Trigger.dev tasks, we use console.log with structured output
 * In NestJS services, we use the NestJS Logger
 *
 * This allows shared lib files to be imported by both Trigger.dev tasks and NestJS services
 */

type LogPayload = Record<string, unknown> | undefined;

const formatMessage = (message: string, payload?: LogPayload): string => {
  if (!payload) {
    return message;
  }
  try {
    return `${message} ${JSON.stringify(payload)}`;
  } catch {
    return message;
  }
};

/**
 * Detect if we're running in Trigger.dev environment
 * Trigger.dev sets specific env vars when running tasks
 */
const isTriggerDevRuntime = (): boolean => {
  return !!(
    process.env.TRIGGER_RUN_ID ||
    process.env.TRIGGER_TASK_ID ||
    process.env.TRIGGER_WORKER_ID
  );
};

/**
 * Create a logger that works in both environments
 * - In Trigger.dev: uses console methods (which Trigger.dev intercepts and formats)
 * - In NestJS: uses NestJS Logger
 */
const createLogger = () => {
  // Check if running in Trigger.dev - use console logging
  if (isTriggerDevRuntime()) {
    return {
      info: (message: string, payload?: LogPayload): void => {
        console.log(`[VectorStore] ${formatMessage(message, payload)}`);
      },
      warn: (message: string, payload?: LogPayload): void => {
        console.warn(`[VectorStore] ${formatMessage(message, payload)}`);
      },
      error: (message: string, payload?: LogPayload): void => {
        console.error(`[VectorStore] ${formatMessage(message, payload)}`);
      },
    };
  }

  // In NestJS environment, try to use NestJS Logger
  // We import dynamically to avoid issues in Trigger.dev runtime
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Logger } = require('@nestjs/common');
    const baseLogger = new Logger('VectorStore');

    return {
      info: (message: string, payload?: LogPayload): void => {
        baseLogger.log(formatMessage(message, payload));
      },
      warn: (message: string, payload?: LogPayload): void => {
        baseLogger.warn(formatMessage(message, payload));
      },
      error: (message: string, payload?: LogPayload): void => {
        baseLogger.error(formatMessage(message, payload));
      },
    };
  } catch {
    // Fallback to console if NestJS is not available
    return {
      info: (message: string, payload?: LogPayload): void => {
        console.log(`[VectorStore] ${formatMessage(message, payload)}`);
      },
      warn: (message: string, payload?: LogPayload): void => {
        console.warn(`[VectorStore] ${formatMessage(message, payload)}`);
      },
      error: (message: string, payload?: LogPayload): void => {
        console.error(`[VectorStore] ${formatMessage(message, payload)}`);
      },
    };
  }
};

export const logger = createLogger();
