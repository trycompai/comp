function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export const extensionConfig = {
  apiBaseUrl: trimTrailingSlash(
    import.meta.env.WXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333',
  ),
  appBaseUrl: trimTrailingSlash(
    import.meta.env.WXT_PUBLIC_APP_BASE_URL ?? 'http://localhost:3000',
  ),
  googleSheetsApiEnabled: Boolean(import.meta.env.WXT_GOOGLE_OAUTH_CLIENT_ID),
};
