import { Logger } from '@nestjs/common';

type LogPayload = Record<string, unknown> | undefined;

const baseLogger = new Logger('VectorStore');

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

export const logger = {
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
