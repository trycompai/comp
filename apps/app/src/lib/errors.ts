export class AppError extends Error {
  constructor(
    public code: string,
    message?: string,
    public status = 400,
  ) {
    super(message || code);
    this.name = 'AppError';
  }
}

export const appErrors = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
} as const;
