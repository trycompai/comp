export class CliError extends Error {
  constructor(
    message: string,
    public exitCode: number = 1,
  ) {
    super(message);
    this.name = 'CliError';
  }
}

export class AuthRequiredError extends CliError {
  constructor() {
    super('Not authenticated. Run `comp-framework auth login` first.');
    this.name = 'AuthRequiredError';
  }
}

export class ApiError extends CliError {
  constructor(
    public status: number,
    message: string,
  ) {
    super(`API error (${status}): ${message}`);
    this.name = 'ApiError';
  }
}

export function handleError(error: unknown, json: boolean): never {
  const message =
    error instanceof CliError
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);
  const exitCode = error instanceof CliError ? error.exitCode : 1;

  if (json) {
    console.log(JSON.stringify({ success: false, error: message }));
  } else {
    console.error(`Error: ${message}`);
  }
  process.exit(exitCode);
}
