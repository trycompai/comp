// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ??
    'https://331f1c3d4b08e9352dd1a2621e1ae845@o4509214247813120.ingest.us.sentry.io/4511304630927360',

  // Only report from production. On Vercel, VERCEL_ENV is 'production' | 'preview'
  // | 'development'; on any non-production deployment (or if the var is missing)
  // Sentry stays disabled — a no-op, never an error — to avoid noise and quota burn.
  enabled: process.env.VERCEL_ENV === 'production',

  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  enableLogs: true,
});
