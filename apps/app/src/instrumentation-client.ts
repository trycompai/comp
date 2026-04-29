// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { initBotId } from 'botid/client/core';
import * as Sentry from '@sentry/nextjs';

initBotId({
  protect: [
    { path: '/api/chat', method: 'POST' },
    {
      path: `${process.env.NEXT_PUBLIC_ENTERPRISE_API_URL}/api/tasks-automations/chat`,
      method: 'POST',
    },
    {
      path: `${process.env.NEXT_PUBLIC_ENTERPRISE_API_URL}/api/tasks-automations/errors`,
      method: 'POST',
    },
  ],
});

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ??
    'https://331f1c3d4b08e9352dd1a2621e1ae845@o4509214247813120.ingest.us.sentry.io/4511304630927360',

  integrations: [Sentry.replayIntegration()],

  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  enableLogs: true,

  // 10% of all sessions; 100% of sessions where an error occurs.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
