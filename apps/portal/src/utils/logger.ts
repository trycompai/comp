/**
 * Application logger.
 * Only logs in development to avoid leaking info in production.
 */
export const logger = (message: string, params?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(message, params);
  }
};
