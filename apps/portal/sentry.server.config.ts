// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ??
    'https://331f1c3d4b08e9352dd1a2621e1ae845@o4509214247813120.ingest.us.sentry.io/4511304630927360',

  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Off in production: local variables in stack frames can expose request-scoped
  // data (DB rows, auth tokens, request bodies) to Sentry payloads.
  includeLocalVariables: process.env.NODE_ENV !== 'production',

  enableLogs: true,
});
