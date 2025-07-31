export const logger = {
  info: (message: string, params?: unknown) => {
    console.log(`[INFO] ${message}`, params || '');
  },
  warn: (message: string, params?: unknown) => {
    console.warn(`[WARN] ${message}`, params || '');
  },
  error: (message: string, params?: unknown) => {
    console.error(`[ERROR] ${message}`, params || '');
  },
};
