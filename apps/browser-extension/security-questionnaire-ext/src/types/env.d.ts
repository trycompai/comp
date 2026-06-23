interface ImportMetaEnv {
  readonly WXT_GOOGLE_OAUTH_CLIENT_ID?: string;
  readonly WXT_PUBLIC_API_BASE_URL?: string;
  readonly WXT_PUBLIC_APP_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
